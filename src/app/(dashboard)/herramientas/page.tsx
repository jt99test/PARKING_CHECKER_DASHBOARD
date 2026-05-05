import { ArrowRight, Download, Link2, MapPin, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const tools = [
  {
    href: "/herramientas/combinar",
    icon: Link2,
    title: "Combinar coches",
    description: "Une dos registros duplicados.",
  },
  {
    href: "/herramientas/discrepancias",
    icon: TriangleAlert,
    title: "Discrepancias",
    description: "Movimientos con origen incorrecto.",
  },
  {
    href: "/herramientas/lotes",
    icon: MapPin,
    title: "Gestión lotes",
    description: "Renombra los lotes del concesionario.",
  },
  {
    href: "/herramientas/exportar",
    icon: Download,
    title: "Exportar todo",
    description: "Descarga toda la base de datos.",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Herramientas</h1>
        <p className="mt-2 text-muted-foreground">Acciones administrativas del concesionario.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <Link href={tool.href} key={tool.href}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex min-h-44 flex-col justify-between p-6">
                  <div>
                    <Icon className="h-8 w-8 text-primary" />
                    <h2 className="mt-4 text-xl font-semibold">{tool.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                  <ArrowRight className="mt-6 h-5 w-5" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
