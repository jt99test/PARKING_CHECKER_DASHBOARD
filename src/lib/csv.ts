import { formatDateForFile, formatDateTime, formatTimeAgo } from "@/lib/date";
import type { Movement, Vehicle } from "@/lib/types";

const headers = [
  "Matrícula",
  "VIN",
  "Marca",
  "Lote actual",
  "Movido hace",
  "Movido por",
  "Movimientos totales",
];

function escapeCsvValue(value: string | number) {
  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function normalizeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildInventoryCsv(vehicles: Vehicle[]) {
  const rows = vehicles.map((vehicle) => [
    vehicle.plateNumber ?? "",
    vehicle.vin ?? "",
    vehicle.brand ?? "",
    vehicle.currentLot,
    `${formatTimeAgo(vehicle.lastMovedAt)} (${formatDateTime(vehicle.lastMovedAt)})`,
    vehicle.lastMovedBy,
    vehicle.totalMoves,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}

export function downloadInventoryCsv(lotName: string, vehicles: Vehicle[]) {
  const csv = `\uFEFF${buildInventoryCsv(vehicles)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `inventario_${normalizeFilenamePart(lotName)}_${formatDateForFile(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildActivityCsv(movements: Movement[]) {
  const activityHeaders = [
    "Fecha",
    "Hora",
    "Matrícula",
    "VIN",
    "Origen",
    "Destino",
    "Empleado",
    "Notas",
    "Discrepancia",
    "Motivo discrepancia",
  ];

  const rows = movements.map((movement) => {
    const [date, time] = formatDateTime(movement.timestamp).split(" ");

    return [
      date,
      time,
      movement.plateNumber ?? "",
      movement.vin ?? "",
      movement.fromLot,
      movement.toLot,
      movement.employeeName,
      movement.notes ?? "",
      movement.hadDiscrepancy ? "Sí" : "No",
      movement.discrepancyReason ?? movement.discrepancyDetails ?? "",
    ];
  });

  return [activityHeaders, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}

export function downloadActivityCsv(movements: Movement[]) {
  const csv = `\uFEFF${buildActivityCsv(movements)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `actividad_${formatDateForFile(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadAllVehiclesCsv(vehicles: Vehicle[]) {
  const fullHeaders = [
    "id",
    "plateNumber",
    "vin",
    "brand",
    "currentLot",
    "totalMoves",
    "firstSeenAt",
    "lastMovedAt",
    "lastMovedBy",
    "wasLinked",
    "wasMerged",
  ];
  const rows = vehicles.map((vehicle) => [
    vehicle.id,
    vehicle.plateNumber ?? "",
    vehicle.vin ?? "",
    vehicle.brand ?? "",
    vehicle.currentLot,
    vehicle.totalMoves,
    formatDateTime(vehicle.firstSeenAt),
    formatDateTime(vehicle.lastMovedAt),
    vehicle.lastMovedBy,
    vehicle.wasLinked ? "Sí" : "No",
    vehicle.wasMerged ? "Sí" : "No",
  ]);
  const csv = `\uFEFF${[fullHeaders, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `coches_completo_${formatDateForFile(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadAllMovementsCsv(movements: Movement[]) {
  const csv = `\uFEFF${buildActivityCsv(movements)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `movimientos_completo_${formatDateForFile(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
