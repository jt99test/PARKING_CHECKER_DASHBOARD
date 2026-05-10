"use client";

import { CarFront } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/date";
import type { Movement } from "@/lib/types";

export function DiscrepancyTable({ movements }: { movements: Movement[] }) {
  const router = useRouter();

  if (movements.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No se han encontrado discrepancias con estos filtros.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Foto</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Identificador</TableHead>
            <TableHead>Sistema decía</TableHead>
            <TableHead>Empleado dijo</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Empleado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow className="cursor-pointer" key={movement.id} onClick={() => router.push(`/coche/${movement.vehicleId}`)}>
              <TableCell>
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {movement.photoUrl ? (
                    <Image alt="Foto" className="h-full w-full object-cover" height={40} src={movement.photoUrl} unoptimized width={40} />
                  ) : (
                    <CarFront className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </TableCell>
              <TableCell>{formatDateTime(movement.timestamp)}</TableCell>
              <TableCell>{movement.plateNumber ?? movement.vin ?? "—"}</TableCell>
              <TableCell>{movement.systemFromLot ?? movement.fromLot ?? "—"}</TableCell>
              <TableCell>{movement.declaredFromLot ?? movement.toLot ?? "—"}</TableCell>
              <TableCell>{movement.discrepancyReason ?? movement.discrepancyDetails ?? "—"}</TableCell>
              <TableCell>{movement.employeeName || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
