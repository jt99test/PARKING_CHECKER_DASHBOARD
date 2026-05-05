"use client";

import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, firebaseConfig } from "@/lib/firebase";
import type { AppUser, UserRole } from "@/lib/types";

interface NewUserInput {
  email: string;
  displayName: string;
  password: string;
  role: UserRole;
  performedBy: AppUser;
}

function getDb() {
  if (!db) {
    throw new Error("Firestore no está disponible en este entorno.");
  }

  return db;
}

function secondaryAuth() {
  const app = initializeApp(firebaseConfig, `Secondary-${Date.now()}`);
  return getAuth(app);
}

export async function writeAuditLog(
  action: string,
  performedBy: AppUser,
  details: Record<string, unknown>,
) {
  await addDoc(collection(getDb(), "audit_log"), {
    action,
    performedBy: {
      uid: performedBy.uid,
      email: performedBy.email,
      displayName: performedBy.displayName,
    },
    performedAt: serverTimestamp(),
    details,
  });
}

export async function createNewUser({
  email,
  displayName,
  password,
  role,
  performedBy,
}: NewUserInput) {
  const auth = secondaryAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  await setDoc(doc(getDb(), "users", credential.user.uid), {
    uid: credential.user.uid,
    email,
    displayName,
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog("user_created", performedBy, {
    uid: credential.user.uid,
    email,
    displayName,
    role,
  });

  await signOut(auth);
  return credential.user.uid;
}

export async function changeUserRole(
  targetUser: AppUser,
  newRole: UserRole,
  performedBy: AppUser,
) {
  await updateDoc(doc(getDb(), "users", targetUser.uid), {
    role: newRole,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog("role_changed", performedBy, {
    uid: targetUser.uid,
    email: targetUser.email,
    previousRole: targetUser.role,
    newRole,
  });
}
