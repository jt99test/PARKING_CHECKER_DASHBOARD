"use client";

import { CarFront } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTimeAgo } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

interface SearchResultsProps {
  query: string;
  vehicles: Vehicle[];
  loading?: boolean;
  onVehicleClick?: (vehicle: Vehicle) => void;
}

export function SearchResults({ query, vehicles, loading = false, onVehicleClick }: SearchResultsProps) {
  const router = useRouter();

  if (!query) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
        <CarFront className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Escribe una matrícula o VIN para empezar.
        </p>
      </div>
    );
  }

  if (query.length < 2) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Escribe al menos 2 caracteres para buscar.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="grid grid-cols-[56px_1.5fr_1fr_1fr_1fr_64px] gap-4 border-b p-4" key={index}>
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
        <CarFront className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">No se ha encontrado ningún coche con {query}.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Comprueba que la matrícula o el VIN están bien escritos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Foto</TableHead>
            <TableHead>Identificador</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Lote actual</TableHead>
            <TableHead>Última actualización</TableHead>
            <TableHead>Movs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow
              className="cursor-pointer"
              data-vehicle-id={vehicle.id}
              key={vehicle.id}
              onClick={() => (onVehicleClick ? onVehicleClick(vehicle) : router.push(`/coche/${vehicle.id}`))}
            >
              <TableCell>
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {vehicle.lastPhotoUrl ? (
                    <Image
                      alt="Foto del coche"
                      className="h-full w-full object-cover"
                      height={40}
                      src={vehicle.lastPhotoUrl}
                      width={40}
                    />
                  ) : (
                    <CarFront className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-semibold">{vehicle.plateNumber ?? "Sin matrícula"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{vehicle.vin ?? "Sin VIN"}</p>
                </div>
              </TableCell>
              <TableCell>{vehicle.brand ?? "—"}</TableCell>
              <TableCell>{vehicle.currentLot}</TableCell>
              <TableCell>
                <p>{formatTimeAgo(vehicle.lastMovedAt)}</p>
                <p className="text-xs text-muted-foreground">por {vehicle.lastMovedBy || "—"}</p>
              </TableCell>
              <TableCell>{formatNumber(vehicle.totalMoves)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
