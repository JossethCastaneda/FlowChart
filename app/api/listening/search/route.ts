import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";

/**
 * GET /api/listening/search
 * 
 * Keyword Intelligence endpoint — busca una keyword en el ecosistema de la marca
 * (posts propios + @menciones + comentarios en Meta) y usa Gemini para análisis
 * de sentimiento, extracción de temas y score de keyword.
 * 
 * Query params:
 *   q        — keyword o #hashtag a buscar (required)
 *   period   — "7d" | "30d" | "90d" (default: "7d")
 * 
 * Returns:
 *   metrics  — totals: mentions, interactions, reach, sentimentScore
 *   timeseries — { date, count, positive, negative, neutral }[]
 *   sentiment — { positive, negative, neutral, themes }
 *   topics   — { text, size, sentiment }[]
 *   posts    — raw posts/mentions containing the keyword
 *   heatmap  — { day, hour, count }[]
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q param required" }, { status: 400 });

  const period = (request.nextUrl.searchParams.get("period") || "7d") as "7d" | "30d" | "90d";
  const periodDays = period === "90d" ? 90 : period === "30d" ? 30 : 7;

  // Cutoff date
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const keyword = q.replace(/^#/, "").toLowerCase();

  // ── Fetch both tokens in parallel ────────────────────────────────────────
  const [fbToken, igToken] = await Promise.all([
    getMetaAccessToken(request, "listening").catch(() => null),
    getMetaAccessToken(request, "ig_inbox").catch(() => null),
  ]);

  if (!fbToken && !igToken) {
    return NextResponse.json({ error: "No Meta token — please connect at least one integration" }, { status: 401 });
  }

  // ── Fetch FB pages ────────────────────────────────────────────────────────
  let fbPages: any[] = [];
  if (fbToken) {
    try {
      const r = await metaFetch(
        metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account", limit: "20" }),
        fbToken
      );
      const d = await r.json();
      fbPages = d.data || [];
    } catch { /* skip */ }
  }

  // ── Fetch IG pages (from Instagram Publisher token) ────────────────────────
  let igPages: any[] = [];
  if (igToken) {
    try {
      const r = await metaFetch(
        metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "20" }),
        igToken
      );
      const d = await r.json();
      igPages = d.data || [];
    } catch { /* skip */ }
  }

  // ── Gather raw content in parallel ────────────────────────────────────────
  const rawPosts: Array<{
    id: string;
    platform: "facebook" | "instagram";
    text: string;
    author: string;
    url: string | null;
    publishedAt: string;
    likes: number;
    comments: number;
    shares: number;
    type: "post" | "comment" | "mention";
  }> = [];

  const fetchers: Promise<void>[] = [];

  // ── Facebook: own feed ────────────────────────────────────────────────────
  for (const page of fbPages) {
    const pt = page.access_token || fbToken;

    fetchers.push(
      metaFetch(
        metaUrl(`${page.id}/published_posts`, {
          fields: "id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)",
          since: Math.floor(new Date(since).getTime() / 1000).toString(),
          limit: "50",
        }),
        pt
      )
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          for (const post of (d?.data || [])) {
            if (!post.message?.toLowerCase().includes(keyword)) continue;
            rawPosts.push({
              id: post.id,
              platform: "facebook",
              text: post.message || "",
              author: page.name,
              url: post.permalink_url || null,
              publishedAt: post.created_time,
              likes: post.likes?.summary?.total_count || 0,
              comments: post.comments?.summary?.total_count || 0,
              shares: post.shares?.count || 0,
              type: "post",
            });
          }
        })
        .catch(() => {})
    );

    // FB tagged posts
    fetchers.push(
      metaFetch(
        metaUrl(`${page.id}/tagged`, {
          fields: "id,message,from,created_time,permalink_url",
          limit: "30",
        }),
        pt
      )
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          for (const post of (d?.data || [])) {
            if (!post.message?.toLowerCase().includes(keyword)) continue;
            rawPosts.push({
              id: `tag_${post.id}`,
              platform: "facebook",
              text: post.message || "",
              author: post.from?.name || "Usuario",
              url: post.permalink_url || null,
              publishedAt: post.created_time,
              likes: 0,
              comments: 0,
              shares: 0,
              type: "mention",
            });
          }
        })
        .catch(() => {})
    );

    // FB post comments (scan for keyword)
    fetchers.push(
      metaFetch(
        metaUrl(`${page.id}/feed`, {
          fields: "id,message,created_time,comments.limit(25){id,message,from,created_time,like_count}",
          since: Math.floor(new Date(since).getTime() / 1000).toString(),
          limit: "20",
        }),
        pt
      )
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          for (const post of (d?.data || [])) {
            for (const c of (post.comments?.data || [])) {
              if (!c.message?.toLowerCase().includes(keyword)) continue;
              rawPosts.push({
                id: `fbc_${c.id}`,
                platform: "facebook",
                text: c.message || "",
                author: c.from?.name || "Usuario",
                url: null,
                publishedAt: c.created_time,
                likes: c.like_count || 0,
                comments: 0,
                shares: 0,
                type: "comment",
              });
            }
          }
        })
        .catch(() => {})
    );
  }

  // ── Instagram: own media + comments + @tags ────────────────────────────────
  for (const page of igPages) {
    const pt = page.access_token || igToken;
    const igId = page.instagram_business_account?.id;
    if (!igId) continue;

    fetchers.push(
      metaFetch(
        metaUrl(`${igId}/media`, {
          fields: "id,caption,timestamp,permalink,like_count,comments_count,comments.limit(25){id,text,from{username},timestamp,like_count}",
          limit: "50",
        }),
        pt
      )
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          for (const m of (d?.data || [])) {
            const pub = new Date(m.timestamp).getTime();
            if (pub < new Date(since).getTime()) continue;

            // Caption match
            if (m.caption?.toLowerCase().includes(keyword)) {
              rawPosts.push({
                id: m.id,
                platform: "instagram",
                text: m.caption || "",
                author: page.instagram_business_account?.username || page.name,
                url: m.permalink || null,
                publishedAt: m.timestamp,
                likes: m.like_count || 0,
                comments: m.comments_count || 0,
                shares: 0,
                type: "post",
              });
            }

            // Comments matching keyword
            for (const c of (m.comments?.data || [])) {
              if (!c.text?.toLowerCase().includes(keyword)) continue;
              rawPosts.push({
                id: `igc_${c.id}`,
                platform: "instagram",
                text: c.text || "",
                author: c.from?.username || "usuario",
                url: m.permalink || null,
                publishedAt: c.timestamp,
                likes: c.like_count || 0,
                comments: 0,
                shares: 0,
                type: "comment",
              });
            }
          }
        })
        .catch(() => {})
    );

    // IG @mentions (posts where account is tagged)
    fetchers.push(
      metaFetch(
        metaUrl(`${igId}/tags`, {
          fields: "id,caption,username,timestamp,permalink",
          limit: "30",
        }),
        pt
      )
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          for (const m of (d?.data || [])) {
            if (!m.caption?.toLowerCase().includes(keyword)) continue;
            rawPosts.push({
              id: `igm_${m.id}`,
              platform: "instagram",
              text: m.caption || "",
              author: m.username || "Usuario",
              url: m.permalink || null,
              publishedAt: m.timestamp,
              likes: 0,
              comments: 0,
              shares: 0,
              type: "mention",
            });
          }
        })
        .catch(() => {})
    );
  }

  await Promise.allSettled(fetchers);

  logger.info("[LISTENING SEARCH] Raw posts collected", { keyword, count: rawPosts.length, period });

  // ── Deduplicate ───────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const posts = rawPosts.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // ── Sort by date desc ─────────────────────────────────────────────────────
  posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // ── Gemini Analysis ───────────────────────────────────────────────────────
  let sentimentData = {
    positive: 0, negative: 0, neutral: 0,
    positiveThemes: ["Recomendaciones", "Experiencias positivas", "Comunidad"],
    negativeThemes: ["Dudas frecuentes", "Solicitudes de mejora"],
    neutralThemes: ["Preguntas", "Consultas generales"],
  };
  let topics: Array<{ text: string; size: number; sentiment: "positive" | "negative" | "neutral" }> = [];
  let postsWithSentiment: typeof posts = [];

  if (posts.length > 0 && GEMINI_KEY) {
    const corpus = posts.slice(0, 50).map(p => p.text).join("\n---\n").slice(0, 8000);
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
      const prompt = `Analiza estos textos que contienen la keyword "${q}" y genera un JSON con:
1. sentiment_distribution: { positive: number (0-100), negative: number (0-100), neutral: number (0-100) }
2. positive_themes: string[] (3-5 temas principales que generan sentimiento positivo)
3. negative_themes: string[] (3-5 temas principales que generan sentimiento negativo)
4. neutral_themes: string[] (2-3 temas neutrales)
5. topics: { text: string, size: number (1-100 proporcional a frecuencia), sentiment: "positive"|"negative"|"neutral" }[] (15-20 términos/temas relacionados)
6. per_post_sentiment: string[] (array del mismo length que los textos, cada elemento: "positive", "negative", o "neutral")

Textos (${posts.slice(0, 50).length} items):
---
${corpus}
---

IMPORTANTE: Responde SOLO con JSON válido, sin markdown.`;

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2000,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "{}";
        const analysis = JSON.parse(text);

        sentimentData = {
          positive: analysis.sentiment_distribution?.positive ?? 33,
          negative: analysis.sentiment_distribution?.negative ?? 33,
          neutral: analysis.sentiment_distribution?.neutral ?? 34,
          positiveThemes: analysis.positive_themes || sentimentData.positiveThemes,
          negativeThemes: analysis.negative_themes || sentimentData.negativeThemes,
          neutralThemes: analysis.neutral_themes || sentimentData.neutralThemes,
        };

        topics = (analysis.topics || []).slice(0, 20).map((t: any) => ({
          text: t.text || "",
          size: Math.max(10, Math.min(100, t.size || 30)),
          sentiment: t.sentiment || "neutral",
        }));

        // Attach sentiment to posts
        const perSentiment: string[] = analysis.per_post_sentiment || [];
        postsWithSentiment = posts.slice(0, 50).map((p, i) => ({
          ...p,
          sentiment: (perSentiment[i] as "positive" | "negative" | "neutral") || "neutral",
        }));
        // Add remaining posts without sentiment
        postsWithSentiment.push(...posts.slice(50).map(p => ({ ...p, sentiment: "neutral" as const })));
      }
    } catch (err) {
      logger.warn("[LISTENING SEARCH] Gemini analysis failed", { err });
      // Fall back to rule-based
      postsWithSentiment = posts.map(p => {
        const lower = p.text.toLowerCase();
        const pos = ["excelente", "bueno", "gracias", "love", "genial", "increible", "perfecto", "gusto"].some(w => lower.includes(w));
        const neg = ["malo", "pesimo", "horrible", "error", "falla", "hate", "problema", "queja", "no funciona"].some(w => lower.includes(w));
        return { ...p, sentiment: pos ? "positive" : neg ? "negative" : "neutral" as "positive" | "negative" | "neutral" };
      });

      // Update sentiment counts
      const pc = postsWithSentiment.filter(p => (p as any).sentiment === "positive").length;
      const nc = postsWithSentiment.filter(p => (p as any).sentiment === "negative").length;
      const total = postsWithSentiment.length || 1;
      sentimentData.positive = Math.round((pc / total) * 100);
      sentimentData.negative = Math.round((nc / total) * 100);
      sentimentData.neutral = 100 - sentimentData.positive - sentimentData.negative;
    }
  } else {
    postsWithSentiment = posts.map(p => ({ ...p, sentiment: "neutral" as const }));
  }

  // Default topics if Gemini returned nothing
  if (topics.length === 0 && posts.length > 0) {
    // Extract most common words as fallback topics
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set(["de", "la", "el", "en", "y", "a", "que", "los", "las", "un", "una", "con", "por", "para", "es", "se", "del", "al", "the", "and", "is", "in", "of", "to", "a"]);
    for (const p of posts) {
      const words = p.text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w) && w !== keyword);
      for (const w of words) wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
    const sortedWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const maxFreq = sortedWords[0]?.[1] || 1;
    topics = sortedWords.map(([text, freq]) => ({
      text,
      size: Math.round((freq / maxFreq) * 90) + 10,
      sentiment: "neutral" as const,
    }));
  }

  // ── Build timeseries ──────────────────────────────────────────────────────
  const timeseriesMap: Record<string, { count: number; positive: number; negative: number; neutral: number }> = {};

  // Initialize all days in period
  for (let i = 0; i < periodDays; i++) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    timeseriesMap[key] = { count: 0, positive: 0, negative: 0, neutral: 0 };
  }

  for (const p of postsWithSentiment as any[]) {
    const key = new Date(p.publishedAt).toISOString().split("T")[0];
    if (timeseriesMap[key]) {
      timeseriesMap[key].count++;
      timeseriesMap[key][p.sentiment as "positive" | "negative" | "neutral"]++;
    }
  }

  const timeseries = Object.entries(timeseriesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // ── Build heatmap (day × hour) ────────────────────────────────────────────
  const heatmapMap: Record<string, number> = {};
  for (const p of postsWithSentiment) {
    const d = new Date(p.publishedAt);
    const day = d.getDay(); // 0=Sun
    const hour = d.getHours();
    const key = `${day}_${hour}`;
    heatmapMap[key] = (heatmapMap[key] || 0) + 1;
  }
  const heatmap = Object.entries(heatmapMap).map(([key, count]) => {
    const [day, hour] = key.split("_").map(Number);
    return { day, hour, count };
  });

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalInteractions = postsWithSentiment.reduce((acc, p) => acc + p.likes + p.comments + p.shares, 0);
  const estimatedReach = postsWithSentiment.length * 250; // Conservative estimate

  const metrics = {
    mentions: postsWithSentiment.length,
    interactions: totalInteractions,
    reach: estimatedReach,
    sentimentScore: sentimentData.positive,
    positiveCount: (postsWithSentiment as any[]).filter(p => p.sentiment === "positive").length,
    negativeCount: (postsWithSentiment as any[]).filter(p => p.sentiment === "negative").length,
    neutralCount: (postsWithSentiment as any[]).filter(p => p.sentiment === "neutral").length,
  };

  return NextResponse.json({
    keyword: q,
    period,
    metrics,
    timeseries,
    sentiment: sentimentData,
    topics,
    posts: postsWithSentiment.slice(0, 100), // Max 100 results
    heatmap,
    sources: {
      facebook: posts.filter(p => p.platform === "facebook").length,
      instagram: posts.filter(p => p.platform === "instagram").length,
    },
  });
}
