import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, Check, RotateCcw } from "lucide-react";

interface ProfilePhotoCropDialogProps {
  open: boolean;
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const OUTPUT_SIZE = 512; // 512x512 output

export default function ProfilePhotoCropDialog({ open, imageSrc, onConfirm, onCancel }: ProfilePhotoCropDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!open) {
      setImgLoaded(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      imgRef.current = null;
    }
  }, [open]);

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

  const getImageStyle = useCallback((): React.CSSProperties => {
    if (!imgLoaded || !imgDimensions.w) return {};
    const imgAspect = imgDimensions.w / imgDimensions.h;

    // Cover logic for 1:1 container
    let width: string, height: string;
    if (imgAspect > 1) {
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
    const size = rect.width; // square container

    const imgAspect = img.width / img.height;
    let drawW: number, drawH: number;
    if (imgAspect > 1) {
      drawH = size * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = size * zoom;
      drawH = drawW / imgAspect;
    }

    const drawX = (size - drawW) / 2 + offset.x;
    const drawY = (size - drawH) / 2 + offset.y;

    const scaleX = img.width / drawW;
    const scaleY = img.height / drawH;
    const srcX = Math.max(0, -drawX * scaleX);
    const srcY = Math.max(0, -drawY * scaleY);
    const srcW = Math.min(size * scaleX, img.width - srcX);
    const srcH = Math.min(size * scaleY, img.height - srcY);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const ctx = outCanvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw circular clip
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    outCanvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/png", 1);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Adjust Profile Photo</DialogTitle>
        </DialogHeader>

        {/* Square crop viewport with circle overlay */}
        <div className="px-4">
          <div
            ref={containerRef}
            className="relative w-full bg-black touch-none select-none overflow-hidden rounded-lg"
            style={{ aspectRatio: "1/1" }}
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

            {/* Circular mask overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <mask id="circleMask">
                  <rect width="100" height="100" fill="white" />
                  <circle cx="50" cy="50" r="46" fill="black" />
                </mask>
              </defs>
              <rect width="100" height="100" fill="rgba(0,0,0,0.55)" mask="url(#circleMask)" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
            </svg>
          </div>
        </div>

        <div className="px-4 py-3">
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
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
