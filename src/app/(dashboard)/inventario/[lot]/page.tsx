"use client";

import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { VehicleTable } from "@/components/inventory/VehicleTable";
import { RECEPTION_LOT, SOLD_LOT } from "@/lib/constants";
import { downloadInventoryCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import { getVehiclesInLot } from "@/lib/queries";
import type { Vehicle } from "@/lib/types";

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

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/">
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

      <VehicleTable loading={loading} vehicles={vehicles} />
    </div>
  );
}
