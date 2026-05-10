"use client";

import { LogOut, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/actividad", label: "Actividad" },
  { href: "/inventario", label: "Inventario" },
  { href: "/empleados", label: "Empleados" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/[ @.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-28 w-full" />
      </div>
    </main>
  );
}

function VWMark() {
  return (
    <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white shadow-sm">
      <Image
        alt="Volkswagen"
        className="scale-125 object-cover"
        fill
        priority
        sizes="40px"
        src="/vw-logo.png"
      />
    </span>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (loading || !user) {
    return <LoadingScreen />;
  }

  if (user.role !== "manager") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
          <div className="mb-5 h-1 w-16 rounded-full bg-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Acceso denegado</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Esta zona es solo para managers. Si crees que es un error, contacta con tu
            administrador.
          </p>
          <Button className="mt-6" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-[#101858] bg-accent shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3 font-semibold text-white" href="/actividad">
            <VWMark />
            <span className="leading-tight">
              <span className="block">Trackeador VW</span>
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                className={cn(
                  "rounded-md border border-transparent px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                  isActivePath(pathname, item.href) && "border-white/15 bg-white text-accent shadow-sm",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto bg-white/10 text-white hover:bg-white hover:text-accent" size="icon" variant="ghost">
                <Menu className="h-4 w-4 md:hidden" />
                <Avatar className="hidden md:flex">
                  <AvatarFallback className="bg-white text-accent">{getInitials(user.displayName, user.email)}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Abrir menú de usuario</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="block">{user.displayName || "Manager"}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
                <span className="mt-2 inline-flex rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {user.role === "manager" ? "Manager" : "Empleado"}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="md:hidden">
                {navItems.map((item) => (
                  <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="page-fade-in mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
