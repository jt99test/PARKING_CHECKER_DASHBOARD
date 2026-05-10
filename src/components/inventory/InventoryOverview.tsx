"use client";

import { Download, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LotCard } from "@/components/inventory/LotCard";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { OTHER_LOT, PARKING_LOTS, RECEPTION_LOT, SOLD_LOT } from "@/lib/constants";
import { downloadAllVehiclesCsv } from "@/lib/csv";
import { formatTimeAgo } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import {
  addManagedLot,
  deleteManagedLot,
  getAllVehiclesForExport,
  getInventoryCounts,
  renameLot,
  searchVehicles,
  type InventoryCounts,
} from "@/lib/queries";
import type { Vehicle } from "@/lib/types";

function lotHref(lotName: string) {
  return `/inventario/${encodeURIComponent(lotName)}`;
}

function isProtectedLot(lotName: string) {
  return [...PARKING_LOTS, RECEPTION_LOT, OTHER_LOT, SOLD_LOT].includes(
    lotName as (typeof PARKING_LOTS)[number] | typeof RECEPTION_LOT | typeof OTHER_LOT | typeof SOLD_LOT,
  );
}

export function InventoryOverview() {
  const [counts, setCounts] = useState<InventoryCounts>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [lotToAdd, setLotToAdd] = useState("");
  const [renamingLot, setRenamingLot] = useState("");
  const [nextLotName, setNextLotName] = useState("");
  const [savingLot, setSavingLot] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const refresh = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    }

    try {
      setError("");
      setCounts(await getInventoryCounts());
      setLastUpdated(new Date());
    } catch {
      setError("No se pudo cargar la informacion. Intentalo de nuevo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    const normalizedQuery = searchQuery.trim();

    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const results = await searchVehicles(normalizedQuery, 10);

        if (!cancelled) {
          setSearchResults(results);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  const visibleLots = useMemo(() => {
    const orderedLots = [...PARKING_LOTS, RECEPTION_LOT, OTHER_LOT];
    const dynamicLots = Object.keys(counts).filter(
      (lotName) => lotName && lotName !== SOLD_LOT && !orderedLots.includes(lotName as (typeof orderedLots)[number]),
    );

    return [...orderedLots, ...dynamicLots.sort((a, b) => a.localeCompare(b, "es"))];
  }, [counts]);
  const totalActiveCars = useMemo(() => {
    return visibleLots.reduce((total, lotName) => total + (counts[lotName] ?? 0), 0);
  }, [counts, visibleLots]);

  async function handleAddLot() {
    const nextName = lotToAdd.trim();

    if (!nextName) {
      return;
    }

    setSavingLot(true);
    setError("");

    try {
      await addManagedLot(nextName);
      setLotToAdd("");
      await refresh(true);
    } catch {
      setError("No se pudo añadir el lote.");
    } finally {
      setSavingLot(false);
    }
  }

  function openRenameLot(lotName: string) {
    setRenamingLot(lotName);
    setNextLotName(lotName);
  }

  async function handleRenameLot() {
    const nextName = nextLotName.trim();

    if (!renamingLot || !nextName || renamingLot === nextName) {
      setRenamingLot("");
      return;
    }

    setSavingLot(true);
    setError("");

    try {
      await renameLot(renamingLot, nextName);
      setRenamingLot("");
      await refresh(true);
    } catch {
      setError("No se pudo renombrar el lote.");
    } finally {
      setSavingLot(false);
    }
  }

  async function handleDeleteLot(lotName: string) {
    const count = counts[lotName] ?? 0;

    if (count > 0) {
      setError(`No se puede eliminar ${lotName} porque todavia tiene ${formatNumber(count)} coche(s).`);
      return;
    }

    const confirmed = window.confirm(`Eliminar el lote "${lotName}"?`);

    if (!confirmed) {
      return;
    }

    setSavingLot(true);
    setError("");

    try {
      await deleteManagedLot(lotName);
      await refresh(true);
    } catch {
      setError("No se pudo eliminar el lote. Comprueba que este vacio.");
    } finally {
      setSavingLot(false);
    }
  }

  async function handleExportInventory() {
    setExporting(true);
    setError("");

    try {
      downloadAllVehiclesCsv(await getAllVehiclesForExport());
    } catch {
      setError("No se pudo exportar el inventario.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {loading ? "Cargando inventario..." : `${formatNumber(totalActiveCars)} coches activos`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ultima actualizacion: {lastUpdated ? formatTimeAgo(lastUpdated) : "pendiente"}
            <span className="sr-only">{now.toISOString()}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={exporting} onClick={handleExportInventory} variant="outline">
            <Download className="h-4 w-4" />
            Exportar inventario
          </Button>
          <Button disabled={refreshing} onClick={() => refresh(true)} variant="outline">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            className="h-11"
            onChange={(event) => setLotToAdd(event.target.value)}
            placeholder="Nombre del lote nuevo"
            value={lotToAdd}
          />
          <Button disabled={savingLot || !lotToAdd.trim()} onClick={handleAddLot}>
            <Plus className="h-4 w-4" />
            Añadir lote
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <SearchBar
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
          value={searchQuery}
        />
        {searchQuery ? (
          <SearchResults
            loading={searchLoading}
            query={searchQuery}
            vehicles={searchResults}
          />
        ) : null}
      </section>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
          <Button className="ml-3" onClick={() => refresh(true)} size="sm" variant="outline">
            Reintentar
          </Button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? visibleLots.map((lotName) => <Skeleton className="h-40 rounded-lg" key={lotName} />)
          : visibleLots.map((lotName) => (
              <LotCard
                count={counts[lotName] ?? 0}
                href={lotHref(lotName)}
                key={lotName}
                lotName={lotName}
                onDeleteLot={!isProtectedLot(lotName) ? handleDeleteLot : undefined}
                onEditName={openRenameLot}
              />
            ))}
      </section>
      </div>
      <Dialog open={Boolean(renamingLot)} onOpenChange={(open) => !open && setRenamingLot("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nombre del lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input className="h-11" onChange={(event) => setNextLotName(event.target.value)} value={nextLotName} />
            <div className="flex justify-end gap-3">
              <Button disabled={savingLot} onClick={() => setRenamingLot("")} variant="outline">
                Cancelar
              </Button>
              <Button disabled={savingLot || !nextLotName.trim()} onClick={handleRenameLot}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
