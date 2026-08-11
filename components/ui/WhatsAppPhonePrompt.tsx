"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { X, MessageCircle, Phone, Check, ChevronRight, Bell } from "lucide-react";

const DISMISSED_KEY = "flowchart:wa-phone-prompt-dismissed";
const SNOOZE_DAYS = 3;

function isSnoozed(): boolean {
  try {
    const val = localStorage.getItem(DISMISSED_KEY);
    if (!val) return false;
    const until = parseInt(val, 10);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(
      DISMISSED_KEY,
      String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
    );
  } catch {}
}

function dismiss() {
  try {
    // Permanent dismiss
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000));
  } catch {}
}

export function WhatsAppPhonePrompt() {
  const { data: session } = useSession();
  const [visible, setVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const [waConnected, setWaConnected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check on mount whether to show the prompt
  useEffect(() => {
    if (!session?.user) return;
    if (isSnoozed()) return;

    // Check if user already has a WhatsApp phone set
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        const hasPhone = !!data?.data?.profile?.whatsappPhone;
        if (hasPhone) return; // Already set — never show

        // Also check if the workspace has WhatsApp connected (only show if it's useful)
        return fetch("/api/whatsapp/phone-numbers")
          .then((r) => r.json())
          .then((waData) => {
            const isConnected = !!waData?.data?.connected;
            setWaConnected(isConnected);
            if (isConnected) {
              // Small delay so the page loads first
              setTimeout(() => setVisible(true), 1500);
            }
          });
      })
      .catch(() => {});
  }, [session?.user]);

  // Focus input when visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const handleSave = async () => {
    setError("");
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned || cleaned.length < 7 || cleaned.length > 15) {
      setError("Ingresa un número válido (solo dígitos, ej. 5215512345678)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappPhone: cleaned }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar");
      } else {
        setSaved(true);
        setTimeout(() => {
          dismiss();
          setVisible(false);
        }, 1800);
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    }
    setSaving(false);
  };

  const handleSnooze = () => {
    snooze();
    setVisible(false);
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9000,
          background: "var(--panel-bg)",
          
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          animation: "fadeIn 0.25s ease",
        }}
        onClick={handleSnooze}
      >
        {/* Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 440,
            borderRadius: 20,
            background: "linear-gradient(145deg, rgba(7,10,20,0.98) 0%, rgba(12,20,35,0.99) 100%)",
            border: "1px solid rgba(37,211,102,0.25)",
            boxShadow: "0 0 0 1px rgba(37,211,102,0.08), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(37,211,102,0.06)",
            overflow: "hidden",
            animation: "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
        >
          {/* Header bar */}
          <div
            style={{
              height: 3,
              background: "linear-gradient(90deg, #25D366, #128C7E, #075E54)",
            }}
          />

          {/* Content */}
          <div style={{ padding: "28px 28px 24px" }}>
            {/* Close */}
            <button
              onClick={handleDismiss}
              title="No volver a mostrar"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--border-strong)",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <X size={16} />
            </button>

            {/* Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(37,211,102,0.15) 0%, rgba(18,140,126,0.2) 100%)",
                  border: "1px solid rgba(37,211,102,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                    fill="#25D366"
                  />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--fc-text)", margin: 0, lineHeight: 1.3 }}>
                  Activa notificaciones por WhatsApp
                </p>
                <p style={{ fontSize: 12, color: "var(--fc-text-muted)", margin: 0, marginTop: 3 }}>
                  Recibe alertas de tareas directamente en tu WhatsApp
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div
              style={{
                background: "var(--fc-success-wash)",
                border: "1px solid rgba(37,211,102,0.1)",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 20,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {[
                { icon: Bell, text: "Cuando te asignen o creen una tarea" },
                { icon: Check, text: "Cuando cambien el estado de tu tarea" },
                { icon: MessageCircle, text: "Cuando comenten en tus tareas" },
                { icon: Phone, text: "Alertas de SLA antes de que se venza" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon size={13} style={{ color: "#25D366", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--fc-text-secondary)" }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Input */}
            {saved ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "16px",
                  borderRadius: 10,
                  background: "var(--fc-success-wash)",
                  border: "1px solid rgba(37,211,102,0.25)",
                }}
              >
                <Check size={18} style={{ color: "#25D366" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#25D366" }}>
                  ¡Número registrado! Ya recibirás notificaciones.
                </span>
              </div>
            ) : (
              <>
                <label
                  htmlFor="wa-phone-input"
                  style={{ fontSize: 11, color: "var(--fc-text-muted)", display: "block", marginBottom: 6 }}
                >
                  Tu número de WhatsApp (con código de país, sin +)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: "var(--border-strong)",
                        fontSize: 13,
                        pointerEvents: "none",
                      }}
                    >
                      <Phone size={13} />
                    </div>
                    <input
                      id="wa-phone-input"
                      ref={inputRef}
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      placeholder="5215512345678"
                      style={{
                        width: "100%",
                        padding: "11px 12px 11px 32px",
                        borderRadius: 10,
                        background: "var(--surface-hover)",
                        border: `1px solid ${error ? "rgba(229,72,77,0.5)" : "rgba(37,211,102,0.2)"}`,
                        color: "var(--fc-text)",
                        fontSize: 14,
                        outline: "none",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => {
                        if (!error) e.target.style.borderColor = "rgba(37,211,102,0.5)";
                      }}
                      onBlur={(e) => {
                        if (!error) e.target.style.borderColor = "rgba(37,211,102,0.2)";
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving || !phone.trim()}
                    style={{
                      padding: "11px 18px",
                      borderRadius: 10,
                      background: saving || !phone.trim()
                        ? "rgba(37,211,102,0.3)"
                        : "linear-gradient(135deg, #25D366, #128C7E)",
                      border: "none",
                      color: "var(--fc-text)",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: saving || !phone.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
                      fontFamily: "inherit",
                    }}
                  >
                    {saving ? (
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          border: "2px solid rgba(255,255,255,0.4)",
                          borderTopColor: "var(--fc-text)",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                          display: "inline-block",
                        }}
                      />
                    ) : (
                      <>
                        Guardar <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </div>
                {error && (
                  <p style={{ fontSize: 11, color: "rgba(229,72,77,0.9)", marginTop: 6, marginBottom: 0 }}>
                    {error}
                  </p>
                )}
              </>
            )}

            {/* Footer */}
            {!saved && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                <button
                  onClick={handleSnooze}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "var(--border-strong)",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontFamily: "inherit",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  Recordarme en {SNOOZE_DAYS} días
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
