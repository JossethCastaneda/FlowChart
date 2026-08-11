import strings from "./strings/es-MX.json";

type StringRecord = Record<string, any>;

/**
 * Helper to access deep properties in the strings JSON.
 * Usage: getString('estado.sincronizado', { tiempo: 'hace 5 min' })
 */
export function getString(path: string, interpolations?: Record<string, string | number>): string {
  const keys = path.split(".");
  let current: any = strings;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      console.warn(`[i18n] String not found for key: ${path}`);
      return path;
    }
  }

  if (typeof current !== "string") {
    console.warn(`[i18n] Key is not a string: ${path}`);
    return path;
  }

  let result = current;
  if (interpolations) {
    for (const [key, value] of Object.entries(interpolations)) {
      result = result.replace(new RegExp(`{${key}}`, "g"), String(value));
    }
  }

  return result;
}

/**
 * Hook for translating inside React components
 */
export function useTranslation() {
  return { t: getString };
}
