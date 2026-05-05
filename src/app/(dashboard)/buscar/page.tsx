"use client";

import { useEffect, useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { searchVehicles } from "@/lib/queries";
import type { Vehicle } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.trim().length < 2) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const results = await searchVehicles(query, 20);
        setVehicles(results);
      } catch {
        setError("No se pudo cargar la información. Inténtalo de nuevo.");
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Buscar coche</h1>
      </section>

      <SearchBar onChange={setQuery} onClear={() => setQuery("")} value={query} />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <SearchResults loading={loading} query={query} vehicles={vehicles} />
    </div>
  );
}
