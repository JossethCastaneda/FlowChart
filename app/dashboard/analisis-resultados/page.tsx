import { redirect } from "next/navigation";

// "Análisis de Resultados" dejó de ser una vista GLOBAL del menú lateral: ahora
// es un tab dentro de cada proyecto (un proyecto envía a una sola plataforma
// analítica, así que el análisis vive acotado al proyecto). Esta ruta índice
// queda como redirect para no romper enlaces antiguos.
export default function AnalisisResultadosPage() {
  redirect("/dashboard/proyectos");
}
