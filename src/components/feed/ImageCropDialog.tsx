import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Load image
  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
    return () => { imgRef.current = null; setImgLoaded(false); };
  }, [open, imageSrc]);

  // Measure container
  useEffect(() => {
    if (!containerRef.current || !open) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [open]);

  // Compute display dimensions
  const getCropArea = useCallback(() => {
    const { w, h } = containerSize;
    if (!w || !h) return { cropW: 0, cropH: 0, cropX: 0, cropY: 0 };
    let cropW: number, cropH: number;
    if (w / h > ASPECT_RATIO) {
      cropH = h;
      cropW = h * ASPECT_RATIO;
    } else {
      cropW = w;
      cropH = w / ASPECT_RATIO;
    }
    return { cropW, cropH, cropX: (w - cropW) / 2, cropY: (h - cropH) / 2 };
  }, [containerSize]);

  // Draw preview
  useEffect(() => {
    if (!canvasRef.current || !imgRef.current || !imgLoaded) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = containerSize;
    if (!w || !h) return;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(2, 2);

    const img = imgRef.current;
    const { cropW, cropH, cropX, cropY } = getCropArea();

    // Compute scaled image to fill the crop area at zoom=1
    const imgAspect = img.width / img.height;
    let drawW: number, drawH: number;
    if (imgAspect > ASPECT_RATIO) {
      drawH = cropH * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = cropW * zoom;
      drawH = drawW / imgAspect;
    }

    const drawX = cropX + (cropW - drawW) / 2 + offset.x;
    const drawY = cropY + (cropH - drawH) / 2 + offset.y;

    // Clear & draw
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropW, cropH);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Dim outside crop area
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, w, cropY);
    ctx.fillRect(0, cropY + cropH, w, h - cropY - cropH);
    ctx.fillRect(0, cropY, cropX, cropH);
    ctx.fillRect(cropX + cropW, cropY, w - cropX - cropW, cropH);

    // Grid lines (rule of thirds)
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cropX + (cropW * i) / 3, cropY);
      ctx.lineTo(cropX + (cropW * i) / 3, cropY + cropH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cropX, cropY + (cropH * i) / 3);
      ctx.lineTo(cropX + cropW, cropY + (cropH * i) / 3);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cropX, cropY, cropW, cropH);
  }, [imgLoaded, zoom, offset, containerSize, getCropArea]);

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

  const handleConfirm = async () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const { cropW, cropH, cropX, cropY } = getCropArea();

    // Compute source crop rectangle on original image
    const imgAspect = img.width / img.height;
    let drawW: number, drawH: number;
    if (imgAspect > ASPECT_RATIO) {
      drawH = cropH * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = cropW * zoom;
      drawH = drawW / imgAspect;
    }

    const drawX = cropX + (cropW - drawW) / 2 + offset.x;
    const drawY = cropY + (cropH - drawH) / 2 + offset.y;

    // Map crop area back to image coordinates
    const scaleX = img.width / drawW;
    const scaleY = img.height / drawH;
    const srcX = (cropX - drawX) * scaleX;
    const srcY = (cropY - drawY) * scaleY;
    const srcW = cropW * scaleX;
    const srcH = cropH * scaleY;

    // Draw final output
    const outCanvas = document.createElement("canvas");
    outCanvas.width = TARGET_WIDTH;
    outCanvas.height = TARGET_HEIGHT;
    const ctx = outCanvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img,
      Math.max(0, srcX), Math.max(0, srcY),
      Math.min(srcW, img.width), Math.min(srcH, img.height),
      0, 0, TARGET_WIDTH, TARGET_HEIGHT
    );

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
          className="relative w-full bg-black touch-none select-none"
          style={{ aspectRatio: "4/5", maxHeight: "60vh" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas ref={canvasRef} className="w-full h-full" />
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
