# 05 · Contenido y voz

> Cómo escribe Zefirus. El texto es interfaz: un buen microcopy evita un tooltip, una duda o
> un ticket de soporte. Este documento fija idioma, tono, el modelo etiqueta/esencia y la voz
> de Orbi.

---

## 1. Idioma

- **Español (neutro/latam) es el idioma primario** del producto y del contenido. Todo el UI
  visible se escribe en español.
- **Términos técnicos del dominio se mantienen en su forma reconocida**: "ROAS", "CPM",
  "adset", "workspace", "brief", "insights". Traducir estos términos confunde al profesional
  de marketing más de lo que ayuda.
- Nombres de plataformas y productos, en su forma oficial: Meta, Instagram, WhatsApp, Google Ads.
- Deuda conocida: conviven `components/projects/` (EN) y `components/proyectos/` (ES) por
  naming histórico — no crear una tercera variante; en UI visible siempre "Clientes"/"Proyectos".
- Internacionalización (i18n) completa es roadmap; escribir strings pensando en que algún día
  se extraen (sin concatenar frases, sin texto incrustado en imágenes).

---

## 2. Tono de voz

Zefirus habla como **un colega experto y directo**: claro, sin relleno, respetuoso del tiempo
del usuario. No es corporativo acartonado ni "coach motivacional".

| Atributo | Sí | No |
|----------|-----|-----|
| **Claro** | "No hay campañas activas" | "Actualmente no se encontraron elementos" |
| **Directo** | "Conecta Meta para ver datos" | "Quizás quieras considerar conectar una cuenta" |
| **Humano** | "Algo falló al sincronizar. Reintenta." | "Error 500: internal server error" |
| **Sobrio** | "Publicado" | "¡Listo!! 🎉🚀 Tu post está VIVO" |
| **Honesto** | "Datos con baja confianza (última sync hace 3 días)" | ocultar la incertidumbre |

Reglas rápidas:
- Verbos en **imperativo** para acciones ("Conecta", "Programa", "Revisa"), no infinitivos
  sueltos donde haya acción directa.
- **Sin emojis en el UI** (regla dura del design system). El tono se logra con las palabras.
- Frases cortas. Una idea por frase. La densidad visual ya es alta; el texto no la agrava.
- Mayúsculas: _sentence case_ en títulos y botones ("Programar publicación", no "Programar
  Publicación" ni "PROGRAMAR PUBLICACIÓN"). Excepción: `.t-label` (etiquetas de 10px en
  mayúsculas con tracking, uso decorativo-funcional puntual).

---

## 3. El modelo etiqueta / esencia en el contenido

(Ver [02-arquitectura-informacion](02-arquitectura-informacion.md) §1.)

- **`label`** = el nombre funcional que lee el usuario en navegación, títulos y breadcrumbs.
  Siempre gana en superficies de uso. Ej.: "Inbox", "Anuncios", "Reportes".
- **`code` / esencia** = la identidad narrativa (color, ícono, lema, voz de Orbi). Aparece en
  el header del módulo como acompañamiento, en Orbi y en momentos de marca. Ej.: "Señal",
  "Impulso", "Bitácora".
- **`tagline`** = una línea que resume el valor del módulo, para headers y onboarding:
  "Cada mensaje, un solo canal" (Inbox), "Empuje para tus campañas" (Anuncios).

Regla: **nunca uses el codename solo como etiqueta de menú.** El usuario navega por función,
no por metáfora.

---

## 4. Microcopy por situación

| Situación | Patrón de texto | Ejemplo |
|-----------|-----------------|---------|
| Estado vacío (`EmptyState`) | Qué falta + acción | "Aún no hay briefs. Crea el primero con IA." |
| Error (`toast`) | Qué pasó + qué hacer | "No pudimos conectar con Meta. Reintenta o revisa la integración." |
| Confirmación destructiva (`ConfirmModal`) | Consecuencia explícita | "Esto eliminará la campaña y su historial. No se puede deshacer." |
| Éxito (`toast`) | Resultado en 1–2 palabras | "Publicado", "Guardado", "Sincronizado" |
| Carga (`Skeleton`) | Sin texto; el esqueleto comunica | — |
| Dato de baja confianza | Etiqueta honesta | "Estimado · última sync hace 2 h" |
| Acción de IA | Sugerencia + control | "Orbi sugiere pausar 2 anuncios por fatiga. Revisar." |

Botones: el texto dice la acción concreta, no "OK/Enviar" genérico → "Programar", "Conectar
Meta", "Generar brief", "Eliminar campaña".

---

## 5. La voz de Orbi (copiloto de IA)

Orbi es el copiloto transversal. Su voz sigue el tono general (colega experto) **más**:

- **Sugiere, no ordena** (principio P7). "Podrías…", "Detecté…", "Te conviene revisar…" —
  nunca ejecuta acciones costosas sin confirmación.
- **Cita su fuente y su confianza.** "Según los últimos 7 días…", "con confianza media…".
  La IA honesta sobre su incertidumbre es coherente con P4.
- **Habla en el idioma de la esencia del módulo** donde está. En Inbox es "Señal", en
  Anuncios es "Impulso": puede usar esa narrativa ligera sin volverse críptica.
- **Breve.** Orbi no monologa; da el insight y el siguiente paso.
- Cuando no sabe, lo dice. No inventa métricas.

---

## 6. Números, fechas y datos

- Números con fuente **mono tabular** (`.t-kpi`), separador de miles local, y unidad clara
  ("$", "%", "K/M" para abreviar grandes cifras de forma consistente).
- Moneda: mostrar el símbolo/ISO del cliente; no asumir una sola divisa (multi-tenant).
- Fechas relativas para frescura ("hace 3 h", "ayer") y absolutas para registros/exportes.
- Rangos con `DateRangePicker`; el rango activo siempre visible en la vista.

---

## 7. Checklist de contenido para PR

- [ ] Español neutro; términos de dominio en su forma reconocida.
- [ ] Tono directo y humano; sin relleno corporativo ni emojis.
- [ ] Botones nombran la acción concreta.
- [ ] Errores dicen qué pasó **y** qué hacer.
- [ ] Estados vacíos ofrecen la acción siguiente.
- [ ] Se muestra la función (`label`), no el codename, en navegación.
- [ ] Datos inciertos etiquetados con honestidad.
