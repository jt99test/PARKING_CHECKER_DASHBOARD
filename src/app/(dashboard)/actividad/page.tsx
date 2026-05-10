"use client";

import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Download, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MovementFilters, type MovementFilterState, type PeriodOption } from "@/components/activity/MovementFilters";
import { MovementCardGrid } from "@/components/activity/MovementCardGrid";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { downloadActivityCsv, downloadAllMovementsCsv, downloadAllVehiclesCsv } from "@/lib/csv";
import { formatTimeAgo } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { mergeVehicles } from "@/lib/merge";
import {
  deleteMovement,
  getAllMovementsForExport,
  getAllVehiclesForExport,
  getInventoryCounts,
  getMovements,
  getUniqueEmployees,
  searchVehicles,
  updateMovement,
  type ActivityFilters,
  type MovementsPage,
} from "@/lib/queries";
import type { Movement, Vehicle } from "@/lib/types";

const pageSize = 50;

function rangeForPeriod(period: PeriodOption) {
  const now = new Date();

  if (period === "ayer") {
    const yesterday = subDays(now, 1);
    return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) };
  }

  if (period === "ultimos-7-dias") {
    return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) };
  }

  if (period === "este-mes") {
    return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }

  return { startDate: startOfDay(now), endDate: endOfDay(now) };
}

function periodLabel(filters: MovementFilterState) {
  if (filters.period === "personalizado") {
    return `${format(filters.startDate, "dd/MM/yyyy", { locale: es })} - ${format(filters.endDate, "dd/MM/yyyy", { locale: es })}`;
  }

  const labels: Record<PeriodOption, string> = {
    hoy: "hoy",
    ayer: "ayer",
    "ultimos-7-dias": "últimos 7 días",
    "este-mes": "este mes",
    personalizado: "período personalizado",
  };

  return labels[filters.period];
}

function parseDateParam(value: string | null, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function initialFilters(searchParams: URLSearchParams): MovementFilterState {
  const period = (searchParams.get("periodo") as PeriodOption | null) ?? "hoy";
  const safePeriod: PeriodOption = ["hoy", "ayer", "ultimos-7-dias", "este-mes", "personalizado"].includes(period)
    ? period
    : "hoy";
  const range = rangeForPeriod(safePeriod);

  return {
    period: safePeriod,
    lot: searchParams.get("lote") ?? "",
    employee: searchParams.get("empleado") ?? "",
    identifierType: searchParams.get("tipo") ?? "",
    discrepanciesOnly: searchParams.get("discrepancias") === "1",
    startDate: parseDateParam(searchParams.get("desde"), range.startDate),
    endDate: parseDateParam(searchParams.get("hasta"), range.endDate),
  };
}

function filtersToQuery(filters: MovementFilterState) {
  const params = new URLSearchParams();

  params.set("periodo", filters.period);

  if (filters.lot) params.set("lote", filters.lot);
  if (filters.employee) params.set("empleado", filters.employee);
  if (filters.identifierType) params.set("tipo", filters.identifierType);
  if (filters.discrepanciesOnly) params.set("discrepancias", "1");

  if (filters.period === "personalizado") {
    params.set("desde", filters.startDate.toISOString());
    params.set("hasta", filters.endDate.toISOString());
  }

  return params.toString();
}

function toActivityFilters(filters: MovementFilterState): ActivityFilters {
  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
    lot: filters.lot || undefined,
    employeeName: filters.employee || undefined,
    identifierType: filters.identifierType === "plate" || filters.identifierType === "vin"
      ? filters.identifierType
      : undefined,
    discrepanciesOnly: filters.discrepanciesOnly,
  };
}

function normalizeFilters(nextFilters: MovementFilterState, previousPeriod: PeriodOption) {
  if (nextFilters.period !== "personalizado" && nextFilters.period !== previousPeriod) {
    return {
      ...nextFilters,
      ...rangeForPeriod(nextFilters.period),
    };
  }

  return nextFilters;
}

export default function ActivityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<MovementFilterState>(() => initialFilters(searchParams));
  const [employees, setEmployees] = useState<string[]>([]);
  const [lotOptions, setLotOptions] = useState<string[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cursor, setCursor] = useState<MovementsPage["cursor"]>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [editFromLot, setEditFromLot] = useState("");
  const [editToLot, setEditToLot] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingMovement, setSavingMovement] = useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());
  const [exportingAll, setExportingAll] = useState(false);
  const [merging, setMerging] = useState(false);

  const activityFilters = useMemo(() => toActivityFilters(filters), [filters]);

  const fetchMovements = useCallback(async (options: { append?: boolean; manual?: boolean; cursorOverride?: MovementsPage["cursor"] } = {}) => {
    if (options.append) {
      setLoadingMore(true);
    } else if (options.manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError("");
      const page = await getMovements(activityFilters, pageSize, options.cursorOverride ?? null);

      setMovements((current) => (options.append ? [...current, ...page.movements] : page.movements));
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setLastUpdated(new Date());
    } catch {
      setError("No se pudo cargar la información. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activityFilters]);

  useEffect(() => {
    getUniqueEmployees().then(setEmployees).catch(() => setEmployees([]));
    getInventoryCounts()
      .then((counts) => setLotOptions(Object.keys(counts).filter(Boolean).sort((a, b) => a.localeCompare(b, "es"))))
      .catch(() => setLotOptions([]));
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        setSearchResults(await searchVehicles(searchQuery, 8));
      } catch {
        setSearchError("No se pudo cargar la busqueda. Intentalo de nuevo.");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    setCursor(null);
    fetchMovements();
    const refreshInterval = window.setInterval(() => fetchMovements(), 60000);
    const clockInterval = window.setInterval(() => setNow(new Date()), 5000);

    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
    };
  }, [fetchMovements]);

  function updateFilters(nextFilters: MovementFilterState) {
    const normalized = normalizeFilters(nextFilters, filters.period);
    setFilters(normalized);
    router.replace(`/actividad?${filtersToQuery(normalized)}`, { scroll: false });
  }

  function clearFilters() {
    const range = rangeForPeriod("hoy");
    const cleared: MovementFilterState = {
      period: "hoy",
      lot: "",
      employee: "",
      identifierType: "",
      discrepanciesOnly: false,
      ...range,
    };

    setFilters(cleared);
    router.replace("/actividad?periodo=hoy", { scroll: false });
  }

  function openEditMovement(movement: Movement) {
    setEditingMovement(movement);
    setEditFromLot(movement.fromLot);
    setEditToLot(movement.toLot);
    setEditNotes(movement.notes ?? "");
  }

  async function handleDeleteMovement(movement: Movement) {
    const confirmed = window.confirm(
      `Borrar el movimiento de ${movement.plateNumber ?? movement.vin ?? "este coche"}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await deleteMovement(movement);
      await fetchMovements({ manual: true });
    } catch {
      setError("No se pudo borrar el movimiento. Inténtalo de nuevo.");
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
      await fetchMovements({ manual: true });
    } catch {
      setError("No se pudo editar el movimiento. Inténtalo de nuevo.");
    } finally {
      setSavingMovement(false);
    }
  }

  function toggleSelectedVehicle(movement: Movement) {
    setSelectedVehicleIds((current) => {
      const next = new Set(current);

      if (next.has(movement.vehicleId)) {
        next.delete(movement.vehicleId);
        return next;
      }

      if (next.size >= 2) {
        return new Set([movement.vehicleId]);
      }

      next.add(movement.vehicleId);
      return next;
    });
  }

  async function handleMergeSelected() {
    const [keepId, deleteId] = [...selectedVehicleIds];

    if (!user || !keepId || !deleteId) {
      return;
    }

    const confirmed = window.confirm("Combinar los 2 coches seleccionados? El primero seleccionado se conserva.");

    if (!confirmed) {
      return;
    }

    setMerging(true);
    setError("");

    try {
      await mergeVehicles(keepId, deleteId, user);
      setSelectedVehicleIds(new Set());
      await fetchMovements({ manual: true });
    } catch {
      setError("No se pudieron combinar los coches seleccionados.");
    } finally {
      setMerging(false);
    }
  }

  async function handleExportAll() {
    setExportingAll(true);
    setError("");

    try {
      const [vehicles, allMovements] = await Promise.all([
        getAllVehiclesForExport(),
        getAllMovementsForExport(),
      ]);
      downloadAllVehiclesCsv(vehicles);
      downloadAllMovementsCsv(allMovements);
    } catch {
      setError("No se pudo exportar todo.");
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <>
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Actividad</h1>
          <p className="mt-2 text-muted-foreground">
            {formatNumber(movements.length)} movimientos · {periodLabel(filters)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Última actualización: {lastUpdated ? formatTimeAgo(lastUpdated) : "pendiente"}
            <span className="sr-only">{now.toISOString()}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button disabled={exportingAll} onClick={handleExportAll} variant="outline">
            <Download className="h-4 w-4" />
            Exportar todo
          </Button>
          <Button disabled={refreshing} onClick={() => fetchMovements({ manual: true })} variant="outline">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button disabled={movements.length === 0} onClick={() => downloadActivityCsv(movements)}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <SearchBar onChange={setSearchQuery} onClear={() => setSearchQuery("")} value={searchQuery} />
        {searchError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {searchError}
          </div>
        ) : null}
        {searchQuery ? (
          <SearchResults
            loading={searchLoading}
            onVehicleClick={(vehicle) => router.push(`/coche/${vehicle.id}`)}
            query={searchQuery}
            vehicles={searchResults}
          />
        ) : null}
      </section>

      <MovementFilters
        employees={employees}
        filters={filters}
        lotOptions={lotOptions}
        onChange={updateFilters}
        onClear={clearFilters}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
          <Button className="ml-3" onClick={() => fetchMovements({ manual: true })} size="sm" variant="outline">
            Reintentar
          </Button>
        </div>
      ) : null}

      {selectedVehicleIds.size > 0 ? (
        <section className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm">
          <p className="text-sm font-medium">{selectedVehicleIds.size} coche(s) seleccionado(s)</p>
          <div className="flex gap-2">
            <Button disabled={merging || selectedVehicleIds.size !== 2} onClick={handleMergeSelected}>
              {merging ? "Combinando..." : "Combinar"}
            </Button>
            <Button onClick={() => setSelectedVehicleIds(new Set())} variant="outline">
              Cancelar selección
            </Button>
          </div>
        </section>
      ) : null}

      <MovementCardGrid
        loading={loading}
        movements={movements}
        onDelete={handleDeleteMovement}
        onEdit={openEditMovement}
        onToggleSelect={toggleSelectedVehicle}
        selectedVehicleIds={selectedVehicleIds}
      />

      {hasMore && !loading ? (
        <div className="flex justify-center">
          <Button
            disabled={loadingMore}
            onClick={() => fetchMovements({ append: true, cursorOverride: cursor })}
            variant="outline"
          >
            {loadingMore ? "Cargando..." : "Cargar más"}
          </Button>
        </div>
      ) : null}
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
