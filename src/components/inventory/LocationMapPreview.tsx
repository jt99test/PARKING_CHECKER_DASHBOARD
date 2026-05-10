"use client";

import { MapPin } from "lucide-react";
import type { GeoLocation } from "@/lib/types";

interface LocationMapPreviewProps {
  location: GeoLocation;
}

function mapsUrl(location: GeoLocation) {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

function embedUrl(location: GeoLocation) {
  return `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=16&output=embed`;
}

export function LocationMapPreview({ location }: LocationMapPreviewProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="aspect-[16/9] bg-muted">
        <iframe
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl(location)}
          title="Mapa de ubicacion del coche"
        />
      </div>
      <a
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:text-primary/80"
        href={mapsUrl(location)}
        rel="noreferrer"
        target="_blank"
      >
        <MapPin className="h-4 w-4" />
        Abrir en Google Maps
      </a>
    </div>
  );
}
