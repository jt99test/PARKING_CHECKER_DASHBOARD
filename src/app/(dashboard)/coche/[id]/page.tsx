"use client";

import { AlertTriangle, ArrowLeft, CarFront, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VehicleStateCard } from "@/components/inventory/VehicleStateCard";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/date";
import { getMovementsForVehicle, getVehicleById } from "@/lib/queries";
import type { Movement, Vehicle } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LightboxPhoto {
  url: string;
  timestamp: Date;
}

function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center rounded-lg bg-muted", className)}>
      <CarFront className="h-10 w-10 text-muted-foreground" />
    </div>
  );
}

function LoadingDetail() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-5 w-40" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-20 w-20 rounded-md" />
            <Skeleton className="h-20 w-20 rounded-md" />
            <Skeleton className="h-20 w-20 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

function MovementHistory({
  movements,
  onPhotoClick,
}: {
  movements: Movement[];
  onPhotoClick: (photo: LightboxPhoto) => void;
}) {
  if (movements.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
        <CarFront className="h-9 w-9 text-muted-foreground" />
        <p className="mt-3 font-medium">No hay movimientos registrados.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha y hora</TableHead>
            <TableHead>Origen → Destino</TableHead>
            <TableHead>Empleado</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead className="w-20">Foto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {movement.hadDiscrepancy ? (
                    <span
                      title={
                        movement.discrepancyReason ??
                        movement.discrepancyDetails ??
                        "Movimiento con discrepancia"
                      }
                    >
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </span>
                  ) : null}
                  {formatDateTime(movement.timestamp)}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">{movement.fromLot || "—"}</span>
                <span className="mx-2">→</span>
                <span className="font-medium">{movement.toLot || "—"}</span>
              </TableCell>
              <TableCell>{movement.employeeName || "—"}</TableCell>
              <TableCell className="max-w-xs text-muted-foreground">
                {movement.notes || "—"}
              </TableCell>
              <TableCell>
                {movement.photoUrl ? (
                  <button
                    className="h-12 w-12 overflow-hidden rounded-md bg-muted"
                    onClick={() =>
                      onPhotoClick({ url: movement.photoUrl, timestamp: movement.timestamp })
                    }
                    type="button"
                  >
                    <Image
                      alt="Foto del movimiento"
                      className="h-full w-full object-cover"
                      height={48}
                      src={movement.photoUrl}
                      width={48}
                    />
                  </button>
                ) : (
                  <PhotoPlaceholder className="h-12 w-12" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const vehicleId = decodeURIComponent(params.id);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<LightboxPhoto | null>(null);

  const refresh = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    }

    try {
      setError("");
      const nextVehicle = await getVehicleById(vehicleId);
      setVehicle(nextVehicle);

      if (!nextVehicle) {
        setMovements([]);
        return;
      }

      try {
        const nextMovements = await getMovementsForVehicle(vehicleId);
        setMovements(nextMovements);
      } catch {
        setMovements([]);
        setError("Se ha cargado el coche, pero no se pudo cargar su historial.");
      }
    } catch {
      setError("No se pudo cargar la información. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const galleryPhotos = useMemo(() => {
    return movements
      .filter((movement) => movement.photoUrl)
      .map((movement) => ({
        url: movement.photoUrl,
        timestamp: movement.timestamp,
        id: movement.id,
      }));
  }, [movements]);

  const mainPhoto = galleryPhotos[0] ?? (vehicle?.lastPhotoUrl
    ? { url: vehicle.lastPhotoUrl, timestamp: vehicle.lastMovedAt, id: vehicle.id }
    : null);

  if (loading) {
    return <LoadingDetail />;
  }

  if (!vehicle) {
    return (
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/">
          <ArrowLeft className="h-4 w-4" />
          Inventario
        </Link>
        <div className="rounded-lg border bg-card p-8 text-center">
          <CarFront className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">No se ha encontrado este coche.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Puede que ya no exista o que no tengas acceso a sus datos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href={`/inventario/${encodeURIComponent(vehicle.currentLot)}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Inventario / {vehicle.currentLot}
        </Link>
        <Button disabled={refreshing} onClick={() => refresh(true)} variant="outline">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
          <Button className="ml-3" onClick={() => refresh(true)} size="sm" variant="outline">
            Reintentar
          </Button>
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <div className="space-y-4">
          {mainPhoto ? (
            <button
              className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted"
              onClick={() =>
                setLightboxPhoto({ url: mainPhoto.url, timestamp: mainPhoto.timestamp })
              }
              type="button"
            >
              <Image
                alt="Foto principal del coche"
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                src={mainPhoto.url}
              />
            </button>
          ) : (
            <PhotoPlaceholder className="aspect-[4/3] w-full" />
          )}

          <div className="flex gap-3 overflow-x-auto pb-1">
            {galleryPhotos.length > 0 ? (
              galleryPhotos.map((photo) => (
                <button
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted"
                  key={photo.id}
                  onClick={() => setLightboxPhoto({ url: photo.url, timestamp: photo.timestamp })}
                  type="button"
                >
                  <Image
                    alt="Miniatura del movimiento"
                    className="object-cover"
                    fill
                    sizes="80px"
                    src={photo.url}
                  />
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay galería de fotos todavía.</p>
            )}
          </div>
        </div>

        <VehicleStateCard vehicle={vehicle} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Historial de movimientos</h2>
        <MovementHistory movements={movements} onPhotoClick={setLightboxPhoto} />
      </section>

      <PhotoLightbox
        imageUrl={lightboxPhoto?.url ?? null}
        onOpenChange={(open) => !open && setLightboxPhoto(null)}
        open={Boolean(lightboxPhoto)}
        timestamp={lightboxPhoto?.timestamp}
      />
    </div>
  );
}
