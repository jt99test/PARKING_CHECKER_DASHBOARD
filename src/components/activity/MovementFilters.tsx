"use client";

import { PARKING_LOTS, RECEPTION_LOT, SOLD_LOT } from "@/lib/constants";
import { DateRangePicker } from "@/components/date-range-picker";

export type PeriodOption = "hoy" | "ayer" | "ultimos-7-dias" | "este-mes" | "personalizado";

export interface MovementFilterState {
  period: PeriodOption;
  lot: string;
  employee: string;
  identifierType: string;
  discrepanciesOnly: boolean;
  startDate: Date;
  endDate: Date;
}

interface MovementFiltersProps {
  filters: MovementFilterState;
  employees: string[];
  onChange: (filters: MovementFilterState) => void;
  onClear: () => void;
}

const lots = [...PARKING_LOTS, RECEPTION_LOT, SOLD_LOT];

export function MovementFilters({
  filters,
  employees,
  onChange,
  onClear,
}: MovementFiltersProps) {
  return (
    <div className="sticky top-16 z-30 space-y-3 rounded-lg border bg-card/95 p-4 shadow-sm backdrop-blur">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Período</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) =>
              onChange({ ...filters, period: event.target.value as PeriodOption })
            }
            value={filters.period}
          >
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="ultimos-7-dias">Últimos 7 días</option>
            <option value="este-mes">Este mes</option>
            <option value="personalizado">Personalizado...</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Lote</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => onChange({ ...filters, lot: event.target.value })}
            value={filters.lot}
          >
            <option value="">Todos</option>
            {lots.map((lot) => (
              <option key={lot} value={lot}>
                {lot}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Empleado</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => onChange({ ...filters, employee: event.target.value })}
            value={filters.employee}
          >
            <option value="">Todos</option>
            {employees.map((employee) => (
              <option key={employee} value={employee}>
                {employee}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Tipo</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => onChange({ ...filters, identifierType: event.target.value })}
            value={filters.identifierType}
          >
            <option value="">Todos</option>
            <option value="plate">Matrícula</option>
            <option value="vin">VIN</option>
          </select>
        </label>

        <div className="flex items-end justify-between gap-3">
          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              checked={filters.discrepanciesOnly}
              className="h-4 w-4 accent-primary"
              onChange={(event) =>
                onChange({ ...filters, discrepanciesOnly: event.target.checked })
              }
              type="checkbox"
            />
            Solo discrepancias
          </label>
          <button className="text-sm font-medium text-primary hover:underline" onClick={onClear} type="button">
            Limpiar
          </button>
        </div>
      </div>

      {filters.period === "personalizado" ? (
        <DateRangePicker
          endDate={filters.endDate}
          onChange={(range) =>
            onChange({
              ...filters,
              period: "personalizado",
              startDate: range.startDate,
              endDate: range.endDate,
            })
          }
          startDate={filters.startDate}
        />
      ) : null}
    </div>
  );
}
