"use client";

import { AlertTriangle, CarFront, MapPin, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/date";
import { getMovementPhotoUrls } from "@/lib/photos";
import type { Movement } from "@/lib/types";

interface MovementCardGridProps {
  movements: Movement[];
  loading?: boolean;
  onDelete?: (movement: Movement) => void;
  onEdit?: (movement: Movement) => void;
  onToggleSelect?: (movement: Movement) => void;
  selectedVehicleIds?: Set<string>;
}

function movementIdentifier(movement: Movement) {
  return movement.plateNumber ?? movement.vin ?? "Sin identificador";
}

function formatRoute(movement: Movement) {
  const from = movement.fromLot || "Origen";
  const to = movement.toLot || "Destino";
  return `${from} -> ${to}`;
}

export function MovementCardGrid({
  movements,
  loading = false,
  onDelete,
  onEdit,
  onToggleSelect,
  selectedVehicleIds = new Set(),
}: MovementCardGridProps) {
  const router = useRouter();
  const [lightboxMovement, setLightboxMovement] = useState<Movement | null>(null);

  if (loading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="overflow-hidden rounded-lg border bg-card" key={index}>
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </section>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
        <CarFront className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">No se han encontrado movimientos con estos filtros.</p>
        <p className="mt-1 text-sm text-muted-foreground">Prueba a ampliar el periodo o quitar filtros.</p>
      </div>
    );
  }

  return (
    <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {movements.map((movement) => {
        const photoUrls = getMovementPhotoUrls(movement);
        const primaryPhotoUrl = photoUrls[0] ?? null;

        return (
        <article
          className="group overflow-hidden rounded-lg border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          key={movement.id}
        >
          <button
            className="relative block aspect-[4/3] w-full bg-muted text-left"
            disabled={!primaryPhotoUrl}
            onClick={() => setLightboxMovement(movement)}
            type="button"
          >
            {primaryPhotoUrl ? (
              <Image
                alt="Foto del movimiento"
                className="object-cover transition duration-200 group-hover:scale-[1.02]"
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                src={primaryPhotoUrl}
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <CarFront className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            {photoUrls.length > 1 ? (
              <span className="absolute bottom-3 right-3 rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white shadow-sm">
                +{photoUrls.length - 1}
              </span>
            ) : null}
            {movement.hadDiscrepancy ? (
              <span className="absolute right-3 top-3 rounded-md bg-white/90 p-1.5 text-destructive shadow-sm">
                <AlertTriangle className="h-4 w-4" />
              </span>
            ) : null}
            {onToggleSelect ? (
              <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
                {selectedVehicleIds.has(movement.vehicleId) ? "Seleccionado" : "Seleccionar"}
              </span>
            ) : null}
          </button>
          <button
            className="block w-full text-left"
            onClick={() => router.push(`/coche/${movement.vehicleId}`)}
            type="button"
          >
            <div className="space-y-3 p-4">
              <div>
                <p className="text-2xl font-bold tracking-normal text-foreground">{movementIdentifier(movement)}</p>
                {movement.identifierType === "vin" && movement.vin ? (
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{movement.vin}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="truncate">{formatRoute(movement)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{movement.employeeName || "Sin empleado"}</span>
                <span className="shrink-0 text-muted-foreground">{formatDateTime(movement.timestamp)}</span>
              </div>
            </div>
          </button>
          <div className="grid grid-cols-3 gap-2 border-t p-4">
            {onToggleSelect ? (
              <Button
                className="w-full px-2"
                onClick={() => onToggleSelect(movement)}
                size="sm"
                variant={selectedVehicleIds.has(movement.vehicleId) ? "secondary" : "outline"}
              >
                {selectedVehicleIds.has(movement.vehicleId) ? "Quitar" : "Seleccionar"}
              </Button>
            ) : null}
            <Button className="w-full px-2" onClick={() => onEdit?.(movement)} size="sm" variant="outline">
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button className="w-full px-2" onClick={() => onDelete?.(movement)} size="sm" variant="outline">
              <Trash2 className="h-3.5 w-3.5" />
              Borrar
            </Button>
          </div>
        </article>
        );
      })}
    </section>
    <PhotoLightbox
      imageUrl={getMovementPhotoUrls(lightboxMovement ?? {})[0] ?? null}
      imageUrls={getMovementPhotoUrls(lightboxMovement ?? {})}
      onOpenChange={(open) => !open && setLightboxMovement(null)}
      open={Boolean(lightboxMovement)}
      timestamp={lightboxMovement?.timestamp}
    />
    </>
  );
}
