"use client";

import { FirebaseError } from "firebase/app";
import { Copy, Wand2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createNewUser } from "@/lib/userManagement";
import type { AppUser, UserRole } from "@/lib/types";

interface NewUserDialogProps {
  open: boolean;
  currentUser: AppUser;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  onSuccess: (message: string) => void;
}

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function authErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/email-already-in-use") {
      return "Este correo ya está en uso.";
    }

    if (error.code === "auth/weak-password") {
      return "La contraseña es demasiado débil.";
    }

    if (error.code === "auth/invalid-email") {
      return "El correo no es válido.";
    }
  }

  return "No se pudo crear el usuario. Inténtalo de nuevo.";
}

export function NewUserDialog({
  open,
  currentUser,
  onOpenChange,
  onCreated,
  onSuccess,
}: NewUserDialogProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [error, setError] = useState("");
  const [createdPassword, setCreatedPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (displayName.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña temporal debe tener al menos 6 caracteres.");
      return;
    }

    setSubmitting(true);

    try {
      await createNewUser({
        email: email.trim(),
        displayName: displayName.trim(),
        password,
        role,
        performedBy: currentUser,
      });
      setCreatedPassword(password);
      onCreated();
      onSuccess(`Usuario creado. Comparte la contraseña con ${displayName.trim()} de forma segura.`);
    } catch (createError) {
      setError(authErrorMessage(createError));
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndClose() {
    setEmail("");
    setDisplayName("");
    setPassword("");
    setRole("employee");
    setError("");
    setCreatedPassword("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : resetAndClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>

        {createdPassword ? (
          <div className="space-y-4">
            <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
              No volverás a ver esta contraseña. Cópiala y compártela con el empleado.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={createdPassword} />
              <Button onClick={() => navigator.clipboard.writeText(createdPassword)} type="button" variant="outline">
                <Copy className="h-4 w-4" />
                Copiar contraseña
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={resetAndClose}>Cerrar</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Nombre completo</Label>
              <Input id="new-name" onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña temporal</Label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="text"
                  value={password}
                />
                <Button onClick={() => setPassword(generatePassword())} type="button" variant="outline">
                  <Wand2 className="h-4 w-4" />
                  Generar contraseña
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input checked={role === "employee"} onChange={() => setRole("employee")} type="radio" />
                  Empleado
                </label>
                <label className="flex items-center gap-2">
                  <input checked={role === "manager"} onChange={() => setRole("manager")} type="radio" />
                  Manager
                </label>
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-3">
              <Button onClick={resetAndClose} type="button" variant="outline">
                Cancelar
              </Button>
              <Button disabled={submitting} type="submit">
                {submitting ? "Creando..." : "Crear usuario"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
