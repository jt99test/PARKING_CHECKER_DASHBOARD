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
    <div className="flex gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9 text-base"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder="Matricula o VIN"
          value={value}
        />
      </div>
      <Button className="h-11" disabled={!value} onClick={onClear} variant="outline">
        <X className="h-4 w-4" />
        Limpiar
      </Button>
    </div>
  );
}
