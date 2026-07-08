"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useState, useEffect } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";
import { Orbi } from "@/components/ui/Orbi";

export default function DataHub() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/crecimiento/datasets")
      .then(res => res.json())
      .then(data => setDatasets(Array.isArray(data?.data) ? data.data : []))
      .catch(console.error);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    if (selectedDatasetId) {
      formData.append("datasetId", selectedDatasetId);
    }

    try {
      const res = await fetch("/api/crecimiento/datasets", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      setResult(json?.success ? json.data : { error: json?.error ?? "Error al procesar el archivo" });
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Aria Data Hub" 
        description="Carga y prepara tus datos históricos para entrenamiento."
      />
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Cargar Dataset (CSV)
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Destino del Dataset (Opcional)
            </label>
            <select 
              className="w-full bg-background border rounded-md p-2 text-sm"
              value={selectedDatasetId}
              onChange={e => setSelectedDatasetId(e.target.value)}
            >
              <option value="">Crear nuevo dataset global (Sin scope)</option>
              <optgroup label="Modelos por Vertical">
                {datasets.filter(d => d.targetType === "VERTICAL").map(d => (
                  <option key={d.id} value={d.id}>{d.verticalName} ({d.rowCount} filas)</option>
                ))}
              </optgroup>
              <optgroup label="Modelos por Cliente">
                {datasets.filter(d => d.targetType === "CLIENT").map(d => (
                  <option key={d.id} value={d.id}>{d.clientName} ({d.rowCount} filas)</option>
                ))}
              </optgroup>
              <optgroup label="Modelos por Proyecto">
                {datasets.filter(d => d.targetType === "PROJECT").map(d => (
                  <option key={d.id} value={d.id}>{d.project?.name || d.name} ({d.rowCount} filas)</option>
                ))}
              </optgroup>
            </select>
          </div>
          
          <div className="border-2 border-dashed rounded-lg p-8 text-center flex flex-col items-center justify-center relative hover:bg-muted/50 transition">
            <Upload className="w-8 h-8 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {file ? file.name : "Arrastra un archivo CSV con tus leads históricos"}
            </p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">
              Seleccionar archivo
            </button>
          </div>

          <button 
            disabled={!file || uploading}
            onClick={handleUpload}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-[var(--foreground)] py-3 rounded-md font-semibold disabled:opacity-50 transition"
          >
            {uploading ? "Procesando..." : "Subir y Analizar"}
          </button>
        </div>

        <div>
          <div className="flex items-center gap-4 mb-4">
            <Orbi state={result?.rowCount != null ? "thinking" : "idle"} />
            <p className="text-sm text-muted-foreground font-medium">
              {result?.error
                ? result.error
                : result?.rowCount != null
                  ? "¡Dataset analizado! Puedes ir al Predictive Studio a entrenar el modelo."
                  : "Sube un archivo CSV con al menos una columna de resultado (ej. 'Convertido')."}
            </p>
          </div>

          {result?.rowCount != null && (
            <div className="mt-6 bg-card border rounded-xl p-6">
              <h3 className="font-semibold text-green-500 flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5" />
                Resumen del Dataset
              </h3>
              <ul className="space-y-2 text-sm">
                <li><strong>Filas:</strong> {result.rowCount}</li>
                <li><strong>Columnas detectadas:</strong> {result.columns?.length}</li>
                {result.targetColumn && (
                  <li><strong>Columna objetivo detectada:</strong> {result.targetColumn}</li>
                )}
                <li className="text-muted-foreground"><strong>Encoding:</strong> {result.encoding} · <strong>Delimitador:</strong> {result.delimiter === "\t" ? "tab" : result.delimiter}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
