"use client";

import { useState, useEffect } from "react";
import { Bell, Monitor, Mail, Smartphone, AppWindow, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_META,
  type UserPreferences,
  type NotificationChannel,
  type NotificationEvent,
} from "@/lib/product-profile";
import {
  getPreferences,
  loadPreferences,
  subscribePreferences,
  updatePreferences,
} from "@/lib/user-preferences-store";
import { useProfile } from "@/hooks/use-settings-data";
import { showToast } from "@/components/ui/Toast";
import {
  SettingsStack,
  SettingsCard,
  SettingsSkeleton,
  ToggleRow,
  Toggle,
} from "@/components/settings/ui";

const CHANNEL_META: Record<
  NotificationChannel,
  { label: string; short: string; icon: React.ElementType }
> = {
  inApp: { label: "En la app", short: "App", icon: AppWindow },
  email: { label: "Correo", short: "Correo", icon: Mail },
  whatsapp: { label: "WhatsApp", short: "WhatsApp", icon: Smartphone },
};

export function PreferencesSettings() {
  // El store cliente es la fuente de verdad: así un cambio aquí se aplica al
  // instante en toda la app (ver UserPreferencesProvider).
  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences);
  const [loading, setLoading] = useState(true);
  const { data: profileData } = useProfile();

  const hasWhatsapp = !!profileData?.profile?.whatsappPhone;

  useEffect(() => {
    const unsubscribe = subscribePreferences(setPrefs);
    loadPreferences(true).finally(() => setLoading(false));
    return () => {
      unsubscribe();
    };
  }, []);

  async function apply(patch: Partial<UserPreferences>) {
    try {
      await updatePreferences(patch);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "No pudimos guardar el cambio.");
    }
  }

  function setChannel(event: NotificationEvent, channel: NotificationChannel, value: boolean) {
    void apply({
      notifications: {
        ...prefs.notifications,
        [event]: { ...(prefs.notifications as any)[event], [channel]: value },
      },
    });
  }

  /** Apaga o enciende un canal en todos los eventos que lo soportan. */
  function setChannelEverywhere(channel: NotificationChannel, value: boolean) {
    const next = { ...prefs.notifications };
    NOTIFICATION_EVENTS.forEach((event: NotificationEvent) => {
      if (NOTIFICATION_EVENT_META[event].channels.includes(channel)) {
        (next as any)[event] = { ...(next as any)[event], [channel]: value };
      }
    });
    void apply({ notifications: next });
  }

  if (loading) return <SettingsSkeleton cards={2} />;

  const channelAllOn = (channel: NotificationChannel) =>
    NOTIFICATION_EVENTS.filter((e: NotificationEvent) => NOTIFICATION_EVENT_META[e].channels.includes(channel)).every(
      (e: NotificationEvent) => (prefs.notifications as any)[e][channel],
    );

  return (
    <SettingsStack>
      {/* ── Notificaciones ── */}
      <SettingsCard
        title="Notificaciones"
        description="Elige por dónde te avisamos de cada cosa. Sólo aparecen los canales que ese aviso realmente usa."
        icon={<Bell className="w-5 h-5 text-[var(--cyan)]" />}
      >
        {!hasWhatsapp && (
          <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl border border-[var(--amber)]/20 bg-[var(--amber)]/5">
            <AlertTriangle className="w-4 h-4 text-[var(--amber)] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[var(--amber)] leading-relaxed">
              No tienes número de WhatsApp guardado, así que ese canal no puede entregarte nada.
              Añádelo en{" "}
              <Link href="/dashboard/settings/profile" className="underline font-semibold">
                tu perfil
              </Link>
              .
            </p>
          </div>
        )}

        {/* Cabecera de canales: apagado masivo por columna */}
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_repeat(3,84px)] gap-2 pb-3 mb-1 border-b border-[var(--hairline)]">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-muted)] self-end">
            Avisarme cuando…
          </span>
          {(Object.keys(CHANNEL_META) as NotificationChannel[]).map((channel) => {
            const Icon = CHANNEL_META[channel].icon;
            const allOn = channelAllOn(channel);
            return (
              <button
                key={channel}
                onClick={() => setChannelEverywhere(channel, !allOn)}
                title={allOn ? `Desactivar ${CHANNEL_META[channel].label} en todo` : `Activar ${CHANNEL_META[channel].label} en todo`}
                className="flex flex-col items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] hover:text-[var(--cyan)] transition-colors"
              >
                <Icon className="w-4 h-4" />
                {CHANNEL_META[channel].short}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col">
          {NOTIFICATION_EVENTS.map((event: NotificationEvent, index: number) => {
            const meta = NOTIFICATION_EVENT_META[event];
            const last = index === NOTIFICATION_EVENTS.length - 1;

            return (
              <div
                key={event}
                className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_repeat(3,84px)] gap-3 sm:gap-2 items-center py-4 ${
                  last ? "" : "border-b border-[var(--hairline)]"
                }`}
              >
                <div className="min-w-0 sm:pr-4">
                  <div className="text-[13px] font-medium text-[var(--foreground)]">{meta.label}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                    {meta.description}
                  </div>
                </div>

                {(Object.keys(CHANNEL_META) as NotificationChannel[]).map((channel) => {
                  const supported = meta.channels.includes(channel);
                  const Icon = CHANNEL_META[channel].icon;

                  return (
                    <div key={channel} className="flex items-center justify-between sm:justify-center gap-2">
                      {/* Etiqueta sólo en móvil, donde no hay cabecera de columnas */}
                      <span className="sm:hidden text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        {CHANNEL_META[channel].label}
                      </span>

                      {supported ? (
                        <Toggle
                          size="sm"
                          checked={(prefs.notifications as any)[event][channel]}
                          onChange={(value) => setChannel(event, channel, value)}
                          disabled={channel === "whatsapp" && !hasWhatsapp}
                          label={`${meta.label} por ${CHANNEL_META[channel].label}`}
                        />
                      ) : (
                        <span
                          className="text-[10px] text-[var(--text-muted)] opacity-40"
                          title="Este aviso no se envía por este canal"
                        >
                          —
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {/* ── Interfaz ── */}
      <SettingsCard
        title="Interfaz"
        description="Ajustes visuales de esta cuenta. Se sincronizan con todos tus dispositivos."
        icon={<Monitor className="w-5 h-5 text-[var(--cyan)]" />}
      >
        <div className="pb-6 mb-1 border-b border-[var(--hairline)]">
          <label className="text-[13px] font-medium text-[var(--foreground)] block mb-1">Tema</label>
          <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed max-w-xl">
            «Sistema» sigue la configuración de tu equipo. Tu elección queda guardada en la cuenta,
            así que te acompaña a cualquier dispositivo.
          </p>
          <ThemeSwitcher />
        </div>

        <div className="flex flex-col">
          <ToggleRow
            label="Reducir movimiento"
            description="Desactiva animaciones y transiciones. Útil si te marean o si el equipo va lento."
            checked={prefs.reduceMotion}
            onChange={(value) => apply({ reduceMotion: value })}
          />
          <ToggleRow
            label="Tablas compactas"
            description="Filas más bajas en tablas y listados para ver más información sin hacer scroll."
            checked={prefs.compactTables}
            onChange={(value) => apply({ compactTables: value })}
            last
          />
        </div>
      </SettingsCard>
    </SettingsStack>
  );
}
