"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (range: { startDate: Date; endDate: Date }) => void;
}

function toInputDate(date: Date) {
  return format(date, "yyyy-MM-dd", { locale: es });
}

function withDayEnd(dateValue: string) {
  const date = new Date(`${dateValue}T23:59:59`);
  return date;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  return (
    <div className="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label className="flex items-center gap-2" htmlFor="start-date">
          <CalendarDays className="h-4 w-4" />
          Desde
        </Label>
        <Input
          id="start-date"
          onChange={(event) =>
            onChange({
              startDate: new Date(`${event.target.value}T00:00:00`),
              endDate,
            })
          }
          type="date"
          value={toInputDate(startDate)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end-date">Hasta</Label>
        <Input
          id="end-date"
          onChange={(event) =>
            onChange({
              startDate,
              endDate: withDayEnd(event.target.value),
            })
          }
          type="date"
          value={toInputDate(endDate)}
        />
      </div>
    </div>
  );
}
