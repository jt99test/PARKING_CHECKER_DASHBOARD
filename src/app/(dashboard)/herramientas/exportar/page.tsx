"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { downloadAllMovementsCsv, downloadAllVehiclesCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import { getAllMovementsForExport, getAllVehiclesForExport } from "@/lib/queries";

export default function ExportToolPage() {
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);

  async function exportVehicles() {
    setExporting(true);
    setStatus("Generando CSV...");
    try {
      const vehicles = await getAllVehiclesForExport();
      setStatus(`Generando CSV... ${formatNumber(vehicles.length)} de ${formatNumber(vehicles.length)} registros procesados`);
      downloadAllVehiclesCsv(vehicles);
    } finally {
      setExporting(false);
    }
  }

  async function exportMovements() {
    setExporting(true);
    setStatus("Generando CSV...");
    try {
      const movements = await getAllMovementsForExport();
      setStatus(`Generando CSV... ${formatNumber(movements.length)} de ${formatNumber(movements.length)} registros procesados`);
      if (movements.length > 5000) {
        setStatus(`Aviso: ${formatNumber(movements.length)} movimientos. El CSV puede tardar un poco.`);
      }
      downloadAllMovementsCsv(movements);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Exportar todo</h1>
        <p className="mt-2 text-muted-foreground">Descarga copias completas en CSV.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">Exportar todos los coches a CSV</h2>
            <p className="text-sm text-muted-foreground">Incluye identificadores, lote, fechas y estado de vinculación.</p>
            <Button disabled={exporting} onClick={exportVehicles}>
              <Download className="h-4 w-4" />
              Exportar coches
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">Exportar todos los movimientos a CSV</h2>
            <p className="text-sm text-muted-foreground">Incluye fecha, origen, destino, empleado y discrepancias.</p>
            <Button disabled={exporting} onClick={exportMovements}>
              <Download className="h-4 w-4" />
              Exportar movimientos
            </Button>
          </CardContent>
        </Card>
      </section>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
