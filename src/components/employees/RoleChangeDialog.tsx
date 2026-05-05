"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AppUser, UserRole } from "@/lib/types";

interface RoleChangeDialogProps {
  user: AppUser | null;
  newRole: UserRole | null;
  currentUserId: string;
  open: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function roleLabel(role: UserRole) {
  return role === "manager" ? "manager" : "empleado";
}

export function RoleChangeDialog({
  user,
  newRole,
  currentUserId,
  open,
  loading = false,
  onOpenChange,
  onConfirm,
}: RoleChangeDialogProps) {
  if (!user || !newRole) {
    return null;
  }

  const isSelfDemotion = user.uid === currentUserId && user.role === "manager" && newRole === "employee";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cambiar el rol de {user.displayName || user.email}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            {user.displayName || user.email} pasará de {roleLabel(user.role)} a{" "}
            {roleLabel(newRole)}. Tendrá {newRole === "manager" ? "un poco más" : "menos"}{" "}
            acceso en el sistema.
          </p>
          {isSelfDemotion ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              Si cambias tu propio rol no podrás volver a entrar al panel.
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-3">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancelar
          </Button>
          <Button disabled={loading || isSelfDemotion} onClick={onConfirm}>
            {loading ? "Guardando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
