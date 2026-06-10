import { Skeleton } from "@/components/ui/Skeleton";

// Skeleton compartido para todas las rutas /dashboard/* mientras carga el
// segmento. Evita la pantalla vacía entre navegaciones (las páginas son
// client components que además hacen fetch propio al montar).
export default function DashboardLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
      <Skeleton style={{ height: 32, width: 260 }} />
      <Skeleton style={{ height: 16, width: 380 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Skeleton style={{ height: 110 }} />
        <Skeleton style={{ height: 110 }} />
        <Skeleton style={{ height: 110 }} />
        <Skeleton style={{ height: 110 }} />
      </div>
      <Skeleton style={{ height: 320 }} />
    </div>
  );
}
