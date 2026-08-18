/**
 * lib/user-preferences-store.ts
 * =====================================================================
 * Store cliente de las preferencias del usuario.
 *
 * Existe para que un interruptor de Configuración tenga efecto inmediato en
 * toda la app: la pantalla de Preferencias escribe aquí y `UserPreferencesEffects`
 * (montado en el layout raíz) reacciona aplicando los atributos al <html>.
 * Sin esto, "Reducir movimiento" sólo cambiaba un booleano en la base de datos.
 *
 * Estrategia de lectura: localStorage primero (instantáneo, evita el parpadeo)
 * y luego el servidor, que manda porque sincroniza entre dispositivos.
 */
"use client";

import {
  DEFAULT_USER_PREFERENCES,
  parseUserPreferences,
  type UserPreferences,
} from "@/lib/product-profile";

const STORAGE_KEY = "sodare:prefs";

let current: UserPreferences = { ...DEFAULT_USER_PREFERENCES };
let hydrated = false;
let inflight: Promise<UserPreferences> | null = null;
const listeners = new Set<(prefs: UserPreferences) => void>();

function emit() {
  listeners.forEach((listener) => listener(current));
}

function readCache(): UserPreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseUserPreferences(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(prefs: UserPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* cuota llena o modo privado: no es crítico */
  }
}

export function getPreferences(): UserPreferences {
  return current;
}

export function subscribePreferences(listener: (prefs: UserPreferences) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Carga desde caché + servidor. Idempotente: varias llamadas comparten fetch. */
export function loadPreferences(force = false): Promise<UserPreferences> {
  if (typeof window === "undefined") return Promise.resolve(current);

  if (!hydrated) {
    const cached = readCache();
    if (cached) {
      current = cached;
      emit();
    }
    hydrated = true;
  }

  if (inflight && !force) return inflight;

  inflight = fetch("/api/user/preferences", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      const data = payload?.data ?? payload;
      if (data) {
        current = parseUserPreferences(data);
        writeCache(current);
        emit();
      }
      return current;
    })
    .catch(() => current)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/**
 * Aplica un cambio: optimista en local y persistido en el servidor. Si el
 * servidor falla, se revierte y se propaga el error para poder avisar.
 */
export async function updatePreferences(patch: Partial<UserPreferences>): Promise<void> {
  const previous = current;
  current = parseUserPreferences({ ...current, ...patch });
  writeCache(current);
  emit();

  try {
    const res = await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(current),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "No pudimos guardar tus preferencias.");
    }
    const payload = await res.json();
    const data = payload?.data ?? payload;
    if (data) {
      current = parseUserPreferences(data);
      writeCache(current);
      emit();
    }
  } catch (error) {
    current = previous;
    writeCache(current);
    emit();
    throw error;
  }
}
