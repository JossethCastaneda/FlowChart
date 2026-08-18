import { withWorkspace } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { rateLimit, getClientIP } from "@/lib/ratelimit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getWorkspaceAiProvider, hasAnyProvider, normalizeUpstreamError } from "@/lib/ai";
import { checkAiLimit, recordAiUsage } from "@/lib/ai/metering";

/**
 * POST /api/gridia
 *
 * GridIA (parrillas de contenido) sobre la capa LLM multi-proveedor: usa la IA
 * que el workspace contrató en el catálogo (Gemini/GPT/Claude) vía
 * getWorkspaceAiProvider. Los brandbooks adjuntos viajan como attachments
 * multimodales. Las API keys NUNCA llegan al cliente.
 *
 * Security:
 * - Requires authenticated session
 * - Requires active workspace membership
 * - Rate limited to 10 requests per minute per user
 * - Input validated with Zod
 */

const VIDEO_AI_TOOLS = [
  { name: "Seedance 1.0 Pro", credits: 250 },
  { name: "Seedance 1.0 Lite", credits: 200 },
  { name: "Kling 2.1 Master", credits: 1400 },
  { name: "Kling 2.1", credits: 300 },
  { name: "Kling 2.0", credits: 1400 },
  { name: "Kling 1.6 Pro", credits: 500 },
  { name: "Kling 1.6 Standard", credits: 300 },
  { name: "Kling 1.6 Elements", credits: 500 },
  { name: "MiniMax Hailuo 02", credits: 300 },
  { name: "MiniMax", credits: 500 },
  { name: "MiniMax Director", credits: 600 },
  { name: "MiniMax Reference", credits: 700 },
  { name: "MiniMax Live Illustrations", credits: 600 },
  { name: "Google Veo 3", credits: 12000 },
  { name: "Google Veo 3 Fast", credits: 6400 },
  { name: "Google Veo 2", credits: 1000 },
  { name: "Runway Gen 4", credits: 500 },
  { name: "PixVerse 4.5", credits: 825 },
];

// JSON Schema ESTÁNDAR (minúsculas): la capa lib/ai lo traduce al dialecto de
// cada proveedor (Gemini responseSchema, OpenAI strict, Anthropic output_config).
export const GRID_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dia: { type: "integer", description: "Day of the month for posting." },
          ideaPrincipal: { type: "string" },
          enfoquePublicacion: {
            type: "string",
            description: "Inbound Marketing Stage (Attract, Convert, Close, Delight).",
          },
          copyIn: {
            type: "string",
            description: "Short, impactful headline. Maximum 5 words. MUST NOT contain the brand name.",
          },
          copyOut: {
            type: "string",
            description: "Main body text. Maximum 2 paragraphs. MUST NOT contain the brand name.",
          },
          explicacionArte: { type: "string" },
          formatoArte: { type: "string", enum: ["Imagen", "Video"] },
          masterPromptMidjourney: { type: "string" },
          videoDetails: {
            type: "object",
            properties: {
              numEscenas: { type: "integer" },
              videoAITool: { type: "string" },
              promptsEscenasMidjourney: { type: "array", items: { type: "string" } },
              promptsVideoAI: { type: "array", items: { type: "string" } },
            },
          },
          pasoAPaso: { type: "string" },
        },
        required: [
          "dia",
          "ideaPrincipal",
          "enfoquePublicacion",
          "copyIn",
          "copyOut",
          "explicacionArte",
          "formatoArte",
          "masterPromptMidjourney",
          "pasoAPaso",
        ],
      },
    },
    creditos: {
      type: "object",
      properties: {
        min: { type: "integer" },
        max: { type: "integer" },
        summary: { type: "string" },
      },
      required: ["min", "max", "summary"],
    },
  },
  required: ["posts", "creditos"],
};

// Validación runtime de la respuesta del LLM (independiente del proveedor).
// passthrough: los campos extra no rompen; la UI usa los tipados.
const GridVideoDetailsZod = z
  .object({
    numEscenas: z.number().optional(),
    videoAITool: z.string().optional(),
    promptsEscenasMidjourney: z.array(z.string()).optional(),
    promptsVideoAI: z.array(z.string()).optional(),
  })
  .passthrough();

const GridResultZod = z
  .object({
    posts: z.array(
      z
        .object({
          dia: z.number(),
          ideaPrincipal: z.string(),
          enfoquePublicacion: z.string(),
          copyIn: z.string(),
          copyOut: z.string(),
          explicacionArte: z.string(),
          formatoArte: z.string(),
          masterPromptMidjourney: z.string(),
          videoDetails: GridVideoDetailsZod.nullish(),
          pasoAPaso: z.string(),
        })
        .passthrough(),
    ),
    creditos: z.object({ min: z.number(), max: z.number(), summary: z.string() }).passthrough(),
  })
  .passthrough();

const BrandFileSchema = z.object({
  mimeType: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  ]),
  data: z.string().refine(
    (s) => Buffer.from(s, "base64").length <= 4 * 1024 * 1024,
    "El archivo excede el límite de 4MB",
  ),
});

const BodySchema = z.object({
  client: z.string().trim().min(1).max(200),
  offer: z.string().trim().min(1).max(2000),
  month: z.string().trim().min(1).max(50),
  postCount: z.number().int().min(1).max(60),
  focus: z.array(z.string().max(100)).max(20),
  formats: z.string().trim().max(200),
  comments: z.string().max(5000).optional(),
  brandFiles: z.array(BrandFileSchema).max(5).default([]),
});

type GridFormData = z.infer<typeof BodySchema>;

function buildGridPrompt(formData: GridFormData): string {
  let brandGuidelines = `
- **Client Name:** ${formData.client}
- **Brand Scouting:** Based on the client name, perform a brief online scouting of the brand to understand its core business, audience, and current voice.
`;
  if (formData.brandFiles.length > 0) {
    brandGuidelines += `\n- **Brand Documents:** ${formData.brandFiles.length} brand document(s) have been provided (e.g., Brandbook, Voice & Tone Manual). Analyze them as the primary source for brand guidelines, visual identity, and key messaging.`;
  }
  if (formData.brandFiles.length === 0 && formData.client.toLowerCase() === "bait") {
    brandGuidelines += `\n- **Default Bait Brand Voice & Tone:** Modern, accessible, friendly, and empowering. It avoids technical jargon. The tone is optimistic, energetic, and focuses on the value of staying connected without breaking the bank. It's for everyone, from students to entrepreneurs. Key themes are freedom, possibility, and smart savings.`;
  }

  return `
You are a world-class Content Grid Architect named 'GridIA'. Your expertise spans Marketing, Communication, Advertising, Journalism, and Digital Media. You specialize in creating omnichannel content strategies for Facebook, Instagram, TikTok, and LinkedIn, with a sharp focus on performance, brand safety, and Inbound Marketing. You are a master of SEO, Content Strategy, creative for Paid Media, and applying AI (Gemini-first) for content generation. Your process is meticulous, translating business objectives into content pillars, ideating from outlines to A/B test variants, and creating detailed briefs for designers and video editors.

Your task is to generate a complete, professional content grid based on the following parameters. You MUST analyze any provided files (brandbook, voice/tone manual) to ensure the output is perfectly aligned with the client's brand.

**Client & Brand Guidelines:**
${brandGuidelines}
- **Commercial Offer:** ${formData.offer}
${formData.comments ? `- **General Comments:** ${formData.comments}` : ""}

**Campaign Parameters:**
- **Month:** ${formData.month}. You MUST incorporate nationally relevant themes for Mexico in this month. For September, this includes 'Mes de la Patria' (Patriotism Month), Mexican Independence Day (September 16th), 'Back to School/University', and the change of seasons.
- **Number of Posts:** ${formData.postCount}
- **Grid Focus:** A mix of the following, with emphasis on all selected: ${formData.focus.join(", ")}. The goal is to drive 'portabilidad' (users switching their number to the client).
- **Formats:** A balanced mix of ${formData.formats}.
- **Methodology:** All content ideas MUST strictly adhere to the Inbound Marketing methodology (Attract, Convert, Close, Delight stages).

**Output Requirements:**
You must generate a JSON object that conforms to the provided JSON schema. It should contain a 'posts' array with exactly ${formData.postCount} post objects and a 'creditos' object.

**Language Requirement:** All response fields, including 'ideaPrincipal', 'enfoquePublicacion', 'copyIn', 'copyOut', 'explicacionArte', 'pasoAPaso', and 'creditos.summary', MUST be written in Spanish. The prompts for image and video generation ('masterPromptMidjourney', 'promptsEscenasMidjourney', 'promptsVideoAI') MUST be written in English.

For each post:
1.  **Day:** Assign a day of the month for the post.
2.  **Idea & Copy:** Develop a compelling core idea.
    - **copyIn:** MUST be a short, impactful headline. **Maximum 5 words.** It **MUST NOT** contain the client's brand name ('${formData.client}').
    - **copyOut:** The main body text. **Maximum 2 paragraphs.** It **MUST NOT** contain the client's brand name ('${formData.client}').
3.  **Art Direction:** Provide a clear explanation for the visual concept.
4.  **Midjourney Prompts:** Create a detailed, effective 'Master Prompt' for Midjourney to generate the required image. Use a cinematic, high-quality style.
5.  **Video Breakdown (if applicable):**
    - Specify the number of scenes.
    - For each scene, provide a separate Midjourney prompt to generate the source image.
    - For each scene, provide a prompt for a Video AI tool.
    - Select one of the provided Video AI tools that best fits the creative concept and include its name.
6.  **Execution Guide:** Write a brief, clear 'Paso a paso' guide for a human operator to create the final asset.
7.  **Credit Calculation:** Calculate the minimum and maximum credit cost for the entire grid. Assume all images cost 1 credit each. For videos, use the credit cost of the selected AI tool. Provide a total summary in the 'creditos.summary' field.
    - Available Video AI Tools: ${JSON.stringify(VIDEO_AI_TOOLS)}

Your output must be professional, strategic, and ready for a high-performance marketing team to execute.
`;
}

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  // Rate limit — 10 requests per minute per user
  const ip = getClientIP(req);
  const { ok } = await rateLimit(`gridia:${ctx.userId}:${ip}`, 10, 60_000);
  if (!ok) {
    return apiError("Demasiadas solicitudes. Intenta en un momento.", "RATE_LIMITED", 429);
  }

  // Validate input
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return apiError("JSON inválido", "INVALID_JSON", 400);
  }
  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return apiError(`Datos inválidos: ${msg}`, "VALIDATION_ERROR", 422);
  }

  if (!hasAnyProvider()) {
    logger.error("[GridIA] Ningún proveedor LLM configurado");
    return apiError("IA no configurada en el servidor", "SERVER_CONFIG", 500);
  }


  const limit = await checkAiLimit(ctx.workspaceId);
  if (!limit.allowed) {
    return apiError(limit.message, "QUOTA_EXCEEDED", 403);
  }

  // La IA contratada en el catálogo del workspace genera la parrilla; los
  // brandbooks van como adjuntos multimodales (Gemini/GPT/Claude los soportan).
  try {
    const { provider, model } = await getWorkspaceAiProvider(ctx.workspaceId);
    const result = await provider.completeStructured({
      model,
      messages: [{ role: "user", content: buildGridPrompt(parsed.data) }],
      attachments: parsed.data.brandFiles.map((f) => ({ mimeType: f.mimeType, data: f.data })),
      schemaName: "gridia_content_grid",
      jsonSchema: GRID_SCHEMA,
      parse: (raw) => GridResultZod.parse(raw),
      maxTokens: 16000,
    });
    logger.info("[GridIA] Parrilla generada", {
      workspaceId: ctx.workspaceId,
      provider: result.provider,
      model: result.model,
      posts: result.data.posts.length,
    });
    
    if (result.usage) {
      await recordAiUsage(
        ctx.workspaceId,
        "/api/gridia",
        result.model,
        result.usage.promptTokens,
        result.usage.completionTokens,
        { provider: result.provider, feature: "gridia" }
      );
    }
    
    return NextResponse.json(result.data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.error("[GridIA] Respuesta del LLM no cumple el schema", { issues: err.issues.slice(0, 5) });
      return apiError("Respuesta de IA con formato inválido", "UPSTREAM_PARSE_ERROR", 502);
    }
    return normalizeUpstreamError(err);
  }
});
