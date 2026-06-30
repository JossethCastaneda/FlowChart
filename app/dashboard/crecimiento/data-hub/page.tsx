"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";
import { Orbi } from "@/components/ui/Orbi";

export default function DataHub() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

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

    try {
      const res = await fetch("/api/crecimiento/datasets", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
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
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-semibold disabled:opacity-50 transition"
          >
            {uploading ? "Procesando..." : "Subir y Analizar"}
          </button>
        </div>

        <div>
          <div className="flex items-center gap-4 mb-4">
            <Orbi state={result ? "thinking" : "idle"} />
            <p className="text-sm text-muted-foreground font-medium">
              {result ? "¡Dataset analizado! Puedes ir al Predictive Studio a entrenar el modelo." : "Sube un archivo CSV con al menos una columna de resultado (ej. 'Convertido')."}
            </p>
          </div>
          
          {result && (
            <div className="mt-6 bg-card border rounded-xl p-6">
              <h3 className="font-semibold text-green-500 flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5" />
                Resumen del Dataset
              </h3>
              <ul className="space-y-2 text-sm">
                <li><strong>Filas:</strong> {result.rowCount}</li>
                <li><strong>Columnas detectadas:</strong> {result.columns?.length}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
