"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/date";

interface PhotoLightboxProps {
  imageUrl: string | null;
  imageUrls?: string[];
  initialIndex?: number;
  timestamp?: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoLightbox({
  imageUrl,
  imageUrls,
  initialIndex = 0,
  timestamp,
  open,
  onOpenChange,
}: PhotoLightboxProps) {
  const photos = useMemo(() => {
    if (imageUrls && imageUrls.length > 0) {
      return imageUrls.filter(Boolean);
    }

    return imageUrl ? [imageUrl] : [];
  }, [imageUrl, imageUrls]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const currentUrl = photos[activeIndex] ?? null;
  const hasMultiplePhotos = photos.length > 1;

  useEffect(() => {
    if (open) {
      setActiveIndex(Math.min(initialIndex, Math.max(photos.length - 1, 0)));
    }
  }, [initialIndex, open, photos.length]);

  function showPrevious() {
    setActiveIndex((current) => (current === 0 ? photos.length - 1 : current - 1));
  }

  function showNext() {
    setActiveIndex((current) => (current === photos.length - 1 ? 0 : current + 1));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-zinc-800 bg-black p-4 text-white">
        <DialogHeader>
          <DialogTitle className="pr-8 text-sm font-medium text-zinc-200">
            {timestamp ? formatDateTime(timestamp) : "Foto del vehículo"}
          </DialogTitle>
        </DialogHeader>
        <div className="relative mt-2 flex max-h-[90vh] min-h-[320px] items-center justify-center">
          {currentUrl ? (
            <Image
              alt="Foto del vehículo"
              className="max-h-[82vh] w-auto rounded-md object-contain"
              height={1000}
              src={currentUrl}
              unoptimized
              width={1400}
            />
          ) : (
            <p className="text-sm text-zinc-400">No hay foto disponible.</p>
          )}
          {hasMultiplePhotos ? (
            <>
              <button
                aria-label="Foto anterior"
                className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 transition hover:bg-black/80"
                onClick={showPrevious}
                type="button"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Foto siguiente"
                className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 transition hover:bg-black/80"
                onClick={showNext}
                type="button"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20">
                {activeIndex + 1} / {photos.length}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
