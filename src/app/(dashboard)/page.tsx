"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LotCard } from "@/components/inventory/LotCard";
import { SpecialStateCard } from "@/components/inventory/SpecialStateCard";
import { PARKING_LOTS, RECEPTION_LOT, SOLD_LOT } from "@/lib/constants";
import { formatTimeAgo } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { getInventoryCounts, getVehiclesInLot, type InventoryCounts } from "@/lib/queries";

function lotHref(lotName: string) {
  return `/inventario/${encodeURIComponent(lotName)}`;
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
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      Solo últimos 30 días
    </button>
  );
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<InventoryCounts>({});
  const [soldLast30Count, setSoldLast30Count] = useState(0);
  const [soldLast30Only, setSoldLast30Only] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());

  const refresh = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    }

    try {
      setError("");
      const nextCounts = await getInventoryCounts();
      setCounts(nextCounts);

      if (soldLast30Only) {
        const soldVehicles = await getVehiclesInLot(SOLD_LOT, { last30DaysOnly: true });
        setSoldLast30Count(soldVehicles.length);
      }

      setLastUpdated(new Date());
    } catch {
      setError("No se pudo cargar la información. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [soldLast30Only]);

  useEffect(() => {
    refresh();
    const refreshInterval = window.setInterval(() => refresh(), 60000);
    const clockInterval = window.setInterval(() => setNow(new Date()), 5000);

    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
    };
  }, [refresh]);

  useEffect(() => {
    if (!soldLast30Only) {
      return;
    }

    getVehiclesInLot(SOLD_LOT, { last30DaysOnly: true })
      .then((vehicles) => setSoldLast30Count(vehicles.length))
      .catch(() => setError("No se pudo cargar la información. Inténtalo de nuevo."));
  }, [soldLast30Only]);

  const totalActiveCars = useMemo(() => {
    return [...PARKING_LOTS, RECEPTION_LOT].reduce((total, lotName) => total + (counts[lotName] ?? 0), 0);
  }, [counts]);

  const soldCount = soldLast30Only ? soldLast30Count : counts[SOLD_LOT] ?? 0;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario en vivo</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {loading ? "Cargando inventario..." : `${formatNumber(totalActiveCars)} coches en el concesionario`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Última actualización:{" "}
            {lastUpdated ? formatTimeAgo(lastUpdated) : "pendiente"}
            <span className="sr-only">{now.toISOString()}</span>
          </p>
        </div>
        <Button disabled={refreshing} onClick={() => refresh(true)} variant="outline">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </section>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
          <Button className="ml-3" onClick={() => refresh(true)} size="sm" variant="outline">
            Reintentar
          </Button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? PARKING_LOTS.map((lotName) => <Skeleton className="h-40 rounded-lg" key={lotName} />)
          : PARKING_LOTS.map((lotName) => (
              <LotCard
                count={counts[lotName] ?? 0}
                href={lotHref(lotName)}
                key={lotName}
                lotName={lotName}
              />
            ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <>
            <Skeleton className="h-36 rounded-lg" />
            <Skeleton className="h-36 rounded-lg" />
          </>
        ) : (
          <>
            <SpecialStateCard
              description={`${counts[RECEPTION_LOT] ?? 0} coches recién llegados`}
              href="/inventario/recepcion"
              icon="📥"
              title="Recepción"
            />
            <SpecialStateCard
              description={`${formatNumber(soldCount)} coches vendidos`}
              href="/inventario/vendido"
              icon="📤"
              title="Vendidos"
            >
              <ToggleButton checked={soldLast30Only} onChange={setSoldLast30Only} />
            </SpecialStateCard>
          </>
        )}
      </section>
    </div>
  );
}
