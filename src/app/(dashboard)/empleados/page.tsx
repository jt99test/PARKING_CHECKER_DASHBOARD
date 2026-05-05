"use client";

import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NewUserDialog } from "@/components/employees/NewUserDialog";
import { RoleChangeDialog } from "@/components/employees/RoleChangeDialog";
import { UsersTable } from "@/components/employees/UsersTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatNumber } from "@/lib/format";
import { getAllUsers, getUserStats, type UserStats } from "@/lib/queries";
import { changeUserRole } from "@/lib/userManagement";
import type { AppUser, UserRole } from "@/lib/types";

export default function EmployeesPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [stats, setStats] = useState<Record<string, UserStats>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<AppUser | null>(null);
  const [newRole, setNewRole] = useState<UserRole | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setError("");
      const nextUsers = await getAllUsers();
      const nextStats = await getUserStats(nextUsers);
      setUsers(nextUsers);
      setStats(nextStats);
    } catch {
      setError("No se pudo cargar la información. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((employee) => {
      const matchesQuery =
        !normalizedQuery ||
        employee.displayName.toLowerCase().includes(normalizedQuery) ||
        employee.email.toLowerCase().includes(normalizedQuery);
      const matchesRole = !roleFilter || employee.role === roleFilter;

      return matchesQuery && matchesRole;
    });
  }, [query, roleFilter, users]);

  const activeEmployees = users.filter((employee) => employee.role === "employee").length;
  const managerCount = users.filter((employee) => employee.role === "manager").length;

  function openRoleDialog(target: AppUser, role: UserRole) {
    setRoleTarget(target);
    setNewRole(role);
    setRoleDialogOpen(true);
  }

  async function confirmRoleChange() {
    if (!currentUser || !roleTarget || !newRole) {
      return;
    }

    setRoleSaving(true);
    try {
      await changeUserRole(roleTarget, newRole, currentUser);
      toast("Rol actualizado correctamente.");
      setRoleDialogOpen(false);
      await refresh();
    } catch {
      toast("No se pudo actualizar el rol.");
    } finally {
      setRoleSaving(false);
    }
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Empleados</h1>
          <p className="mt-2 text-muted-foreground">
            {formatNumber(activeEmployees)} empleados activos · {formatNumber(managerCount)} managers
          </p>
        </div>
        <Button onClick={() => setNewUserOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </section>

      <section className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o email"
            value={query}
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          onChange={(event) => setRoleFilter(event.target.value)}
          value={roleFilter}
        >
          <option value="">Todos</option>
          <option value="manager">Manager</option>
          <option value="employee">Empleado</option>
        </select>
      </section>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <UsersTable
        currentUserId={currentUser.uid}
        loading={loading}
        onRoleChange={openRoleDialog}
        stats={stats}
        users={filteredUsers}
      />

      <NewUserDialog
        currentUser={currentUser}
        onCreated={refresh}
        onOpenChange={setNewUserOpen}
        onSuccess={toast}
        open={newUserOpen}
      />

      <RoleChangeDialog
        currentUserId={currentUser.uid}
        loading={roleSaving}
        newRole={newRole}
        onConfirm={confirmRoleChange}
        onOpenChange={setRoleDialogOpen}
        open={roleDialogOpen}
        user={roleTarget}
      />
    </div>
  );
}
