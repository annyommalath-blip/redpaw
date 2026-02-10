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
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setImgLoaded(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      imgRef.current = null;
    }
  }, [open]);

  // Load the source image for final crop output
  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new Image();
    if (!imageSrc.startsWith("blob:") && !imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      imgRef.current = img;
      setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  // Compute CSS for the image to cover the 4:5 container
  const getImageStyle = useCallback((): React.CSSProperties => {
    if (!imgLoaded || !imgDimensions.w) return {};
    const imgAspect = imgDimensions.w / imgDimensions.h;

    // "cover" logic: if image is wider than 4:5, fit height; else fit width
    let width: string, height: string;
    if (imgAspect > ASPECT_RATIO) {
      height = `${zoom * 100}%`;
      width = "auto";
    } else {
      width = `${zoom * 100}%`;
      height = "auto";
    }

    return {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      width,
      height,
      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
      objectFit: "cover" as const,
      pointerEvents: "none" as const,
      userSelect: "none" as const,
    };
  }, [imgLoaded, imgDimensions, zoom, offset]);

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

        {/* Crop viewport */}
        <div
          ref={containerRef}
          className="relative w-full bg-black touch-none select-none overflow-hidden"
          style={{ aspectRatio: "4/5" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              style={getImageStyle()}
            />
          )}

          {/* Grid overlay (rule of thirds) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 300 375">
            <line x1="100" y1="0" x2="100" y2="375" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
            <line x1="200" y1="0" x2="200" y2="375" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
            <line x1="0" y1="125" x2="300" y2="125" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
            <line x1="0" y1="250" x2="300" y2="250" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
            <rect x="0.5" y="0.5" width="299" height="374" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          </svg>
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
