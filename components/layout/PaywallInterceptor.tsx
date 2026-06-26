"use client";

import { useEffect, useState } from "react";
import { CreditCard, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

export function PaywallInterceptor() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Save original fetch
    const originalFetch = window.fetch;

    // Monkey-patch window.fetch to intercept 402 PLAN_LIMIT responses
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // We only care about 402 errors
      if (response.status === 402) {
        try {
          // Clone response so the original caller can still read it if they want
          const clone = response.clone();
          const data = await clone.json();
          if (data.error_code === "PLAN_LIMIT") {
            setMessage(data.error || "Has alcanzado un límite de tu plan.");
            setIsOpen(true);
          }
        } catch (err) {
          // Ignore parsing errors
        }
      }
      return response;
    };

    return () => {
      // Restore original fetch on unmount
      window.fetch = originalFetch;
    };
  }, []);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    setIsOpen(false);
    router.push("/dashboard/settings");
    // To trigger the Plan tab to open, we can store it in localStorage
    try {
      localStorage.setItem("sodare:settings-section", "plan");
    } catch {}
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0b101d] border border-[var(--cyan)]/20 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header decoration */}
        <div className="h-32 w-full relative bg-gradient-to-br from-indigo-900/40 to-[var(--cyan)]/20 flex items-center justify-center border-b border-white/5">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="w-16 h-16 rounded-full bg-black/40 border border-[var(--cyan)]/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.2)]">
            <Zap className="w-8 h-8 text-[var(--cyan)]" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-2 text-center">Límite del Plan Alcanzado</h2>
          
          <p className="text-slate-300 text-sm text-center mb-6 leading-relaxed">
            {message}
          </p>

          <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Sube de nivel tu Agencia
            </h3>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex gap-2 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Proyectos, Miembros e Integraciones ilimitadas.
              </li>
              <li className="flex gap-2 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]"></span>
                Historial analítico de hasta 365 días.
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleUpgrade}
              className="w-full py-3 px-4 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(0,212,255,0.15)] transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, var(--cyan) 0%, #005bb5 100%)",
              }}
            >
              Mejorar mi Plan
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cerrar por ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
