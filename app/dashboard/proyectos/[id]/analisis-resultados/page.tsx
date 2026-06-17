import { redirect } from "next/navigation";

// El "Análisis de Resultados" del proyecto ya no es una página aparte: ahora es
// un tab dentro del panel del proyecto (Clientes → proyecto → "Análisis de
// Resultados"). Mantenemos esta ruta como redirect para no romper deep-links.
export default async function ProjectAnalisisResultadosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/proyectos/${id}`);
}
