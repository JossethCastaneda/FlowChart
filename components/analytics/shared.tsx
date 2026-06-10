import { TrendingUp, TrendingDown, Eye, Heart, Users, BarChart2, ArrowUpRight, ArrowDownRight, MessageCircle, Share2, Grid3X3, List, ChevronUp, ChevronDown, Camera, ThumbsUp, Clock, UserPlus, Activity, Info, Play, Bookmark, Film, Star, Loader2, Check } from "lucide-react";
import React from "react";

export const ChannelIcons: Record<string, React.ElementType> = {
      Instagram: Camera,
      Facebook: ThumbsUp,
    };
export const TABS = ["Resumen", "Posts", "Audiencia", "Historias", "Reels", "Mejor Horario", "Crecimiento"] as const;

export type Tab = (typeof TABS)[number];
export type Kpi = {
      label: string;
      value: string;
      change: string;
      positive: boolean;
      icon: React.ElementType;
      color: string;
      accent: string;
      compareValue?: string; // e.g. "vs periodo anterior: 12,340"
    };

export const EMPTY_KPI: Kpi[] = [
      { label: "Alcance", value: "—", change: "—", positive: true, icon: Eye, color: "#00d4ff", accent: "cyan" },
      { label: "Engagement", value: "—", change: "—", positive: true, icon: Heart, color: "#f472b6", accent: "pink" },
      { label: "Seguidores", value: "—", change: "—", positive: true, icon: Users, color: "#06d6a0", accent: "emerald" },
      { label: "Impresiones", value: "—", change: "—", positive: true, icon: BarChart2, color: "#7b61ff", accent: "purple" },
    ];
export const AUDIENCE_DEVICE: { label: string; pct: number; color: string }[] = [];
export const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const HOURS = Array.from({ length: 24 }, (_, i) => i);



export function generateHeatmap(): number[][] {
    return Array.from({ length: 7 }, () => Array(24).fill(0));
}
