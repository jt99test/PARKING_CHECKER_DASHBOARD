"use client";

import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchBar } from "@/components/search/SearchBar";
import { VehicleTable } from "@/components/inventory/VehicleTable";
import { RECEPTION_LOT, SOLD_LOT } from "@/lib/constants";
import { downloadInventoryCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import { deleteMovement, getLatestMovementForVehicle, getVehiclesInLot, updateMovement } from "@/lib/queries";
import type { Movement, Vehicle } from "@/lib/types";

function normalizeLotParam(value: string) {
  const decoded = decodeURIComponent(value);

  if (decoded.toLowerCase() === "recepcion") {
    return RECEPTION_LOT;
  }

  if (decoded.toLowerCase() === "vendido") {
    return SOLD_LOT;
  }

  return decoded;
}

function lotHeader(count: number, lotName: string) {
  if (lotName === RECEPTION_LOT) {
    return `${formatNumber(count)} coches en recepción`;
  }

  if (lotName === SOLD_LOT) {
    return `${formatNumber(count)} coches vendidos`;
  }

  return `${formatNumber(count)} coches en ${lotName}`;
}

function ToggleButton({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className={`flex h-5 w-9 items-center rounded-full p-0.5 ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} />
      </span>
      Solo últimos 30 días
    </button>
  );
}

export default function InventoryLotPage() {
  const params = useParams<{ lot: string }>();
  const lotName = useMemo(() => normalizeLotParam(params.lot), [params.lot]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [soldLast30Only, setSoldLast30Only] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [editFromLot, setEditFromLot] = useState("");
  const [editToLot, setEditToLot] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingMovement, setSavingMovement] = useState(false);

  const refresh = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    }

    try {
      setError("");
      const nextVehicles = await getVehiclesInLot(lotName, {
        last30DaysOnly: lotName === SOLD_LOT && soldLast30Only,
      });
      setVehicles(nextVehicles);
    } catch {
      setError("No se pudo cargar la información. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lotName, soldLast30Only]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(() => refresh(), 60000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toUpperCase();

    if (normalizedQuery.length < 2) {
      return vehicles;
    }

    return vehicles.filter((vehicle) => {
      return (
        vehicle.plateNumber?.includes(normalizedQuery) ||
        vehicle.vin?.includes(normalizedQuery)
      );
    });
  }, [searchQuery, vehicles]);

  async function openEditVehicle(vehicle: Vehicle) {
    try {
      setError("");
      const movement = await getLatestMovementForVehicle(vehicle.id);

      if (!movement) {
        setError("Este coche no tiene movimientos para editar.");
        return;
      }

      setEditingMovement(movement);
      setEditFromLot(movement.fromLot);
      setEditToLot(movement.toLot);
      setEditNotes(movement.notes ?? "");
    } catch {
      setError("No se pudo cargar el movimiento para editar.");
    }
  }

  async function handleDeleteVehicle(vehicle: Vehicle) {
    const confirmed = window.confirm(
      `Borrar el ultimo movimiento de ${vehicle.plateNumber ?? vehicle.vin ?? "este coche"}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      const movement = await getLatestMovementForVehicle(vehicle.id);

      if (!movement) {
        setError("Este coche no tiene movimientos para borrar.");
        return;
      }

      await deleteMovement(movement);
      await refresh(true);
    } catch {
      setError("No se pudo borrar el movimiento.");
    }
  }

  async function handleSaveMovement() {
    if (!editingMovement) {
      return;
    }

    setSavingMovement(true);
    setError("");

    try {
      await updateMovement(editingMovement, {
        fromLot: editFromLot.trim(),
        toLot: editToLot.trim(),
        notes: editNotes.trim() || null,
      });
      setEditingMovement(null);
      await refresh(true);
    } catch {
      setError("No se pudo editar el movimiento.");
    } finally {
      setSavingMovement(false);
    }
  }

  return (
    <>
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/inventario">
        <ArrowLeft className="h-4 w-4" />
        Inventario / {lotName}
      </Link>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {loading ? "Cargando coches..." : lotHeader(vehicles.length, lotName)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lotName === SOLD_LOT ? (
            <ToggleButton checked={soldLast30Only} onChange={setSoldLast30Only} />
          ) : null}
          <Button disabled={refreshing} onClick={() => refresh(true)} variant="outline">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button disabled={loading || vehicles.length === 0} onClick={() => downloadInventoryCsv(lotName, vehicles)}>
            <Download className="h-4 w-4" />
            Exportar a Excel
          </Button>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
          <Button className="ml-3" onClick={() => refresh(true)} size="sm" variant="outline">
            Reintentar
          </Button>
        </div>
      ) : null}

      <SearchBar
        onChange={setSearchQuery}
        onClear={() => setSearchQuery("")}
        value={searchQuery}
      />

      <VehicleTable
        loading={loading}
        onDeleteVehicle={handleDeleteVehicle}
        onEditVehicle={openEditVehicle}
        vehicles={filteredVehicles}
      />
    </div>
    <Dialog open={Boolean(editingMovement)} onOpenChange={(open) => !open && setEditingMovement(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar movimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Origen</span>
            <Input value={editFromLot} onChange={(event) => setEditFromLot(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Destino</span>
            <Input value={editToLot} onChange={(event) => setEditToLot(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Notas</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setEditNotes(event.target.value)}
              value={editNotes}
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button disabled={savingMovement} onClick={() => setEditingMovement(null)} variant="outline">
              Cancelar
            </Button>
            <Button disabled={savingMovement || !editToLot.trim()} onClick={handleSaveMovement}>
              {savingMovement ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
