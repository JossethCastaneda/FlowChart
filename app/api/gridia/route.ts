import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";

/* ═══ TYPES ═══ */
interface FileInputData { mimeType: string; data: string; }
interface GridFormData {
  client: string; brandFiles: FileInputData[]; offer: string;
  month: string; postCount: number; focus: string[];
  formats: string; comments?: string;
}

/* ═══ CONSTANTS ═══ */
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

/* ═══ SCHEMA ═══ */
const schema = {
  type: Type.OBJECT,
  properties: {
    posts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dia: { type: Type.INTEGER, description: "Day of the month for posting." },
          ideaPrincipal: { type: Type.STRING },
          enfoquePublicacion: { type: Type.STRING, description: "Inbound Marketing Stage (Attract, Convert, Close, Delight)." },
          copyIn: { type: Type.STRING, description: "Short, impactful headline. Maximum 5 words. MUST NOT contain the brand name." },
          copyOut: { type: Type.STRING, description: "Main body text. Maximum 2 paragraphs. MUST NOT contain the brand name." },
          explicacionArte: { type: Type.STRING },
          formatoArte: { type: Type.STRING, enum: ["Imagen", "Video"] },
          masterPromptMidjourney: { type: Type.STRING },
          videoDetails: {
            type: Type.OBJECT,
            properties: {
              numEscenas: { type: Type.INTEGER },
              videoAITool: { type: Type.STRING },
              promptsEscenasMidjourney: { type: Type.ARRAY, items: { type: Type.STRING } },
              promptsVideoAI: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
          pasoAPaso: { type: Type.STRING },
        },
        required: ["dia", "ideaPrincipal", "enfoquePublicacion", "copyIn", "copyOut", "explicacionArte", "formatoArte", "masterPromptMidjourney", "pasoAPaso"],
      },
    },
    creditos: {
      type: Type.OBJECT,
      properties: {
        min: { type: Type.INTEGER },
        max: { type: Type.INTEGER },
        summary: { type: Type.STRING },
      },
      required: ["min", "max", "summary"],
    },
  },
  required: ["posts", "creditos"],
};

/* ═══ PROMPT BUILDER ═══ */
function buildPromptParts(formData: GridFormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];

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

  const promptText = `
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
  parts.push({ text: promptText });

  formData.brandFiles.forEach((file) => {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  });

  return parts;
}

/* ═══ API HANDLER ═══ */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const body = (await req.json()) as GridFormData;
    if (!body.client || !body.month || !body.postCount || body.postCount < 1 || body.postCount > 60) {
      return NextResponse.json({ error: "Invalid input: client, month, postCount (1-60) required" }, { status: 400 });
    }
    if (body.brandFiles && body.brandFiles.length > 5) {
      return NextResponse.json({ error: "Maximum 5 brand files allowed" }, { status: 400 });
    }
    const ai = new GoogleGenAI({ apiKey });
    const contentParts = buildPromptParts(body);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: contentParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const jsonText = (response.text ?? "").trim();
    const parsedData = JSON.parse(jsonText);

    if (!parsedData.posts || !parsedData.creditos) {
      return NextResponse.json({ error: "Invalid JSON structure from Gemini" }, { status: 500 });
    }

    return NextResponse.json(parsedData);
  } catch (err: unknown) {
    console.error("GridIA API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
