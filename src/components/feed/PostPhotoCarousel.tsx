import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

interface PostPhotoCarouselProps {
  photos: string[];
  className?: string;
}

export default function PostPhotoCarousel({ photos, className }: PostPhotoCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [activeIndex, setActiveIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  if (photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <div className={cn("w-full bg-muted", className)}>
        <img
          src={photos[0]}
          alt="Post"
          className="w-full object-cover"
          style={{ aspectRatio: "4/5" }}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full bg-muted", className)}>
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {photos.map((url, i) => (
            <div key={i} className="min-w-0 shrink-0 grow-0 basis-full">
              <img
                src={url}
                alt={`Post photo ${i + 1}`}
                className="w-full object-cover"
                style={{ aspectRatio: "4/5" }}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-[5px]">
        {photos.map((_, i) => (
          <span
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              "block w-[6px] h-[6px] rounded-full transition-all duration-200 cursor-pointer",
              i === activeIndex
                ? "bg-white scale-100"
                : "bg-white/35 scale-100"
            )}
          />
        ))}
      </div>

      {/* Photo counter */}
      <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
        {activeIndex + 1}/{photos.length}
      </div>
    </div>
  );
}
