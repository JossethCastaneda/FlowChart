"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ArrowRight, Building2, User, Briefcase, Plus, X } from "lucide-react";
import { SodareLogo } from "@/components/ui/SodareLogo";
import { Orbi } from "@/components/ui/Orbi";

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", background: "var(--background)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px"
      }}>
        <Orbi state="working" scale={0.8} />
        <p style={{ color: "var(--cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.1em", fontSize: "14px" }}>INICIALIZANDO...</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  
  const isNewWorkspace = searchParams.get("new") === "1";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Workspace Name
  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");

  // Step 2: Team Type
  const [teamType, setTeamType] = useState<"agency" | "brand" | "freelance" | "">("");

  // Step 3: Invites
  const [emails, setEmails] = useState<string[]>([""]);

  // Verificar si el usuario YA tiene workspace (y no está pidiendo uno nuevo explícitamente)
  useEffect(() => {
    if (isNewWorkspace) {
      setChecking(false);
      return;
    }
    fetch("/api/workspace")
      .then((r) => r.json())
      .then(async (data) => {
        if (data.data && data.data.length > 0) {
          await update();
          router.push("/dashboard/resumen");
          router.refresh();
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateWorkspace() {
    if (name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const createRes = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        setError(createData.error || "Error al crear workspace");
        setLoading(false);
        return;
      }

      setWorkspaceId(createData.data.id);

      // Setear como workspace activo (cookie)
      await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: createData.data.id }),
      });

      setLoading(false);
      setStep(2);
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setLoading(false);
    }
  }

  async function handleFinish() {
    setLoading(true);
    
    // Enviar invitaciones
    const validEmails = emails.filter(e => e.trim().includes("@"));
    for (const email of validEmails) {
      try {
        await fetch(`/api/workspace/${workspaceId}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), role: "MEMBER" })
        });
      } catch (err) {
        console.error("Failed to invite", email, err);
      }
    }

    // Forzar reload completo para regenerar JWT y cookie
    window.location.href = "/dashboard/resumen";
  }

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--background)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px"
      }}>
        <Orbi state="working" scale={0.8} />
        <p style={{ color: "var(--cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.1em", fontSize: "14px" }}>VERIFICANDO ACCESOS...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", padding: "20px" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", padding: "40px", position: "relative" }}>
        
        {/* Step indicator */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              flex: 1, height: "4px", borderRadius: "2px",
              background: s === step ? "var(--cyan)" : s < step ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)",
              transition: "all 0.3s"
            }} />
          ))}
        </div>

        <div style={{ marginBottom: "32px" }}>
          <SodareLogo size="md" />
        </div>

        {/* STEP 1: WORKSPACE NAME */}
        {step === 1 && (
          <div className="page-enter">
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
              {isNewWorkspace ? "Nuevo Workspace" : "Inicializar Command Center"}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "32px", lineHeight: 1.5 }}>
              {isNewWorkspace
                ? "Crea un workspace aislado para gestionar otro cliente, marca o equipo de forma independiente."
                : "Dale un nombre a tu entorno de trabajo. Este será el centro de control para tus proyectos de analítica y pauta."}
            </p>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                Nombre del workspace
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                placeholder="Ej: Agencia Matrix / Mi Empresa"
                style={{ width: "100%", padding: "12px 16px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--foreground)", fontSize: "15px", outline: "none", boxSizing: "border-box", borderRadius: "6px" }}
                autoFocus
              />
              {error && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "8px" }}>{error}</p>}
            </div>

            <button onClick={handleCreateWorkspace} disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creando entorno..." : "Continuar"} <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            
            {isNewWorkspace && (
              <button onClick={() => router.back()} style={{ width: "100%", marginTop: "16px", padding: "10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px", borderRadius: "6px" }}>
                Cancelar
              </button>
            )}
          </div>
        )}

        {/* STEP 2: PROFILE */}
        {step === 2 && (
          <div className="page-enter">
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
              Perfil de Uso
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "32px", lineHeight: 1.5 }}>
              ¿Qué describe mejor a tu equipo? Esto nos ayuda a optimizar tu experiencia en el dashboard.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
              <OptionCard 
                icon={<Building2 className="w-5 h-5" />} title="Agencia" desc="Gestiono campañas para múltiples clientes." 
                selected={teamType === "agency"} onClick={() => setTeamType("agency")} 
              />
              <OptionCard 
                icon={<Briefcase className="w-5 h-5" />} title="Marca Directa" desc="Mido resultados y pauta para mi propia empresa." 
                selected={teamType === "brand"} onClick={() => setTeamType("brand")} 
              />
              <OptionCard 
                icon={<User className="w-5 h-5" />} title="Freelancer / Creador" desc="Trabajo independiente analizando cuentas." 
                selected={teamType === "freelance"} onClick={() => setTeamType("freelance")} 
              />
            </div>

            <button onClick={() => setStep(3)} disabled={!teamType} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px", opacity: !teamType ? 0.5 : 1 }}>
              Siguiente paso <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )}

        {/* STEP 3: INVITES */}
        {step === 3 && (
          <div className="page-enter">
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
              Invita a tu equipo
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "32px", lineHeight: 1.5 }}>
              Añade a tus colaboradores para que puedan ver los dashboards y configurar campañas. (Opcional)
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {emails.map((em, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="email"
                    value={em}
                    onChange={(e) => {
                      const newEmails = [...emails];
                      newEmails[idx] = e.target.value;
                      setEmails(newEmails);
                    }}
                    placeholder="email@empresa.com"
                    className="f-input"
                    style={{ flex: 1 }}
                  />
                  {emails.length > 1 && (
                    <button onClick={() => setEmails(emails.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px" }}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setEmails([...emails, ""])} 
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--cyan)", fontSize: "13px", cursor: "pointer", marginBottom: "32px", fontWeight: 600 }}
            >
              <Plus className="w-4 h-4" /> Añadir otro email
            </button>

            <button onClick={handleFinish} disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Finalizando..." : "Ir al Dashboard"} <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <button onClick={handleFinish} disabled={loading} style={{ width: "100%", marginTop: "12px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>
              Saltar este paso por ahora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCard({ icon, title, desc, selected, onClick }: { icon: React.ReactNode, title: string, desc: string, selected: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "16px", padding: "16px",
      background: selected ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${selected ? "var(--cyan)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: "8px", cursor: "pointer", transition: "all 0.2s"
    }}>
      <div style={{ color: selected ? "var(--cyan)" : "var(--text-muted)" }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: selected ? "white" : "var(--foreground)", marginBottom: "4px" }}>{title}</h3>
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{desc}</p>
      </div>
    </div>
  );
}
