"use client";

import { Crown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTimeAgo } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import type { UserStats } from "@/lib/queries";
import type { AppUser, UserRole } from "@/lib/types";

interface UsersTableProps {
  users: AppUser[];
  stats: Record<string, UserStats>;
  currentUserId: string;
  loading?: boolean;
  onRoleChange: (user: AppUser, role: UserRole) => void;
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "manager") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
        <Crown className="h-3 w-3" />
        Manager
      </span>
    );
  }

  return <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">Empleado</span>;
}

export function UsersTable({
  users,
  stats,
  currentUserId,
  loading = false,
  onRoleChange,
}: UsersTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="grid grid-cols-[1fr_1.5fr_120px_120px_140px_48px] gap-4 border-b p-4" key={index}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No se han encontrado empleados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Movimientos</TableHead>
            <TableHead>Última actividad</TableHead>
            <TableHead className="w-12">⋮</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const userStats = stats[user.uid] ?? { movementCount: 0, lastActivityAt: null };
            const nextRole: UserRole = user.role === "manager" ? "employee" : "manager";
            const isSelfDemotion = user.uid === currentUserId && user.role === "manager";

            return (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">{user.displayName || "—"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell>{formatNumber(userStats.movementCount)}</TableCell>
                <TableCell>
                  {userStats.lastActivityAt ? formatTimeAgo(userStats.lastActivityAt) : "Nunca"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir acciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={isSelfDemotion}
                        onClick={() => onRoleChange(user, nextRole)}
                      >
                        {nextRole === "manager" ? "Cambiar a manager" : "Cambiar a empleado"}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/actividad?periodo=ultimos-7-dias&empleado=${encodeURIComponent(user.displayName)}`} target="_blank">
                          Ver actividad
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled title="Próximamente. Por ahora elimina desde la consola de Firebase.">
                        Eliminar usuario
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
