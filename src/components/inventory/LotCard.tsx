"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LotCardProps {
  lotName: string;
  count: number;
  href: string;
  loading?: boolean;
}

export function LotCard({ lotName, count, href, loading = false }: LotCardProps) {
  return (
    <Link aria-label={`Ver ${lotName}`} href={href}>
      <Card
        className={cn(
          "h-full border-l-4 border-l-primary transition-all hover:-translate-y-0.5 hover:shadow-md",
          count === 0 && "text-muted-foreground",
        )}
      >
        <CardContent className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-normal">{lotName}</p>
          <p className="mt-4 text-5xl font-bold tabular-nums text-foreground">
            {loading ? "—" : formatNumber(count)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">coches</p>
        </CardContent>
      </Card>
    </Link>
  );
}
