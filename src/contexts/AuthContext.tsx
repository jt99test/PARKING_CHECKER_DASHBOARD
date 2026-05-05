"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { timestampToDate } from "@/lib/firestore";
import type { AppUser } from "@/lib/types";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getFirebaseClient() {
  if (!auth || !db) {
    throw new Error("Firebase no está disponible en este entorno.");
  }

  return { auth, db };
}

function buildAppUser(uid: string, email: string | null, data: Record<string, unknown>): AppUser {
  return {
    uid,
    email: String(data.email ?? email ?? ""),
    displayName: String(data.displayName ?? ""),
    role: data.role === "manager" ? "manager" : "employee",
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const firebase = getFirebaseClient();
    const unsubscribe = onAuthStateChanged(firebase.auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }

        const userSnapshot = await getDoc(doc(firebase.db, "users", firebaseUser.uid));

        if (!userSnapshot.exists()) {
          setUser(null);
          return;
        }

        setUser(buildAppUser(firebaseUser.uid, firebaseUser.email, userSnapshot.data()));
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const firebase = getFirebaseClient();
    await signInWithEmailAndPassword(firebase.auth, email, password);
  }, []);

  const signOut = useCallback(async () => {
    const firebase = getFirebaseClient();
    await firebaseSignOut(firebase.auth);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
    }),
    [loading, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return context;
}
