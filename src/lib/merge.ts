"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { timestampToDate } from "@/lib/firestore";
import { writeAuditLog } from "@/lib/userManagement";
import type { AppUser, Vehicle } from "@/lib/types";

interface MergeResult {
  transferredMovements: number;
}

function getDb() {
  if (!db) {
    throw new Error("Firestore no está disponible en este entorno.");
  }

  return db;
}

function mapVehicleData(id: string, data: Record<string, unknown>): Vehicle {
  return {
    id,
    plateNumber: (data.plateNumber as string | null) ?? null,
    vin: (data.vin as string | null) ?? null,
    currentLot: String(data.currentLot ?? ""),
    lastMovedAt: timestampToDate(data.lastMovedAt),
    lastMovedBy: String(data.lastMovedBy ?? ""),
    lastMovedByUid: String(data.lastMovedByUid ?? ""),
    totalMoves: Number(data.totalMoves ?? 0),
    firstSeenAt: timestampToDate(data.firstSeenAt),
    brand: (data.brand as string | null) ?? null,
    lastPhotoUrl: (data.lastPhotoUrl as string | null) ?? null,
    wasLinked: Boolean(data.wasLinked ?? false),
    linkedAt: data.linkedAt ? timestampToDate(data.linkedAt) : null,
    linkedBy: (data.linkedBy as string | null) ?? null,
  };
}

function mergedVehicleData(keep: Vehicle, remove: Vehicle, manager: AppUser) {
  const latest = keep.lastMovedAt >= remove.lastMovedAt ? keep : remove;
  const earliest = keep.firstSeenAt <= remove.firstSeenAt ? keep : remove;

  return {
    plateNumber: keep.plateNumber ?? remove.plateNumber,
    vin: keep.vin ?? remove.vin,
    brand: keep.brand ?? remove.brand,
    currentLot: latest.currentLot,
    lastMovedAt: latest.lastMovedAt,
    lastMovedBy: latest.lastMovedBy,
    lastMovedByUid: latest.lastMovedByUid,
    lastPhotoUrl: latest.lastPhotoUrl,
    totalMoves: keep.totalMoves + remove.totalMoves,
    firstSeenAt: earliest.firstSeenAt,
    wasLinked: Boolean(keep.wasLinked || remove.wasLinked),
    wasMerged: true,
    mergedAt: serverTimestamp(),
    mergedBy: manager.displayName || manager.email,
    mergedFromIds: [remove.id],
  };
}

export async function mergeVehicles(
  keepId: string,
  deleteId: string,
  manager: AppUser,
): Promise<MergeResult> {
  const firestore = getDb();
  const keepRef = doc(firestore, "vehicles", keepId);
  const deleteRef = doc(firestore, "vehicles", deleteId);
  const [keepSnapshot, deleteSnapshot, movementSnapshot] = await Promise.all([
    getDoc(keepRef),
    getDoc(deleteRef),
    getDocs(query(collection(firestore, "movements"), where("vehicleId", "==", deleteId))),
  ]);

  if (!keepSnapshot.exists() || !deleteSnapshot.exists()) {
    throw new Error("Uno de los coches ya no existe.");
  }

  const keepVehicle = mapVehicleData(keepSnapshot.id, keepSnapshot.data());
  const deleteVehicle = mapVehicleData(deleteSnapshot.id, deleteSnapshot.data());
  const movementDocs = movementSnapshot.docs;

  if (movementDocs.length <= 497) {
    const batch = writeBatch(firestore);
    batch.update(keepRef, mergedVehicleData(keepVehicle, deleteVehicle, manager));
    movementDocs.forEach((movementDoc) => {
      batch.update(movementDoc.ref, { vehicleId: keepId });
    });
    batch.delete(deleteRef);
    await batch.commit();
  } else {
    for (let index = 0; index < movementDocs.length; index += 500) {
      const batch = writeBatch(firestore);
      movementDocs.slice(index, index + 500).forEach((movementDoc) => {
        batch.update(movementDoc.ref, { vehicleId: keepId });
      });
      await batch.commit();
    }

    await updateDoc(keepRef, mergedVehicleData(keepVehicle, deleteVehicle, manager));
    const finalBatch = writeBatch(firestore);
    finalBatch.delete(deleteRef);
    await finalBatch.commit();
  }

  await writeAuditLog("vehicles_merged", manager, {
    keepId,
    deleteId,
    transferredMovements: movementDocs.length,
  });

  return { transferredMovements: movementDocs.length };
}
