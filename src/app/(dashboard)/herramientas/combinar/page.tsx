import { MergeFlow } from "@/components/tools/MergeFlow";

export default function MergePage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Combinar coches</h1>
        <p className="mt-2 text-muted-foreground">
          Une dos registros duplicados y conserva todo su historial.
        </p>
      </section>
      <MergeFlow />
    </div>
  );
}
