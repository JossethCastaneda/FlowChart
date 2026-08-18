"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FlowChartLogo } from "@/components/ui/FlowChartLogo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="fc-onboarding-loading">
        <Icon name="programado" size={32} />
        <p className="fc-onboarding-loading-text">INICIALIZANDO...</p>
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

  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");

  const [teamType, setTeamType] = useState<"agency" | "brand" | "freelance" | "">("");
  const [emails, setEmails] = useState<string[]>([""]);

  useEffect(() => {
    if (isNewWorkspace) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecking(false);
      return;
    }
    fetch("/api/workspace")
      .then((r) => r.json())
      .then(async (data) => {
        if (data.data && data.data.length > 0) {
          await update({ hasWorkspace: true });
          window.location.href = "/dashboard/resumen";
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, [isNewWorkspace, update]);

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

    window.location.href = "/dashboard/resumen";
  }

  if (checking) {
    return (
      <div className="fc-onboarding-loading">
        <Icon name="programado" size={32} />
        <p className="fc-onboarding-loading-text">VERIFICANDO ACCESOS...</p>
      </div>
    );
  }

  return (
    <div className="fc-onboarding-root">
      <div className="fc-onboarding-card">
        
        <div className="fc-onboarding-progress">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`fc-onboarding-step ${s === step ? 'is-active' : s < step ? 'is-completed' : ''}`} />
          ))}
        </div>

        <div className="fc-onboarding-logo">
          <FlowChartLogo size="md" />
        </div>

        {step === 1 && (
          <div className="fc-onboarding-content">
            <h1 className="fc-onboarding-title">
              {isNewWorkspace ? "Nuevo Workspace" : "Inicializar Command Center"}
            </h1>
            <p className="fc-onboarding-subtitle">
              {isNewWorkspace
                ? "Crea un workspace aislado para gestionar otro cliente, marca o equipo de forma independiente."
                : "Dale un nombre a tu entorno de trabajo. Este será el centro de control para tus proyectos de analítica y pauta."}
            </p>

            <div style={{ marginBottom: "24px" }}>
              <label className="fc-onboarding-label">Nombre del workspace</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                placeholder="Ej: Agencia Matrix / Mi Empresa"
                error={!!error}
              />
              {error && <p className="fc-onboarding-error">{error}</p>}
            </div>

            <Button onClick={handleCreateWorkspace} loading={loading} variant="primary" style={{ width: "100%" }}>
              {loading ? "Creando entorno..." : "Continuar"}
            </Button>
            
            {isNewWorkspace && (
              <Button onClick={() => router.back()} variant="ghost" style={{ width: "100%", marginTop: "16px" }}>
                Cancelar
              </Button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="fc-onboarding-content">
            <h1 className="fc-onboarding-title">Perfil de Uso</h1>
            <p className="fc-onboarding-subtitle">
              ¿Qué describe mejor a tu equipo? Esto nos ayuda a optimizar tu experiencia en el dashboard.
            </p>

            <div className="fc-onboarding-options">
              <OptionCard 
                icon={<Icon name="equipo" size={20} />} title="Agencia" desc="Gestiono campañas para múltiples clientes." 
                selected={teamType === "agency"} onClick={() => setTeamType("agency")} 
              />
              <OptionCard 
                icon={<Icon name="canales" size={20} />} title="Marca Directa" desc="Mido resultados y pauta para mi propia empresa." 
                selected={teamType === "brand"} onClick={() => setTeamType("brand")} 
              />
              <OptionCard 
                icon={<Icon name="usuario" size={20} />} title="Freelancer / Creador" desc="Trabajo independiente analizando cuentas." 
                selected={teamType === "freelance"} onClick={() => setTeamType("freelance")} 
              />
            </div>

            <Button onClick={() => setStep(3)} disabled={!teamType} variant="primary" style={{ width: "100%" }}>
              Siguiente paso
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="fc-onboarding-content">
            <h1 className="fc-onboarding-title">Invita a tu equipo</h1>
            <p className="fc-onboarding-subtitle">
              Añade a tus colaboradores para que puedan ver los dashboards y configurar campañas. (Opcional)
            </p>

            <div className="fc-onboarding-invites">
              {emails.map((em, idx) => (
                <div key={idx} className="fc-onboarding-invite-row">
                  <div style={{ flex: 1 }}>
                    <Input
                      type="email"
                      value={em}
                      onChange={(e) => {
                        const newEmails = [...emails];
                        newEmails[idx] = e.target.value;
                        setEmails(newEmails);
                      }}
                      placeholder="email@empresa.com"
                    />
                  </div>
                  {emails.length > 1 && (
                    <button onClick={() => setEmails(emails.filter((_, i) => i !== idx))} className="fc-onboarding-remove-btn">
                      <Icon name="alerta" size={16} /> {/* We use alerta or mas rotated? The sprite doesn't have an X. So text X */}
                      X
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setEmails([...emails, ""])} 
              className="fc-onboarding-add-btn"
            >
              <Icon name="mas" size={14} /> Añadir otro email
            </button>

            <Button onClick={handleFinish} loading={loading} variant="primary" style={{ width: "100%" }}>
              {loading ? "Finalizando..." : "Ir al Dashboard"}
            </Button>
            <button onClick={handleFinish} disabled={loading} className="fc-onboarding-skip-btn">
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
    <div onClick={onClick} className={`fc-onboarding-option ${selected ? 'is-selected' : ''}`}>
      <div className="fc-onboarding-option-icon">
        {icon}
      </div>
      <div>
        <h3 className="fc-onboarding-option-title">{title}</h3>
        <p className="fc-onboarding-option-desc">{desc}</p>
      </div>
    </div>
  );
}
