import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const botId = req.nextUrl.searchParams.get("botId");
  
  if (!botId || botId === "all") {
    return apiSuccess({ botId: "all" });
  }

  // Placeholder data para el dashboard ejecutivo. 
  // En un ambiente real, esto calcularía sobre las sesiones de Botmaker:
  // cruzando intelix_success y zapier_prepago_success
  return apiSuccess({
    botId,
    botName: `Bot ${botId}`,
    totalSessions: 3450,
    intelixSales: 450,
    conversionRate: 13.0,
    rejectionRate: 5.2,
    intelixRejections: 180,
    zapierEvents: 420,
    timeline: [
      { date: "Lun", sales: 45, previousSales: 40 },
      { date: "Mar", sales: 55, previousSales: 48 },
      { date: "Mie", sales: 60, previousSales: 50 },
      { date: "Jue", sales: 40, previousSales: 55 },
      { date: "Vie", sales: 70, previousSales: 65 },
      { date: "Sab", sales: 90, previousSales: 80 },
      { date: "Dom", sales: 90, previousSales: 85 }
    ],
    funnel: [
      { key: "started", label: "Sesiones Iniciadas", count: 3450 },
      { key: "bot_flow", label: "Terminó Flujo Bot", count: 1200 },
      { key: "intelix_approved", label: "Aprobado Intelix", count: 450 },
      { key: "zapier_sent", label: "Enviado a Zapier/CAPI", count: 420 }
    ],
    patterns: {
      avgBotResponseMs: 1100,
      avgUserResponseMs: 14500,
      avgInteractions: 9.2,
      timeToNip: "1m 15s",
      timeToPhone: "2m 05s"
    },
    channels: [
      { channel: "WhatsApp", count: 2100 },
      { channel: "Facebook", count: 800 },
      { channel: "Instagram", count: 450 },
      { channel: "Webchat", count: 100 }
    ]
  });
});
