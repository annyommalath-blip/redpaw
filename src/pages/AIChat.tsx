import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Send, ArrowLeft, Loader2, Bot, Sparkles, ImagePlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

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

function getTextContent(content: string | MessageContent[]): string {
  if (typeof content === "string") return content;
  return content.filter(c => c.type === "text").map(c => c.text).join("") || "";
}

function getImageUrls(content: string | MessageContent[]): string[] {
  if (typeof content === "string") return [];
  return content.filter(c => c.type === "image_url").map(c => c.image_url!.url);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AIChatPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi there! 🐕 I'm RedPaw AI. I can help you with:\n\n• **Your dogs & health records** - vaccines, medications, expiration alerts\n• **Care requests** - sitter jobs, scheduling\n• **Lost & Found** - alerts, sightings\n• **📸 Photo Match** - Upload a photo of your dog and I'll search Found Dog posts for matches!\n• **General pet advice**\n\nTry asking me: \"When is my dog's rabies vaccine due?\" or upload a photo and say \"Help me find my dog\"",
      timestamp: new Date(),
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
      const base64Images = await Promise.all(toProcess.map(fileToBase64));
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
      // Build API messages (exclude welcome)
      const apiMessages = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }))
        .concat({ role: "user", content: userContent });

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

  const renderLink = ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (href?.startsWith("/")) {
      return <Link to={href} className="text-primary underline hover:text-primary/80">{children}</Link>;
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
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        a: renderLink,
                        img: renderImage,
                        code: ({ children }) => (
                          <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>
                        ),
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
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
            accept="image/*"
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
          <Button onClick={handleSend} disabled={(!newMessage.trim() && attachedImages.length === 0) || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
