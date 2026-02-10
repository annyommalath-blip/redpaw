import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, Check, RotateCcw } from "lucide-react";

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1350;
const ASPECT_RATIO = TARGET_WIDTH / TARGET_HEIGHT; // 0.8 = 4:5

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropDialog({ open, imageSrc, onConfirm, onCancel }: ImageCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) {
      setReady(false);
      imgRef.current = null;
      return;
    }
    if (!imageSrc) return;

    const img = new Image();
    // Don't set crossOrigin for blob/data URLs
    if (!imageSrc.startsWith("blob:") && !imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      imgRef.current = img;
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setReady(true);
    };
    img.onerror = () => {
      console.error("[ImageCropDialog] Failed to load image:", imageSrc.slice(0, 100));
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  // Draw canvas whenever state changes
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imgRef.current;
    if (!canvas || !container || !img || !ready) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Crop area fills the container (it's already 4:5 aspect)
    const cropW = w;
    const cropH = h;
    const cropX = 0;
    const cropY = 0;

    // Scale image to cover the crop area
    const imgAspect = img.width / img.height;
    let drawW: number, drawH: number;
    if (imgAspect > ASPECT_RATIO) {
      // Image is wider: fit height, overflow width
      drawH = cropH * zoom;
      drawW = drawH * imgAspect;
    } else {
      // Image is taller: fit width, overflow height
      drawW = cropW * zoom;
      drawH = drawW / imgAspect;
    }

    const drawX = cropX + (cropW - drawW) / 2 + offset.x;
    const drawY = cropY + (cropH - drawH) / 2 + offset.y;

    // Clear & draw image
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Grid lines (rule of thirds)
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo((cropW * i) / 3, 0);
      ctx.lineTo((cropW * i) / 3, cropH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (cropH * i) / 3);
      ctx.lineTo(cropW, (cropH * i) / 3);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }, [ready, zoom, offset]);

  // Redraw on state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Also redraw after a short delay to catch layout settling
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(draw, 50);
    return () => clearTimeout(timer);
  }, [ready, draw]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = () => setDragging(false);

  const handleConfirm = () => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!img || !container) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const imgAspect = img.width / img.height;
    let drawW: number, drawH: number;
    if (imgAspect > ASPECT_RATIO) {
      drawH = h * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = w * zoom;
      drawH = drawW / imgAspect;
    }

    const drawX = (w - drawW) / 2 + offset.x;
    const drawY = (h - drawH) / 2 + offset.y;

    // Map visible area back to image coordinates
    const scaleX = img.width / drawW;
    const scaleY = img.height / drawH;
    const srcX = Math.max(0, -drawX * scaleX);
    const srcY = Math.max(0, -drawY * scaleY);
    const srcW = Math.min(w * scaleX, img.width - srcX);
    const srcH = Math.min(h * scaleY, img.height - srcY);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = TARGET_WIDTH;
    outCanvas.height = TARGET_HEIGHT;
    const ctx = outCanvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    outCanvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/jpeg", 0.92);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Crop Photo (4:5)</DialogTitle>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative w-full bg-black touch-none select-none overflow-hidden"
          style={{ aspectRatio: "4/5" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <DialogFooter className="p-4 pt-0 flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="rounded-xl gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl">
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} className="rounded-xl gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
