"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3 rounded-lg border bg-card p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            placeholder="Matrícula o VIN"
            value={value}
          />
        </div>
        <Button disabled={!value} onClick={onClear} variant="outline">
          <X className="h-4 w-4" />
          Limpiar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        También puedes escanear desde la app móvil para añadir un coche al sistema.
      </p>
    </div>
  );
}
