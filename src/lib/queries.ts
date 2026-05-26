"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  startAfter,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { GPS_LOT_ALIASES, OTHER_LOT, PARKING_LOTS, RECEPTION_LOT, SOLD_LOT } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { timestampToDate } from "@/lib/firestore";
import { getMovementPhotoUrls } from "@/lib/photos";
import type { AppUser, GeoLocation, Movement, Vehicle } from "@/lib/types";

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

function lotDocId(name: string) {
  return encodeURIComponent(name.trim().toLowerCase());
}

function getDb() {
  if (!db) {
    throw new Error("Firestore no está disponible en este entorno.");
  }

  return db;
}

function isGpsLot(lotName: string) {
  const normalized = lotName.trim().toLowerCase();
  return GPS_LOT_ALIASES.some((alias) => alias.toLowerCase() === normalized);
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readGeoLocation(data: DocumentData): GeoLocation | null {
  const candidates = [
    data.location,
    data.lastLocation,
    data.geoLocation,
    data.gpsLocation,
    data.gps,
    data.geo,
    data.position,
    data.mapLocation,
    data.coordinates,
  ].filter(Boolean) as DocumentData[];

  for (const candidate of candidates) {
    const nestedPoint = candidate.geopoint ?? candidate.geoPoint ?? candidate.point ?? candidate.coordinates;
    const latitude = readNumber(candidate.latitude ?? candidate.lat ?? nestedPoint?.latitude ?? nestedPoint?.lat);
    const longitude = readNumber(
      candidate.longitude ?? candidate.lng ?? candidate.lon ?? nestedPoint?.longitude ?? nestedPoint?.lng ?? nestedPoint?.lon,
    );

    if (latitude !== null && longitude !== null) {
      return {
        latitude,
        longitude,
        label: typeof candidate.label === "string" ? candidate.label : null,
      };
    }
  }

  const latitude = readNumber(data.latitude ?? data.lat ?? data.gpsLatitude);
  const longitude = readNumber(data.longitude ?? data.lng ?? data.lon ?? data.gpsLongitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    latitude,
    longitude,
    label: typeof data.locationLabel === "string" ? data.locationLabel : null,
  };
}

function thirtyDaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date;
}

function mapVehicle(id: string, data: DocumentData): Vehicle {
  const currentLot = String(data.currentLot ?? "");

  return {
    id,
    plateNumber: data.plateNumber ?? null,
    vin: data.vin ?? null,
    currentLot: isGpsLot(currentLot) ? OTHER_LOT : currentLot,
    lastLocation: readGeoLocation(data),
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
  const fromLot = String(data.fromLot ?? "");
  const toLot = String(data.toLot ?? "");
  const photoUrls = getMovementPhotoUrls(data);

  return {
    id,
    vehicleId: String(data.vehicleId ?? ""),
    identifierType: data.identifierType === "vin" ? "vin" : "plate",
    plateNumber: data.plateNumber ?? null,
    vin: data.vin ?? null,
    fromLot: isGpsLot(fromLot) ? OTHER_LOT : fromLot,
    toLot: isGpsLot(toLot) ? OTHER_LOT : toLot,
    employeeId: String(data.employeeId ?? ""),
    employeeName: String(data.employeeName ?? ""),
    timestamp: timestampToDate(data.timestamp),
    notes: data.notes ?? null,
    photoUrl: String(data.photoUrl ?? ""),
    photoUrls,
    location: readGeoLocation(data),
    hadDiscrepancy: Boolean(data.hadDiscrepancy ?? false),
    systemFromLot: data.systemFromLot ?? null,
    declaredFromLot: data.declaredFromLot ?? null,
    discrepancyReason: data.discrepancyReason ?? null,
    discrepancyDetails: data.discrepancyDetails ?? null,
  };
}

export async function getInventoryCounts(): Promise<InventoryCounts> {
  const firestore = getDb();
  const lotNames = [...PARKING_LOTS, RECEPTION_LOT, OTHER_LOT, SOLD_LOT];
  const [vehiclesSnapshot, managedLotsSnapshot] = await Promise.all([
    getDocs(collection(firestore, "vehicles")),
    getDocs(collection(firestore, "managed_lots")),
  ]);
  const counts: InventoryCounts = {};

  lotNames.forEach((lotName) => {
    counts[lotName] = 0;
  });

  managedLotsSnapshot.docs.forEach((lotDoc) => {
    const lotName = String(lotDoc.data().name ?? "");

    if (lotName) {
      counts[lotName] = counts[lotName] ?? 0;
    }
  });

  vehiclesSnapshot.docs.forEach((vehicleDoc) => {
    const data = vehicleDoc.data();
    const lotName = readGeoLocation(data) || isGpsLot(String(data.currentLot ?? ""))
      ? OTHER_LOT
      : String(data.currentLot ?? "");

    if (!lotName) {
      return;
    }

    counts[lotName] = (counts[lotName] ?? 0) + 1;
  });

  return counts;
}

export async function addManagedLot(name: string): Promise<void> {
  const firestore = getDb();
  const normalizedName = name.trim();

  if (!normalizedName) {
    return;
  }

  await setDoc(doc(firestore, "managed_lots", lotDocId(normalizedName)), {
    name: normalizedName,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteManagedLot(name: string): Promise<void> {
  const firestore = getDb();
  const normalizedName = name.trim();

  if (!normalizedName) {
    return;
  }

  const vehiclesSnapshot = await getDocs(
    query(collection(firestore, "vehicles"), where("currentLot", "==", normalizedName), firestoreLimit(1)),
  );

  if (!vehiclesSnapshot.empty) {
    throw new Error("LOT_NOT_EMPTY");
  }

  await deleteDoc(doc(firestore, "managed_lots", lotDocId(normalizedName)));
}

export async function renameLot(oldName: string, newName: string): Promise<{ vehicles: number; movements: number }> {
  const firestore = getDb();
  const normalizedOldName = oldName.trim();
  const normalizedNewName = newName.trim();

  if (!normalizedOldName || !normalizedNewName || normalizedOldName === normalizedNewName) {
    return { vehicles: 0, movements: 0 };
  }

  const oldLotRef = doc(firestore, "managed_lots", lotDocId(normalizedOldName));
  const newLotRef = doc(firestore, "managed_lots", lotDocId(normalizedNewName));
  const oldLotSnapshot = await getDoc(oldLotRef);
  let vehicleUpdates = 0;
  let movementUpdates = 0;
  let batch = writeBatch(firestore);
  let operations = 0;

  async function commitIfNeeded(force = false) {
    if (operations === 0 || (!force && operations < 450)) {
      return;
    }

    await batch.commit();
    batch = writeBatch(firestore);
    operations = 0;
  }

  const vehiclesSnapshot = await getDocs(
    query(collection(firestore, "vehicles"), where("currentLot", "==", normalizedOldName)),
  );

  for (const vehicleDoc of vehiclesSnapshot.docs) {
    batch.update(vehicleDoc.ref, { currentLot: normalizedNewName });
    vehicleUpdates += 1;
    operations += 1;
    await commitIfNeeded();
  }

  const [fromMovementsSnapshot, toMovementsSnapshot] = await Promise.all([
    getDocs(query(collection(firestore, "movements"), where("fromLot", "==", normalizedOldName))),
    getDocs(query(collection(firestore, "movements"), where("toLot", "==", normalizedOldName))),
  ]);

  for (const movementDoc of fromMovementsSnapshot.docs) {
    batch.update(movementDoc.ref, { fromLot: normalizedNewName });
    movementUpdates += 1;
    operations += 1;
    await commitIfNeeded();
  }

  for (const movementDoc of toMovementsSnapshot.docs) {
    batch.update(movementDoc.ref, { toLot: normalizedNewName });
    movementUpdates += 1;
    operations += 1;
    await commitIfNeeded();
  }

  if (oldLotSnapshot.exists()) {
    batch.delete(oldLotRef);
    operations += 1;
    await commitIfNeeded();
  }

  batch.set(newLotRef, {
    name: normalizedNewName,
    createdAt: oldLotSnapshot.data()?.createdAt ?? Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  operations += 1;

  await commitIfNeeded(true);

  return { vehicles: vehicleUpdates, movements: movementUpdates };
}

async function rebuildVehicleSummary(vehicleId: string) {
  const firestore = getDb();
  const vehicleRef = doc(firestore, "vehicles", vehicleId);
  const snapshot = await getDocs(
    query(collection(firestore, "movements"), where("vehicleId", "==", vehicleId)),
  );
  const movements = snapshot.docs
    .map((movementDoc) => mapMovement(movementDoc.id, movementDoc.data()))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (movements.length === 0) {
    await deleteDoc(vehicleRef);
    return;
  }

  const latest = movements[0];
  const oldest = movements.at(-1) ?? latest;

  await setDoc(
    vehicleRef,
    {
      plateNumber: latest.plateNumber,
      vin: latest.vin,
      currentLot: latest.toLot,
      lastMovedAt: Timestamp.fromDate(latest.timestamp),
      lastMovedBy: latest.employeeName,
      lastMovedByUid: latest.employeeId,
      totalMoves: movements.length,
      firstSeenAt: Timestamp.fromDate(oldest.timestamp),
      lastPhotoUrl: getMovementPhotoUrls(latest)[0] ?? null,
      lastLocation: latest.location,
    },
    { merge: true },
  );
}

export async function deleteMovement(movement: Movement): Promise<void> {
  await deleteDoc(doc(getDb(), "movements", movement.id));
  await rebuildVehicleSummary(movement.vehicleId);
}

export async function updateMovement(
  movement: Movement,
  updates: Pick<Movement, "fromLot" | "toLot" | "notes">,
): Promise<void> {
  await updateDoc(doc(getDb(), "movements", movement.id), {
    fromLot: updates.fromLot,
    toLot: updates.toLot,
    notes: updates.notes,
  });
  await rebuildVehicleSummary(movement.vehicleId);
}

export async function getVehiclesInLot(
  lotName: string,
  options: LotOptions = {},
): Promise<Vehicle[]> {
  const firestore = getDb();

  if (lotName === OTHER_LOT) {
    const snapshot = await getDocs(collection(firestore, "vehicles"));
    const vehicles = snapshot.docs
      .map((vehicleDoc) => mapVehicle(vehicleDoc.id, vehicleDoc.data()))
      .filter((vehicle) => vehicle.currentLot === OTHER_LOT || Boolean(vehicle.lastLocation));

    return vehicles.sort((a, b) => b.lastMovedAt.getTime() - a.lastMovedAt.getTime());
  }

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

export async function getLatestMovementForVehicle(vehicleId: string): Promise<Movement | null> {
  const movements = await getMovementsForVehicle(vehicleId);
  return movements[0] ?? null;
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
