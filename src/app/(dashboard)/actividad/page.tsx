"use client";

import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Download, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MovementFilters, type MovementFilterState, type PeriodOption } from "@/components/activity/MovementFilters";
import { MovementTable } from "@/components/activity/MovementTable";
import { Button } from "@/components/ui/button";
import { downloadActivityCsv } from "@/lib/csv";
import { formatTimeAgo } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { getMovements, getUniqueEmployees, type ActivityFilters, type MovementsPage } from "@/lib/queries";
import type { Movement } from "@/lib/types";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<MovementFilterState>(() => initialFilters(searchParams));
  const [employees, setEmployees] = useState<string[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cursor, setCursor] = useState<MovementsPage["cursor"]>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());

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
    getUniqueEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

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

  return (
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

      <MovementFilters
        employees={employees}
        filters={filters}
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

      <MovementTable loading={loading} movements={movements} />

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
  );
}
