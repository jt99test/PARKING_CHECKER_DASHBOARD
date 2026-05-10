"use client";

import { ArrowLeft, Plus, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { addManagedLot, getInventoryCounts, renameLot, type InventoryCounts } from "@/lib/queries";

export default function LotsToolPage() {
  const [counts, setCounts] = useState<InventoryCounts>({});
  const [selectedLot, setSelectedLot] = useState("");
  const [newLotName, setNewLotName] = useState("");
  const [lotToAdd, setLotToAdd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const lots = useMemo(() => {
    return Object.keys(counts)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [counts]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const nextCounts = await getInventoryCounts();
      setCounts(nextCounts);
      setSelectedLot((current) => current || Object.keys(nextCounts).filter(Boolean).sort()[0] || "");
    } catch {
      setError("No se pudieron cargar los lotes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRename() {
    const oldName = selectedLot.trim();
    const nextName = newLotName.trim();

    if (!oldName || !nextName || oldName === nextName) {
      setError("Elige un lote y escribe un nombre nuevo.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await renameLot(oldName, nextName);
      setMessage(
        `Lote renombrado: ${formatNumber(result.vehicles)} coches y ${formatNumber(result.movements)} movimientos actualizados.`,
      );
      setNewLotName("");
      setSelectedLot(nextName);
      await refresh();
    } catch {
      setError("No se pudo renombrar el lote. Revisa permisos y vuelve a intentar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLot() {
    const nextName = lotToAdd.trim();

    if (!nextName) {
      setError("Escribe el nombre del lote nuevo.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await addManagedLot(nextName);
      setMessage(`Lote nuevo creado: ${nextName}.`);
      setLotToAdd("");
      setSelectedLot(nextName);
      await refresh();
    } catch {
      setError("No se pudo crear el lote. Revisa permisos y vuelve a intentar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/herramientas">
        <ArrowLeft className="h-4 w-4" />
        Herramientas
      </Link>

      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Gestionar lotes</h1>
        <p className="mt-2 text-muted-foreground">Crea lotes nuevos o renombra lotes existentes.</p>
      </section>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm font-medium text-accent">
          {message}
        </div>
      ) : null}

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Añadir lote nuevo</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Nombre del lote</span>
            <Input
              className="h-11"
              disabled={saving}
              onChange={(event) => setLotToAdd(event.target.value)}
              placeholder="Ej. Garaje nuevo"
              value={lotToAdd}
            />
          </label>
          <Button disabled={saving || !lotToAdd.trim()} onClick={handleAddLot}>
            <Plus className="h-4 w-4" />
            Añadir lote
          </Button>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Renombrar lote</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Lote actual</span>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={loading || saving}
              onChange={(event) => setSelectedLot(event.target.value)}
              value={selectedLot}
            >
              {lots.map((lot) => (
                <option key={lot} value={lot}>
                  {lot} ({formatNumber(counts[lot] ?? 0)})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Nombre nuevo</span>
            <Input
              className="h-11"
              disabled={saving}
              onChange={(event) => setNewLotName(event.target.value)}
              placeholder="Ej. Patio principal"
              value={newLotName}
            />
          </label>

          <div className="flex gap-3">
            <Button disabled={loading || saving} onClick={refresh} variant="outline">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button disabled={loading || saving || !selectedLot || !newLotName.trim()} onClick={handleRename}>
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
