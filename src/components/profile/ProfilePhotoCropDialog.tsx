import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Check, RotateCcw } from "lucide-react";

interface ProfilePhotoCropDialogProps {
  open: boolean;
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const OUTPUT_SIZE = 512;
const MIN_RADIUS = 20; // smallest circle (% of viewBox)
const MAX_RADIUS = 46; // largest circle
const DEFAULT_RADIUS = 38;

export default function ProfilePhotoCropDialog({ open, imageSrc, onConfirm, onCancel }: ProfilePhotoCropDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [circleRadius, setCircleRadius] = useState(DEFAULT_RADIUS);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!open) {
      setImgLoaded(false);
      setCircleRadius(DEFAULT_RADIUS);
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

  // Image covers the container at natural aspect ratio, no scaling
  const getImageStyle = useCallback((): React.CSSProperties => {
    if (!imgLoaded || !imgDimensions.w) return {};
    const imgAspect = imgDimensions.w / imgDimensions.h;

    let baseWidth: number, baseHeight: number;
    if (imgAspect > 1) {
      baseHeight = 100;
      baseWidth = 100 * imgAspect;
    } else {
      baseWidth = 100;
      baseHeight = 100 / imgAspect;
    }

    return {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      width: `${baseWidth}%`,
      height: `${baseHeight}%`,
      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
      pointerEvents: "none" as const,
      userSelect: "none" as const,
    };
  }, [imgLoaded, imgDimensions, offset]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
    const containerSize = rect.width;

    // Circle center is always at center of container
    // Circle radius as fraction of container
    const circleFraction = circleRadius / 50; // 50 = half of viewBox 100
    const circlePixelRadius = (containerSize / 2) * circleFraction;
    const circleDiameter = circlePixelRadius * 2;

    // Image dimensions in the container
    const imgAspect = img.width / img.height;
    let drawW: number, drawH: number;
    if (imgAspect > 1) {
      drawH = containerSize;
      drawW = containerSize * imgAspect;
    } else {
      drawW = containerSize;
      drawH = containerSize / imgAspect;
    }

    // Image top-left position in container coords
    const imgX = (containerSize - drawW) / 2 + offset.x;
    const imgY = (containerSize - drawH) / 2 + offset.y;

    // Circle top-left in container coords
    const circleLeft = containerSize / 2 - circlePixelRadius;
    const circleTop = containerSize / 2 - circlePixelRadius;

    // Map circle bounds to source image coords
    const scaleX = img.width / drawW;
    const scaleY = img.height / drawH;
    const srcX = Math.max(0, (circleLeft - imgX) * scaleX);
    const srcY = Math.max(0, (circleTop - imgY) * scaleY);
    const srcW = Math.min(circleDiameter * scaleX, img.width - srcX);
    const srcH = Math.min(circleDiameter * scaleY, img.height - srcY);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const ctx = outCanvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Circular clip
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
    setCircleRadius(DEFAULT_RADIUS);
    setOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setCircleRadius(prev => Math.min(MAX_RADIUS, prev + 3));
  const handleZoomOut = () => setCircleRadius(prev => Math.max(MIN_RADIUS, prev - 3));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Adjust Profile Photo</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Drag to reposition, use buttons to resize crop
          </DialogDescription>
        </DialogHeader>

        <div className="px-4">
          <div
            ref={containerRef}
            className="relative w-full bg-black select-none overflow-hidden rounded-lg"
            style={{ aspectRatio: "1/1", touchAction: "none" }}
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

            {/* Circular mask overlay — radius changes with zoom */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <mask id="profileCropCircleMask">
                  <rect width="100" height="100" fill="white" />
                  <circle cx="50" cy="50" r={circleRadius} fill="black" />
                </mask>
              </defs>
              <rect width="100" height="100" fill="rgba(0,0,0,0.55)" mask="url(#profileCropCircleMask)" />
              <circle cx="50" cy="50" r={circleRadius} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
            </svg>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={handleZoomOut}
              disabled={circleRadius <= MIN_RADIUS}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground w-14 text-center">
              {Math.round((circleRadius / MAX_RADIUS) * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={handleZoomIn}
              disabled={circleRadius >= MAX_RADIUS}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
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
