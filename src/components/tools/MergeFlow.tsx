"use client";

import { AlertTriangle, ArrowRight, CarFront } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { VehiclePicker } from "@/components/tools/VehiclePicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/date";
import { mergeVehicles } from "@/lib/merge";
import type { Vehicle } from "@/lib/types";

function VehicleCard({ vehicle, label }: { vehicle: Vehicle; label: string }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
          {vehicle.lastPhotoUrl ? (
            <Image alt="Foto del coche" className="object-cover" fill sizes="320px" src={vehicle.lastPhotoUrl} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <CarFront className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{vehicle.plateNumber ?? "Sin matrícula"}</p>
          <p className="font-mono text-xs text-muted-foreground">{vehicle.vin ?? "Sin VIN"}</p>
          <p>{vehicle.brand ?? "—"}</p>
          <p>{vehicle.currentLot}</p>
          <p>{vehicle.totalMoves} movs</p>
        </div>
      </CardContent>
    </Card>
  );
}

function conflictClass(conflict: boolean) {
  return conflict ? "rounded-md bg-amber-500/15 px-2 py-1" : "";
}

export function MergeFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [firstVehicle, setFirstVehicle] = useState<Vehicle | null>(null);
  const [secondVehicle, setSecondVehicle] = useState<Vehicle | null>(null);
  const [primaryId, setPrimaryId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  const primaryVehicle = primaryId === secondVehicle?.id ? secondVehicle : firstVehicle;
  const secondaryVehicle = primaryId === secondVehicle?.id ? firstVehicle : secondVehicle;

  const preview = useMemo(() => {
    if (!primaryVehicle || !secondaryVehicle) return null;
    const latest = primaryVehicle.lastMovedAt >= secondaryVehicle.lastMovedAt ? primaryVehicle : secondaryVehicle;
    const earliest = primaryVehicle.firstSeenAt <= secondaryVehicle.firstSeenAt ? primaryVehicle : secondaryVehicle;

    return {
      plateNumber: primaryVehicle.plateNumber ?? secondaryVehicle.plateNumber ?? "—",
      vin: primaryVehicle.vin ?? secondaryVehicle.vin ?? "—",
      brand: primaryVehicle.brand ?? secondaryVehicle.brand ?? "—",
      currentLot: latest.currentLot,
      totalMoves: primaryVehicle.totalMoves + secondaryVehicle.totalMoves,
      firstSeenAt: earliest.firstSeenAt,
    };
  }, [primaryVehicle, secondaryVehicle]);

  async function confirmMerge() {
    if (!user || !primaryVehicle || !secondaryVehicle) return;
    setMerging(true);
    try {
      const result = await mergeVehicles(primaryVehicle.id, secondaryVehicle.id, user);
      toast(`Coches combinados correctamente. ${result.transferredMovements} movimientos transferidos.`);
      router.push(`/coche/${primaryVehicle.id}`);
    } catch {
      toast("No se pudo combinar los coches.");
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="space-y-8">
      {!firstVehicle ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Busca el primer coche...</h2>
          <VehiclePicker onSelect={(vehicle) => {
            setFirstVehicle(vehicle);
            setPrimaryId(vehicle.id);
          }} placeholder="Busca el primer coche..." />
        </section>
      ) : null}

      {firstVehicle && !secondVehicle ? (
        <section className="space-y-3">
          <div className="grid gap-4 lg:grid-cols-2">
            <VehicleCard label="Coche A" vehicle={firstVehicle} />
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Busca el segundo coche...</h2>
              <VehiclePicker excludeId={firstVehicle.id} onSelect={setSecondVehicle} placeholder="Busca el segundo coche..." />
            </div>
          </div>
        </section>
      ) : null}

      {firstVehicle && secondVehicle && preview ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <VehicleCard label="Coche A" vehicle={firstVehicle} />
            <VehicleCard label="Coche B" vehicle={secondVehicle} />
          </section>
          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-lg font-semibold">¿Cuál mantener como registro principal?</h2>
            <div className="mt-4 flex gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input checked={primaryId === firstVehicle.id} onChange={() => setPrimaryId(firstVehicle.id)} type="radio" />
                Mantener Coche A
              </label>
              <label className="flex items-center gap-2">
                <input checked={primaryId === secondVehicle.id} onChange={() => setPrimaryId(secondVehicle.id)} type="radio" />
                Mantener Coche B
              </label>
            </div>
          </section>
          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Resultado previsto</h2>
            <div className="grid gap-2 text-sm">
              <p>Matrícula: {preview.plateNumber}</p>
              <p>VIN: <span className="font-mono">{preview.vin}</span></p>
              <p className={conflictClass(firstVehicle.brand !== secondVehicle.brand)}>Marca: {preview.brand}</p>
              <p className={conflictClass(firstVehicle.currentLot !== secondVehicle.currentLot)}>Lote actual: {preview.currentLot}</p>
              <p>Movimientos totales: {preview.totalMoves}</p>
              <p>Primer registro: {formatDateTime(preview.firstSeenAt)}</p>
            </div>
            <Button className="mt-5" onClick={() => setConfirmOpen(true)} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              Combinar coches
            </Button>
          </section>
        </>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ ¿Estás seguro?</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            Esta acción combinará los dos coches en uno y eliminará el registro duplicado. No se puede deshacer. Se mantendrá{" "}
            {primaryVehicle?.plateNumber ?? primaryVehicle?.vin ?? "el principal"}. Se eliminará{" "}
            {secondaryVehicle?.plateNumber ?? secondaryVehicle?.vin ?? "el duplicado"}. Todos sus movimientos se transferirán al registro principal.
          </p>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setConfirmOpen(false)} variant="outline">Cancelar</Button>
            <Button disabled={merging} onClick={confirmMerge} variant="destructive">
              {merging ? "Combinando..." : (
                <>
                  Confirmar combinación
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
