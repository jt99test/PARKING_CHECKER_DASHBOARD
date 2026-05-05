"use client";

import { ArrowDownUp, CarFront } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { PhotoLightbox } from "@/components/photo-lightbox";
import { formatTimeAgo } from "@/lib/date";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "identifier" | "lastMovedAt";
type SortDirection = "asc" | "desc";

interface VehicleTableProps {
  vehicles: Vehicle[];
  loading?: boolean;
}

function getIdentifier(vehicle: Vehicle) {
  return vehicle.plateNumber ?? vehicle.vin ?? "";
}

function MissingValue({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground italic">{children}</span>;
}

function PhotoThumb({
  url,
  onClick,
}: {
  url: string | null;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-muted"
      disabled={!url}
      onClick={onClick}
      type="button"
    >
      {url ? (
        <Image alt="Foto del vehículo" className="h-full w-full object-cover" height={48} src={url} width={48} />
      ) : (
        <CarFront className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
}

export function VehicleTable({ vehicles, loading = false }: VehicleTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("lastMovedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [lightboxVehicle, setLightboxVehicle] = useState<Vehicle | null>(null);

  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      const modifier = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "identifier") {
        return getIdentifier(a).localeCompare(getIdentifier(b), "es") * modifier;
      }

      return (a.lastMovedAt.getTime() - b.lastMovedAt.getTime()) * modifier;
    });
  }, [sortDirection, sortKey, vehicles]);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "lastMovedAt" ? "desc" : "asc");
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="grid grid-cols-[64px_1.5fr_1fr_1fr] gap-4 border-b p-4" key={index}>
            <Skeleton className="h-12 w-12" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-4 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
        <CarFront className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">No hay coches en este lote.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Foto</TableHead>
              <TableHead>
                <Button
                  className="-ml-3"
                  onClick={() => toggleSort("identifier")}
                  size="sm"
                  variant="ghost"
                >
                  Identificador
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>
                <Button
                  className="-ml-3"
                  onClick={() => toggleSort("lastMovedAt")}
                  size="sm"
                  variant="ghost"
                >
                  Última actualización
                  <ArrowDownUp className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedVehicles.map((vehicle) => (
              <TableRow
                className="cursor-pointer"
                key={vehicle.id}
                onClick={() => router.push(`/coche/${vehicle.id}`)}
              >
                <TableCell>
                  <PhotoThumb
                    onClick={(event) => {
                      event.stopPropagation();
                      setLightboxVehicle(vehicle);
                    }}
                    url={vehicle.lastPhotoUrl}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {vehicle.plateNumber ?? <MissingValue>Sin matrícula</MissingValue>}
                    </p>
                    <p
                      className={cn(
                        "font-mono text-xs",
                        !vehicle.vin && "font-sans text-muted-foreground italic",
                      )}
                    >
                      {vehicle.vin ?? "Sin VIN"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{vehicle.brand ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <p>{formatTimeAgo(vehicle.lastMovedAt)}</p>
                  <p className="text-xs text-muted-foreground">por {vehicle.lastMovedBy || "—"}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PhotoLightbox
        imageUrl={lightboxVehicle?.lastPhotoUrl ?? null}
        onOpenChange={(open) => !open && setLightboxVehicle(null)}
        open={Boolean(lightboxVehicle)}
        timestamp={lightboxVehicle?.lastMovedAt}
      />
    </>
  );
}
