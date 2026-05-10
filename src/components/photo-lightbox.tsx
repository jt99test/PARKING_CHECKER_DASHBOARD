"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/date";

interface PhotoLightboxProps {
  imageUrl: string | null;
  timestamp?: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoLightbox({
  imageUrl,
  timestamp,
  open,
  onOpenChange,
}: PhotoLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-zinc-800 bg-black p-4 text-white">
        <DialogHeader>
          <DialogTitle className="pr-8 text-sm font-medium text-zinc-200">
            {timestamp ? formatDateTime(timestamp) : "Foto del vehículo"}
          </DialogTitle>
        </DialogHeader>
        <div className="relative mt-2 flex max-h-[90vh] min-h-[320px] items-center justify-center">
          {imageUrl ? (
            <Image
              alt="Foto del vehículo"
              className="max-h-[82vh] w-auto rounded-md object-contain"
              height={1000}
              src={imageUrl}
              unoptimized
              width={1400}
            />
          ) : (
            <p className="text-sm text-zinc-400">No hay foto disponible.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
