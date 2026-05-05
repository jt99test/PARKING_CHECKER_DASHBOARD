import { CarFront, type LucideIcon } from "lucide-react";

interface NoDataProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function NoData({ icon: Icon = CarFront, title, description }: NoDataProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
