"use client";

import { AlertTriangle, ArrowDownUp, CarFront } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { getMovementPhotoUrls } from "@/lib/photos";
import type { Movement } from "@/lib/types";

type SortKey = "timestamp" | "identifier" | "employee";
type SortDirection = "asc" | "desc";

interface MovementTableProps {
  movements: Movement[];
  loading?: boolean;
}

function truncateNotes(notes: string | null) {
  if (!notes) {
    return "—";
  }

  return notes.length > 30 ? `${notes.slice(0, 30)}...` : notes;
}

function movementIdentifier(movement: Movement) {
  return movement.plateNumber ?? movement.vin ?? "";
}

export function MovementTable({ movements, loading = false }: MovementTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [lightboxMovement, setLightboxMovement] = useState<Movement | null>(null);

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => {
      const modifier = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "identifier") {
        return movementIdentifier(a).localeCompare(movementIdentifier(b), "es") * modifier;
      }

      if (sortKey === "employee") {
        return a.employeeName.localeCompare(b.employeeName, "es") * modifier;
      }

      return (a.timestamp.getTime() - b.timestamp.getTime()) * modifier;
    });
  }, [movements, sortDirection, sortKey]);

  function toggleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "timestamp" ? "desc" : "asc");
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] gap-4 border-b p-4" key={index}>
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
        <CarFront className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">No se han encontrado movimientos con estos filtros.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Prueba a ampliar el período o quitar filtros.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>
                <Button className="-ml-3" onClick={() => toggleSort("timestamp")} size="sm" variant="ghost">
                  Fecha y hora
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
              <TableHead>
                <Button className="-ml-3" onClick={() => toggleSort("identifier")} size="sm" variant="ghost">
                  Identificador
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
              <TableHead>Origen → Destino</TableHead>
              <TableHead>
                <Button className="-ml-3" onClick={() => toggleSort("employee")} size="sm" variant="ghost">
                  Empleado
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-12">⚠</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMovements.map((movement) => {
              const photoUrls = getMovementPhotoUrls(movement);
              const primaryPhotoUrl = photoUrls[0] ?? null;

              return (
              <TableRow
                className="cursor-pointer"
                key={movement.id}
                onClick={() => router.push(`/coche/${movement.vehicleId}`)}
              >
                <TableCell>
                  <button
                    className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted"
                    disabled={!primaryPhotoUrl}
                    onClick={(event) => {
                      event.stopPropagation();
                      setLightboxMovement(movement);
                    }}
                    type="button"
                  >
                    {primaryPhotoUrl ? (
                      <Image
                        alt="Foto del movimiento"
                        className="h-full w-full object-cover"
                        height={40}
                        src={primaryPhotoUrl}
                        unoptimized
                        width={40}
                      />
                    ) : (
                      <CarFront className="h-4 w-4 text-muted-foreground" />
                    )}
                    {photoUrls.length > 1 ? (
                      <span className="absolute bottom-0 right-0 rounded-tl bg-black/75 px-1 text-[10px] font-semibold text-white">
                        +{photoUrls.length - 1}
                      </span>
                    ) : null}
                  </button>
                </TableCell>
                <TableCell>{formatDateTime(movement.timestamp)}</TableCell>
                <TableCell>
                  {movement.identifierType === "vin" ? (
                    <span className="font-mono text-xs">{movement.vin ?? "Sin VIN"}</span>
                  ) : (
                    <span className="font-semibold">{movement.plateNumber ?? "Sin matrícula"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">{movement.fromLot || "—"}</span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">{movement.toLot || "—"}</span>
                </TableCell>
                <TableCell>{movement.employeeName || "—"}</TableCell>
                <TableCell className="max-w-[220px] text-muted-foreground" title={movement.notes ?? undefined}>
                  {truncateNotes(movement.notes)}
                </TableCell>
                <TableCell>
                  {movement.hadDiscrepancy ? (
                    <span
                      title={[movement.discrepancyReason, movement.discrepancyDetails]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
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
