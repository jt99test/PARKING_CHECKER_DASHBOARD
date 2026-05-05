"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface SpecialStateCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  children?: React.ReactNode;
}

export function SpecialStateCard({
  icon,
  title,
  description,
  href,
  children,
}: SpecialStateCardProps) {
  return (
    <Card className="border-t-4 border-t-accent transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-6">
        <Link className="block" href={href}>
          <div className="flex items-start gap-4">
            <span aria-hidden className="text-3xl">
              {icon}
            </span>
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-normal">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </Link>
        {children ? <div className="mt-4">{children}</div> : null}
      </CardContent>
    </Card>
  );
}
