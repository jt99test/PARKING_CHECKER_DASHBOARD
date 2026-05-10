"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LotCardProps {
  lotName: string;
  count: number;
  href: string;
  loading?: boolean;
  onDeleteLot?: (lotName: string) => void;
  onEditName?: (lotName: string) => void;
}

export function LotCard({ lotName, count, href, loading = false, onDeleteLot, onEditName }: LotCardProps) {
  return (
    <Card
      className={cn(
        "h-full border-l-4 border-l-primary transition-all hover:-translate-y-0.5 hover:shadow-md",
        count === 0 && "text-muted-foreground",
      )}
    >
      <CardContent className="flex min-h-40 flex-col p-6 text-center">
        <Link aria-label={`Ver ${lotName}`} className="flex flex-1 flex-col items-center justify-center" href={href}>
          <p className="text-sm font-semibold uppercase tracking-normal">{lotName}</p>
          <p className="mt-4 text-5xl font-bold tabular-nums text-foreground">
            {loading ? "-" : formatNumber(count)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">coches</p>
        </Link>
        {onEditName || onDeleteLot ? (
          <div className="mt-4 grid gap-2">
            {onEditName ? (
              <Button onClick={() => onEditName(lotName)} size="sm" type="button" variant="outline">
                <Pencil className="h-3.5 w-3.5" />
                Editar nombre
              </Button>
            ) : null}
            {onDeleteLot ? (
              <Button onClick={() => onDeleteLot(lotName)} size="sm" type="button" variant="outline">
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar lote
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
