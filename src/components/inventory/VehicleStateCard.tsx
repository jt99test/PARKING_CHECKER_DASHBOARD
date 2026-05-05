import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatTimeAgo } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

export function VehicleStateCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="space-y-5 p-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Actualmente en
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{vehicle.currentLot}</h1>
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Matrícula:</span> {vehicle.plateNumber ?? "—"}
          </p>
          <p>
            <span className="font-medium">VIN:</span>{" "}
            <span className="font-mono">{vehicle.vin ?? "—"}</span>
          </p>
          <p>
            <span className="font-medium">Marca:</span> {vehicle.brand ?? "—"}
          </p>
          <p>
            Movido {formatTimeAgo(vehicle.lastMovedAt)} por {vehicle.lastMovedBy || "—"}
          </p>
          <p>
            <span className="font-medium">Movimientos totales:</span> {formatNumber(vehicle.totalMoves)}
          </p>
          <p>
            <span className="font-medium">Primer registro:</span>{" "}
            {formatDateTime(vehicle.firstSeenAt)}
          </p>
        </div>

        {vehicle.wasLinked ? (
          <span className="inline-flex rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            Vinculado
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
