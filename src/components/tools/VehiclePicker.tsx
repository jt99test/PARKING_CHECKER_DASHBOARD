"use client";

import { useEffect, useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { searchVehicles } from "@/lib/queries";
import type { Vehicle } from "@/lib/types";

interface VehiclePickerProps {
  placeholder: string;
  excludeId?: string;
  onSelect: (vehicle: Vehicle) => void;
}

export function VehiclePicker({ excludeId, onSelect }: VehiclePickerProps) {
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setVehicles([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchVehicles(query, 20);
        setVehicles(results.filter((vehicle) => vehicle.id !== excludeId));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [excludeId, query]);

  return (
    <div className="space-y-3">
      <SearchBar onChange={setQuery} onClear={() => setQuery("")} value={query} />
      <SearchResults loading={loading} onVehicleClick={onSelect} query={query} vehicles={vehicles} />
    </div>
  );
}
