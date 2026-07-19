/**
 * BotMaker module barrel.
 * Re-exports everything from the sub-modules so that existing imports from
 * "@/lib/botmaker" continue to work without any changes.
 *
 * Sub-modules:
 *   - types.ts      — All interfaces and type definitions
 *   - connection.ts — Token resolution, SSRF prevention, HTTP client
 *   - channels.ts   — Channel listing, caching, platform normalization
 *
 * Analytics functions (sessions, metrics, quality scoring) remain in the
 * original lib/botmaker.ts which now re-exports from this index for backward
 * compatibility.
 */

export * from "./types";
export * from "./connection";
export * from "./channels";
