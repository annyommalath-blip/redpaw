import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Send, ArrowLeft, Loader2, Bot, Sparkles, ImagePlus, X, Mic, MicOff, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { isHeicFile } from "@/lib/imageUtils";
import { SearchRadiusMap } from "@/components/chat/SearchRadiusMap";
import { useConversation } from "@/hooks/useConversation";

// Flexible parser for map JSON - handles various formats the AI might output
function tryParseMapData(content: string, className?: string): React.ReactElement | null {
  const isMapHint = className === "language-map-data" || className === "language-json";
  const looksLikeMapJson = content.includes('"center"') || content.includes('"zones"') || content.includes('"search_radius_map"');
  if (!isMapHint && !looksLikeMapJson) return null;
  try {
    const data = JSON.parse(content);
    if (data.center && data.inner_radius_km != null) {
      return <SearchRadiusMap center={data.center} innerRadiusKm={data.inner_radius_km} outerRadiusKm={data.outer_radius_km} label={data.label || "Last seen"} />;
    }
    if (data.center && Array.isArray(data.zones) && data.zones.length >= 2) {
      const sorted = [...data.zones].sort((a: any, b: any) => (a.radius_miles || a.radius_km || 0) - (b.radius_miles || b.radius_km || 0));
      const inner = sorted[0].radius_km || (sorted[0].radius_miles * 1.60934);
      const outer = sorted[sorted.length - 1].radius_km || (sorted[sorted.length - 1].radius_miles * 1.60934);
      return <SearchRadiusMap center={data.center} innerRadiusKm={inner} outerRadiusKm={outer} label={data.label || "Last seen"} />;
    }
  } catch { /* not valid JSON */ }
  return null;
}

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | MessageContent[];
  timestamp: Date;
}

const AI_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
const MAX_IMAGES = 3;
const STORAGE_KEY = "redpaw_ai_chat";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function loadMessages(): Message[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { ts, msgs } = JSON.parse(raw);
    if (Date.now() - ts > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return msgs.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), msgs }));
  } catch { /* quota exceeded – ignore */ }
}

function getTextContent(content: string | MessageContent[]): string {
  if (typeof content === "string") return content;
  return content.filter(c => c.type === "text").map(c => c.text).join("") || "";
}

function getImageUrls(content: string | MessageContent[]): string[] {
  if (typeof content === "string") return [];
  return content.filter(c => c.type === "image_url").map(c => c.image_url!.url);
}

async function processFileToBase64(file: File): Promise<string> {
  let blob: Blob = file;

  // Convert HEIC/HEIF to JPEG first
  if (isHeicFile(file)) {
    const heic2anyModule = await import("heic2any");
    const heic2any = heic2anyModule.default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    blob = Array.isArray(result) ? result[0] : result;
  }

  // Resize large images via canvas to keep base64 manageable
  const img = await createImageBitmap(blob);
  const MAX_DIM = 1200;
  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    if (width > height) {
      height = Math.round((height / width) * MAX_DIM);
      width = MAX_DIM;
    } else {
      width = Math.round((width / height) * MAX_DIM);
      height = MAX_DIM;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("Canvas toBlob failed"));
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(b);
      },
      "image/jpeg",
      0.85
    );
  });
}

export default function AIChatPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    content: "Hi there! 🐕 I'm RedPaw AI. I can help you with:\n\n• **Your dogs & health records** - vaccines, medications, expiration alerts\n• **Care requests** - sitter jobs, scheduling\n• **Lost & Found** - alerts, sightings\n• **📸 Photo Match** - Upload a photo of your dog and I'll search Found Dog posts for matches!\n• **General pet advice**\n\nTry asking me: \"When is my dog's rabies vaccine due?\" or upload a photo and say \"Help me find my dog\"",
    timestamp: new Date(),
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = loadMessages();
    return saved && saved.length > 0 ? saved : [welcomeMessage];
  });
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const stopMicStream = () => {
    if (!micStreamRef.current) return;
    micStreamRef.current.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
  };

  // Web Speech API voice-to-text
  const toggleListening = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ variant: "destructive", title: "Not supported", description: "Speech recognition is not supported in this browser." });
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      stopMicStream();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ variant: "destructive", title: "Voice Input Error", description: "Microphone APIs are unavailable in this browser." });
      return;
    }

    try {
      // Must run in this tap handler so Safari keeps user-gesture context
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error: any) {
      const name = error?.name || "";
      const permissionMsg = (name === "NotAllowedError" || name === "PermissionDeniedError")
        ? "Microphone access denied. Please allow microphone permission in Safari settings."
        : "Unable to access microphone. Please check your device/browser settings.";
      toast({ variant: "destructive", title: "Voice Input Error", description: permissionMsg });
      return;
    }

    const recognition = new SpeechRecognition();
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    recognition.continuous = !isIOS;
    recognition.interimResults = true;

    const languageMap: Record<string, string> = {
      en: "en-US",
      lo: "lo-LA",
      th: "th-TH",
      "zh-Hans": "zh-CN",
    };
    recognition.lang = languageMap[i18n.language] || navigator.language || "en-US";
    recognitionRef.current = recognition;

    // Store the message text that existed before we started listening
    const baseTextRef = newMessage.trim();

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalParts = "";
      let interimParts = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalParts += transcript;
        } else {
          interimParts += transcript;
        }
      }
      const spoken = (finalParts + interimParts).trim();
      setNewMessage(baseTextRef ? `${baseTextRef} ${spoken}` : spoken);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      stopMicStream();
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      recognitionRef.current = null;
      stopMicStream();
      const errorMap: Record<string, string> = {
        "not-allowed": "Microphone access denied. Please allow microphone permission in your browser settings.",
        "service-not-allowed": "Speech recognition unavailable on this device. Use your keyboard's built-in dictation (🎙️ on the keyboard) instead.",
        "audio-capture": "No microphone was detected. Please check your audio input device.",
        "no-speech": "No speech detected. Please try again.",
        "network": "Network error. Please check your connection.",
        "aborted": "Speech recognition was aborted.",
      };
      const msg = errorMap[event?.error] || `Speech recognition error: ${event?.error || "unknown"}`;
      console.error("Speech recognition error", { error: event?.error, userAgent: navigator.userAgent });
      toast({ variant: "destructive", title: "Voice Input Error", description: msg });
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
      stopMicStream();
      toast({
        variant: "destructive",
        title: "Voice Input Error",
        description: "Unable to start speech recognition. Please try again.",
      });
    }
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      stopMicStream();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Persist messages to localStorage (excluding base64 images to save space)
  useEffect(() => {
    const toSave = messages.map(m => ({
      ...m,
      content: typeof m.content === "string" ? m.content
        : (m.content as MessageContent[]).filter(c => c.type === "text"),
    }));
    saveMessages(toSave);
  }, [messages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_IMAGES - attachedImages.length;
    if (remaining <= 0) {
      toast({ variant: "destructive", title: "Max images", description: `You can attach up to ${MAX_IMAGES} images.` });
      return;
    }

    const toProcess = Array.from(files).slice(0, remaining);
    try {
      const base64Images: string[] = await Promise.all(toProcess.map(processFileToBase64));
      setAttachedImages(prev => [...prev, ...base64Images]);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load image(s)." });
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const streamChat = async (userMessages: any[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const resp = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken
          ? `Bearer ${accessToken}`
          : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${resp.status}`);
    }
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
          }
        } catch { /* ignore */ }
      }
    }

    // Avoid leaving an empty placeholder bubble ("...") when stream produced no text
    if (!assistantContent.trim()) {
      setMessages(prev => prev.filter(m => m.id !== assistantId));
      throw new Error("No response generated. Please try again.");
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && attachedImages.length === 0) || isLoading) return;

    // Build multimodal content if images are attached
    let userContent: string | MessageContent[];
    if (attachedImages.length > 0) {
      const parts: MessageContent[] = [];
      if (newMessage.trim()) {
        parts.push({ type: "text", text: newMessage.trim() });
      } else {
        parts.push({ type: "text", text: "Help me find this dog. Search found dog posts for matches." });
      }
      for (const imgUrl of attachedImages) {
        parts.push({ type: "image_url", image_url: { url: imgUrl } });
      }
      userContent = parts;
    } else {
      userContent = newMessage.trim();
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setAttachedImages([]);
    setIsLoading(true);

    try {
      // Build API messages: sliding window of last 20 messages + strip images from older ones
      const MAX_HISTORY = 20;
      const IMAGE_KEEP_LAST = 2; // only keep images in the last 2 messages

      const allMessages = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));
      allMessages.push({ role: "user", content: userContent });

      // Take only the last MAX_HISTORY messages
      const trimmed = allMessages.slice(-MAX_HISTORY);

      // Strip base64 image data from older messages to save tokens
      const apiMessages = trimmed.map((m, idx) => {
        const isRecent = idx >= trimmed.length - IMAGE_KEEP_LAST;
        if (isRecent || typeof m.content === "string") return m;
        // For older messages with image arrays, keep only text parts
        if (Array.isArray(m.content)) {
          const textOnly = (m.content as any[])
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("\n");
          return { role: m.role, content: textOnly || "[image sent]" };
        }
        return m;
      });

      await streamChat(apiMessages);
    } catch (error) {
      console.error("AI chat error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
      });
      setMessages(prev => prev.filter(m => m.content !== ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const normalizeAppLink = (href: string): string => {
    // Fix common AI-generated wrong routes
    return href
      .replace(/^\/found\/(?!dog)/, "/found-dog/")
      .replace(/^\/lost\//, "/lost-alert/")
      .replace(/^\/care\//, "/care-request/");
  };

  const renderLink = ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (href?.startsWith("/")) {
      return <Link to={normalizeAppLink(href)} className="text-primary underline hover:text-primary/80">{children}</Link>;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>;
  };

  const renderImage = ({ src, alt }: { src?: string; alt?: string }) => {
    if (!src) return null;
    return (
      <img
        src={src}
        alt={alt || ""}
        className="rounded-lg max-w-full max-h-48 object-cover my-2 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => window.open(src, "_blank")}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/messages")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground flex items-center gap-2">
              RedPaw AI
              <Sparkles className="h-4 w-4 text-primary" />
            </h1>
            <p className="text-xs text-muted-foreground">
              {user ? t("messages.aiPersonalAssistant") : t("messages.aiGeneralHelp")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setMessages([welcomeMessage]);
              toast({ title: "Chat cleared" });
            }}
            title="Clear chat history"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Auth reminder */}
      {!user && (
        <div className="bg-muted/50 border-b border-border px-4 py-2">
          <p className="text-xs text-muted-foreground text-center">
            <Link to="/auth" className="text-primary underline">{t("auth.signIn")}</Link> {t("messages.signInForPersonalized")}
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const text = getTextContent(message.content);
          const images = getImageUrls(message.content);

          return (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}>
                {/* User-attached images */}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {images.map((url, i) => (
                      <img key={i} src={url} alt="Attached" className="rounded-lg max-h-32 object-cover" />
                    ))}
                  </div>
                )}

                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      urlTransform={(url) => url}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        a: renderLink,
                        img: renderImage,
                        code: ({ className, children }) => {
                          const content = String(children).replace(/\n$/, "");
                          const mapComponent = tryParseMapData(content, className);
                          if (mapComponent) return mapComponent;
                          return (
                            <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>
                          );
                        },
                        pre: ({ children }) => {
                          const child = children as any;
                          const childContent = String(child?.props?.children || "").replace(/\n$/, "");
                          const mapComponent = tryParseMapData(childContent, child?.props?.className);
                          if (mapComponent) return mapComponent;
                          return <pre className="overflow-x-auto">{children}</pre>;
                        },
                      }}
                    >
                      {text || "..."}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p>{text}</p>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <span className="h-[7px] w-[7px] rounded-full bg-muted-foreground/70 animate-[typing-dot_1.4s_ease-in-out_infinite]" />
              <span className="h-[7px] w-[7px] rounded-full bg-muted-foreground/70 animate-[typing-dot_1.4s_ease-in-out_0.2s_infinite]" />
              <span className="h-[7px] w-[7px] rounded-full bg-muted-foreground/70 animate-[typing-dot_1.4s_ease-in-out_0.4s_infinite]" />
            </div>
          </div>
        )}
      </div>

      {/* Attached images preview */}
      {attachedImages.length > 0 && (
        <div className="border-t border-border bg-card px-4 py-2">
          <div className="flex gap-2 overflow-x-auto">
            {attachedImages.map((img, i) => (
              <div key={i} className="relative shrink-0">
                <img src={img} alt="Attached" className="h-16 w-16 rounded-lg object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {attachedImages.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors shrink-0"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card p-4 safe-area-bottom">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || attachedImages.length >= MAX_IMAGES}
            className="shrink-0"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          <Input
            placeholder={user ? t("messages.askAboutYourDogs") : t("messages.askAnythingAboutDogs")}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            variant={isListening ? "destructive" : "ghost"}
            size="icon"
            onClick={toggleListening}
            disabled={isLoading}
            className="shrink-0"
          >
            {isListening ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button onClick={handleSend} disabled={(!newMessage.trim() && attachedImages.length === 0) || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
