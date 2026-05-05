"use client";

import { endOfDay, startOfDay, subDays } from "date-fns";
import { Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DiscrepancyTable } from "@/components/tools/DiscrepancyTable";
import { Button } from "@/components/ui/button";
import { downloadActivityCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import { getDiscrepancies, getUniqueEmployees } from "@/lib/queries";
import type { Movement } from "@/lib/types";

type Period = "ultimos-30-dias" | "ultimos-7-dias" | "hoy";

function rangeForPeriod(period: Period) {
  const now = new Date();
  if (period === "hoy") return { startDate: startOfDay(now), endDate: endOfDay(now) };
  if (period === "ultimos-7-dias") return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) };
  return { startDate: startOfDay(subDays(now, 29)), endDate: endOfDay(now) };
}

export default function DiscrepanciesPage() {
  const [period, setPeriod] = useState<Period>("ultimos-30-dias");
  const [employee, setEmployee] = useState("");
  const [employees, setEmployees] = useState<string[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const range = rangeForPeriod(period);
    try {
      const results = await getDiscrepancies({
        ...range,
        employeeName: employee || undefined,
      });
      setMovements(results);
    } finally {
      setLoading(false);
    }
  }, [employee, period]);

  useEffect(() => {
    getUniqueEmployees().then(setEmployees).catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Discrepancias</h1>
          <p className="mt-2 text-muted-foreground">{formatNumber(movements.length)} movimientos con discrepancia</p>
        </div>
        <div className="flex gap-3">
          <Button disabled={loading} onClick={refresh} variant="outline">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button disabled={movements.length === 0} onClick={() => downloadActivityCsv(movements)}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </section>
      <section className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Período</span>
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" onChange={(event) => setPeriod(event.target.value as Period)} value={period}>
            <option value="ultimos-30-dias">Últimos 30 días</option>
            <option value="ultimos-7-dias">Últimos 7 días</option>
            <option value="hoy">Hoy</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Empleado</span>
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" onChange={(event) => setEmployee(event.target.value)} value={employee}>
            <option value="">Todos</option>
            {employees.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </section>
      {loading ? <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">Cargando...</div> : <DiscrepancyTable movements={movements} />}
    </div>
  );
}
