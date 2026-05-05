"use client";

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { PARKING_LOTS, RECEPTION_LOT, SOLD_LOT } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { timestampToDate } from "@/lib/firestore";
import type { AppUser, Movement, Vehicle } from "@/lib/types";

export type InventoryCounts = Record<string, number>;

export interface ActivityFilters {
  startDate: Date;
  endDate: Date;
  lot?: string;
  employeeName?: string;
  identifierType?: "plate" | "vin";
  discrepanciesOnly?: boolean;
}

export interface MovementsPage {
  movements: Movement[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface UserStats {
  movementCount: number;
  lastActivityAt: Date | null;
}

interface LotOptions {
  last30DaysOnly?: boolean;
}

function getDb() {
  if (!db) {
    throw new Error("Firestore no está disponible en este entorno.");
  }

  return db;
}

function thirtyDaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date;
}

function mapVehicle(id: string, data: DocumentData): Vehicle {
  return {
    id,
    plateNumber: data.plateNumber ?? null,
    vin: data.vin ?? null,
    currentLot: String(data.currentLot ?? ""),
    lastMovedAt: timestampToDate(data.lastMovedAt),
    lastMovedBy: String(data.lastMovedBy ?? ""),
    lastMovedByUid: String(data.lastMovedByUid ?? ""),
    totalMoves: Number(data.totalMoves ?? 0),
    firstSeenAt: timestampToDate(data.firstSeenAt),
    brand: data.brand ?? null,
    lastPhotoUrl: data.lastPhotoUrl ?? null,
    wasLinked: Boolean(data.wasLinked ?? false),
    linkedAt: data.linkedAt ? timestampToDate(data.linkedAt) : null,
    linkedBy: data.linkedBy ?? null,
    wasMerged: Boolean(data.wasMerged ?? false),
    mergedAt: data.mergedAt ? timestampToDate(data.mergedAt) : null,
    mergedBy: data.mergedBy ?? null,
    mergedFromIds: Array.isArray(data.mergedFromIds) ? data.mergedFromIds : [],
  };
}

function mapAppUser(id: string, data: DocumentData): AppUser {
  return {
    uid: String(data.uid ?? id),
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    role: data.role === "manager" ? "manager" : "employee",
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

function mapMovement(id: string, data: DocumentData): Movement {
  return {
    id,
    vehicleId: String(data.vehicleId ?? ""),
    identifierType: data.identifierType === "vin" ? "vin" : "plate",
    plateNumber: data.plateNumber ?? null,
    vin: data.vin ?? null,
    fromLot: String(data.fromLot ?? ""),
    toLot: String(data.toLot ?? ""),
    employeeId: String(data.employeeId ?? ""),
    employeeName: String(data.employeeName ?? ""),
    timestamp: timestampToDate(data.timestamp),
    notes: data.notes ?? null,
    photoUrl: String(data.photoUrl ?? ""),
    hadDiscrepancy: Boolean(data.hadDiscrepancy ?? false),
    systemFromLot: data.systemFromLot ?? null,
    declaredFromLot: data.declaredFromLot ?? null,
    discrepancyReason: data.discrepancyReason ?? null,
    discrepancyDetails: data.discrepancyDetails ?? null,
  };
}

export async function getInventoryCounts(): Promise<InventoryCounts> {
  const firestore = getDb();
  const vehicles = collection(firestore, "vehicles");
  const lotNames = [...PARKING_LOTS, RECEPTION_LOT, SOLD_LOT];

  const entries = await Promise.all(
    lotNames.map(async (lotName) => {
      const snapshot = await getCountFromServer(
        query(vehicles, where("currentLot", "==", lotName)),
      );

      return [lotName, snapshot.data().count] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function getVehiclesInLot(
  lotName: string,
  options: LotOptions = {},
): Promise<Vehicle[]> {
  const firestore = getDb();
  const constraints = [where("currentLot", "==", lotName)];

  if (lotName === SOLD_LOT && options.last30DaysOnly) {
    constraints.push(where("lastMovedAt", ">", Timestamp.fromDate(thirtyDaysAgo())));
  }

  const snapshot = await getDocs(query(collection(firestore, "vehicles"), ...constraints));
  const vehicles = snapshot.docs.map((vehicleDoc) => mapVehicle(vehicleDoc.id, vehicleDoc.data()));

  return vehicles.sort((a, b) => b.lastMovedAt.getTime() - a.lastMovedAt.getTime());
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const snapshot = await getDoc(doc(getDb(), "vehicles", id));

  if (!snapshot.exists()) {
    return null;
  }

  return mapVehicle(snapshot.id, snapshot.data());
}

export async function getMovementsForVehicle(vehicleId: string): Promise<Movement[]> {
  const snapshot = await getDocs(
    query(
      collection(getDb(), "movements"),
      where("vehicleId", "==", vehicleId),
    ),
  );

  return snapshot.docs
    .map((movementDoc) => mapMovement(movementDoc.id, movementDoc.data()))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function matchesActivityFilters(movement: Movement, filters: ActivityFilters) {
  const matchesLot =
    !filters.lot || movement.fromLot === filters.lot || movement.toLot === filters.lot;
  const matchesEmployee =
    !filters.employeeName || movement.employeeName === filters.employeeName;
  const matchesIdentifier =
    !filters.identifierType || movement.identifierType === filters.identifierType;
  const matchesDiscrepancy = !filters.discrepanciesOnly || movement.hadDiscrepancy;

  return matchesLot && matchesEmployee && matchesIdentifier && matchesDiscrepancy;
}

export async function getMovements(
  filters: ActivityFilters,
  pageSize: number,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
): Promise<MovementsPage> {
  const constraints: QueryConstraint[] = [
    where("timestamp", ">=", Timestamp.fromDate(filters.startDate)),
    where("timestamp", "<=", Timestamp.fromDate(filters.endDate)),
    orderBy("timestamp", "desc"),
    firestoreLimit(pageSize * 4),
  ];

  if (cursor) {
    constraints.splice(3, 0, startAfter(cursor));
  }

  const snapshot = await getDocs(query(collection(getDb(), "movements"), ...constraints));
  const filteredMovements = snapshot.docs
    .map((movementDoc) => mapMovement(movementDoc.id, movementDoc.data()))
    .filter((movement) => matchesActivityFilters(movement, filters))
    .slice(0, pageSize);

  return {
    movements: filteredMovements,
    cursor: snapshot.docs.at(-1) ?? null,
    hasMore: snapshot.docs.length === pageSize * 4,
  };
}

export async function getUniqueEmployees(): Promise<string[]> {
  const snapshot = await getDocs(collection(getDb(), "movements"));
  const employees = new Set<string>();

  snapshot.docs.forEach((movementDoc) => {
    const employeeName = movementDoc.data().employeeName;

    if (typeof employeeName === "string" && employeeName.trim()) {
      employees.add(employeeName.trim());
    }
  });

  return [...employees].sort((a, b) => a.localeCompare(b, "es"));
}

export async function searchVehicles(searchQuery: string, resultLimit: number): Promise<Vehicle[]> {
  const normalizedQuery = searchQuery.trim().toUpperCase();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const end = `${normalizedQuery}\uf8ff`;
  const vehiclesCollection = collection(getDb(), "vehicles");
  const [plateSnapshot, vinSnapshot] = await Promise.all([
    getDocs(
      query(
        vehiclesCollection,
        where("plateNumber", ">=", normalizedQuery),
        where("plateNumber", "<", end),
        orderBy("plateNumber"),
        firestoreLimit(resultLimit),
      ),
    ),
    getDocs(
      query(
        vehiclesCollection,
        where("vin", ">=", normalizedQuery),
        where("vin", "<", end),
        orderBy("vin"),
        firestoreLimit(resultLimit),
      ),
    ),
  ]);

  const vehicleMap = new Map<string, Vehicle>();

  [...plateSnapshot.docs, ...vinSnapshot.docs].forEach((vehicleDoc) => {
    vehicleMap.set(vehicleDoc.id, mapVehicle(vehicleDoc.id, vehicleDoc.data()));
  });

  return [...vehicleMap.values()]
    .sort((a, b) => {
      const aExact = a.plateNumber === normalizedQuery || a.vin === normalizedQuery;
      const bExact = b.plateNumber === normalizedQuery || b.vin === normalizedQuery;

      if (aExact !== bExact) {
        return aExact ? -1 : 1;
      }

      return (a.plateNumber ?? a.vin ?? "").localeCompare(b.plateNumber ?? b.vin ?? "", "es");
    })
    .slice(0, resultLimit);
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(collection(getDb(), "users"));

  return snapshot.docs
    .map((userDoc) => mapAppUser(userDoc.id, userDoc.data()))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
}

export async function getUserStats(users: AppUser[]): Promise<Record<string, UserStats>> {
  const movementsSnapshot = await getDocs(collection(getDb(), "movements"));
  const userIds = new Set(users.map((user) => user.uid));
  const stats: Record<string, UserStats> = {};

  users.forEach((user) => {
    stats[user.uid] = { movementCount: 0, lastActivityAt: null };
  });

  movementsSnapshot.docs.forEach((movementDoc) => {
    const data = movementDoc.data();
    const employeeId = String(data.employeeId ?? "");

    if (!userIds.has(employeeId)) {
      return;
    }

    const timestamp = timestampToDate(data.timestamp);
    const currentStats = stats[employeeId];
    currentStats.movementCount += 1;

    if (!currentStats.lastActivityAt || timestamp > currentStats.lastActivityAt) {
      currentStats.lastActivityAt = timestamp;
    }
  });

  return stats;
}

export async function getDiscrepancies(filters: {
  startDate: Date;
  endDate: Date;
  employeeName?: string;
}): Promise<Movement[]> {
  const snapshot = await getDocs(
    query(
      collection(getDb(), "movements"),
      where("timestamp", ">=", Timestamp.fromDate(filters.startDate)),
      where("timestamp", "<=", Timestamp.fromDate(filters.endDate)),
      orderBy("timestamp", "desc"),
      firestoreLimit(1000),
    ),
  );

  return snapshot.docs
    .map((movementDoc) => mapMovement(movementDoc.id, movementDoc.data()))
    .filter((movement) => {
      const matchesEmployee = !filters.employeeName || movement.employeeName === filters.employeeName;
      return movement.hadDiscrepancy && matchesEmployee;
    });
}

export async function getAllVehiclesForExport(): Promise<Vehicle[]> {
  const snapshot = await getDocs(collection(getDb(), "vehicles"));
  return snapshot.docs.map((vehicleDoc) => mapVehicle(vehicleDoc.id, vehicleDoc.data()));
}

export async function getAllMovementsForExport(): Promise<Movement[]> {
  const snapshot = await getDocs(collection(getDb(), "movements"));
  return snapshot.docs
    .map((movementDoc) => mapMovement(movementDoc.id, movementDoc.data()))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
