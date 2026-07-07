"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Bot,
  MessageSquare,
  Users,
  Radio,
  FileText,
  Bell,
  ShoppingCart,
  Webhook,
  CreditCard,
  ClipboardList,
  Key,
  ChevronRight,
  ChevronDown,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  Send,
  AlertTriangle,
  Eye,
  EyeOff,
  Link,
  Unlink,
  Plug,
  Zap,
  Shield,
  ExternalLink,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  Cpu,
} from "lucide-react";
import NextLink from "next/link";
import { GenerativeModelModal } from "@/components/botmaker/GenerativeModelModal";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "select" | "number" | "date";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  dynamicOptions?: "channels" | "agents";
};

type EndpointDef = {
  id: string;
  label: string;
  description: string;
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  fields?: FieldDef[];
  note?: string;
};

type Category = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  endpoints: EndpointDef[];
};

type ConnectionInfo = {
  connected: boolean;
  connectedAt?: string;
  connectedBy?: { name?: string | null; email?: string | null } | null;
  baseUrl?: string | null;
};

type PreloadedData = {
  channels: { id: string; name: string; platform: string }[];
  agents: { id: string; name: string; email: string }[];
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES DATA
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: "chats",
    label: "Chats",
    description: "Gestiona conversaciones activas",
    icon: MessageSquare,
    color: "var(--purple)",
    endpoints: [
      {
        id: "list-chats", label: "Listar Chats",
        description: "Obtén todas las conversaciones del bot con paginación.",
        method: "GET", path: "/chats",
        fields: [
          { key: "page", label: "Página", placeholder: "1", type: "number" },
          { key: "size", label: "Tamaño de página", placeholder: "20", type: "number" },
          { key: "platformContactId", label: "ID Contacto (filtro)", placeholder: "5491155556666" },
          { key: "chatChannelId", label: "Canal (filtro)", dynamicOptions: "channels" },
        ],
      },
      {
        id: "get-chat", label: "Ver Chat",
        description: "Obtén los datos de una conversación por su ID.",
        method: "GET", path: "/chats/{chatId}",
        fields: [{ key: "chatId", label: "ID del Chat", placeholder: "ABC123DEF456", required: true }],
      },
      {
        id: "close-chat", label: "Cerrar Chat",
        description: "Cierra una conversación activa.",
        method: "POST", path: "/chats-actions/close",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }, { value: "Instagram", label: "Instagram" }] },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels", required: true },
          { key: "platformContactId", label: "ID Contacto", placeholder: "5491155556666", required: true },
        ],
      },
      {
        id: "assign-chat", label: "Asignar Agente",
        description: "Asigna una conversación a un agente específico.",
        method: "POST", path: "/chats-actions/assign",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }] },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels", required: true },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "agentId", label: "Agente", dynamicOptions: "agents" },
        ],
      },
      {
        id: "snooze-chat", label: "Posponer Chat",
        description: "Pospone (snooze) una conversación.",
        method: "POST", path: "/chats-actions/snooze",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }] },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels", required: true },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "snoozeMinutes", label: "Minutos a posponer", type: "number", placeholder: "30" },
        ],
      },
      {
        id: "chat-history", label: "Historial de Mensajes",
        description: "Descarga el historial de mensajes de una conversación.",
        method: "GET", path: "/chats/{chatId}/messages",
        fields: [
          { key: "chatId", label: "ID del Chat", required: true },
          { key: "page", label: "Página", type: "number", placeholder: "1" },
          { key: "size", label: "Cantidad", type: "number", placeholder: "50" },
        ],
      },
    ],
  },
  {
    id: "messages", label: "Mensajes",
    description: "Envía texto, imágenes, plantillas y más",
    icon: Send, color: "var(--emerald)",
    endpoints: [
      {
        id: "send-text", label: "Enviar Texto",
        description: "Envía un mensaje de texto a un contacto.",
        method: "POST", path: "/chats-actions/send-message",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }, { value: "Instagram", label: "Instagram" }] },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels", required: true },
          { key: "platformContactId", label: "ID Contacto / Teléfono", required: true, placeholder: "5491155556666" },
          { key: "messageText", label: "Mensaje", type: "textarea", required: true, placeholder: "Hola, ¿cómo estás?" },
        ],
      },
      {
        id: "send-image", label: "Enviar Imagen",
        description: "Envía una imagen con URL pública.",
        method: "POST", path: "/chats-actions/send-message",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }] },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels", required: true },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "imageUrl", label: "URL de la imagen", required: true, placeholder: "https://ejemplo.com/foto.jpg" },
          { key: "messageText", label: "Caption (opcional)", placeholder: "Descripción de la imagen" },
        ],
      },
      {
        id: "send-document", label: "Enviar Documento",
        description: "Envía un documento (PDF, Word, etc.) por URL.",
        method: "POST", path: "/chats-actions/send-message",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }] },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels", required: true },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "documentUrl", label: "URL del documento", required: true, placeholder: "https://ejemplo.com/archivo.pdf" },
          { key: "documentName", label: "Nombre del archivo", placeholder: "contrato.pdf" },
        ],
      },
      {
        id: "trigger-intent", label: "Disparar Intent",
        description: "Dispara una intención del bot en una conversación.",
        method: "POST", path: "/intent/v2",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }] },
          { key: "chatChannelNumber", label: "Número de Canal", required: true, placeholder: "5411XXXXXXXX" },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "ruleNameOrId", label: "Nombre o ID del Intent", required: true, placeholder: "bienvenida" },
        ],
      },
      {
        id: "send-template", label: "Enviar Template WA",
        description: "Envía una plantilla aprobada de WhatsApp.",
        method: "POST", path: "/intent/v2",
        note: "Usa el nombre del intent asociado al template HSM.",
        fields: [
          { key: "chatChannelNumber", label: "Número de Canal WA", required: true, placeholder: "5411XXXXXXXX" },
          { key: "platformContactId", label: "Teléfono Destino", required: true, placeholder: "5491155556666" },
          { key: "ruleNameOrId", label: "Nombre del Template/Intent", required: true },
          { key: "variables", label: "Variables (JSON)", type: "textarea",
            placeholder: '{"nombre":"Juan","fecha":"15/01"}', hint: "JSON con las variables del template" },
        ],
      },
    ],
  },
  {
    id: "contacts", label: "Contactos",
    description: "CRM de contactos y tags",
    icon: Users, color: "var(--cyan)",
    endpoints: [
      {
        id: "list-contacts", label: "Listar Contactos",
        description: "Obtén todos los contactos del proyecto.",
        method: "GET", path: "/contacts",
        fields: [
          { key: "page", label: "Página", type: "number", placeholder: "1" },
          { key: "size", label: "Tamaño", type: "number", placeholder: "20" },
        ],
      },
      {
        id: "get-contact", label: "Buscar Contacto",
        description: "Busca un contacto por ID de plataforma.",
        method: "GET", path: "/contacts",
        fields: [
          { key: "platformContactId", label: "ID en Plataforma", placeholder: "5491155556666" },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels" },
        ],
      },
      {
        id: "update-contact-vars", label: "Actualizar Variables",
        description: "Establece variables de un contacto en el CRM.",
        method: "PATCH", path: "/contacts",
        fields: [
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels", required: true },
          { key: "variables", label: "Variables (JSON)", type: "textarea", required: true,
            placeholder: '{"plan":"premium","ciudad":"CDMX"}', hint: "Mapa clave-valor" },
        ],
      },
      {
        id: "add-tag", label: "Agregar Tag",
        description: "Agrega una etiqueta a un contacto.",
        method: "POST", path: "/contacts/tags/add",
        fields: [
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels", required: true },
          { key: "tag", label: "Tag a agregar", required: true, placeholder: "cliente-vip" },
        ],
      },
      {
        id: "remove-tag", label: "Quitar Tag",
        description: "Elimina una etiqueta de un contacto.",
        method: "POST", path: "/contacts/tags/remove",
        fields: [
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "chatChannelId", label: "Canal", dynamicOptions: "channels", required: true },
          { key: "tag", label: "Tag a quitar", required: true },
        ],
      },
    ],
  },
  {
    id: "agents", label: "Agentes",
    description: "Administra agentes y roles",
    icon: Users, color: "var(--amber)",
    endpoints: [
      {
        id: "list-agents", label: "Listar Agentes",
        description: "Lista todos los agentes con acceso al bot.",
        method: "GET", path: "/agents",
        fields: [
          { key: "online", label: "Estado", type: "select",
            options: [{ value: "", label: "Todos" }, { value: "true", label: "En línea" }, { value: "false", label: "Desconectados" }] },
        ],
      },
      {
        id: "create-agent", label: "Crear Agente",
        description: "Crea un nuevo agente en el proyecto.",
        method: "POST", path: "/agents",
        fields: [
          { key: "name", label: "Nombre", required: true },
          { key: "email", label: "Email", required: true, placeholder: "agente@empresa.com" },
          { key: "role", label: "Rol", type: "select",
            options: [{ value: "OPERATOR", label: "Operador" }, { value: "SUPERVISOR", label: "Supervisor" },
                      { value: "CONFIGURATOR", label: "Configurador" }, { value: "ADMIN", label: "Admin" }] },
        ],
      },
      {
        id: "update-agent", label: "Actualizar Agente",
        description: "Modifica los datos de un agente existente.",
        method: "PATCH", path: "/agents/{idOrEmail}",
        fields: [
          { key: "idOrEmail", label: "ID o Email del agente", required: true },
          { key: "name", label: "Nombre nuevo" },
          { key: "role", label: "Nuevo rol", type: "select",
            options: [{ value: "OPERATOR", label: "Operador" }, { value: "SUPERVISOR", label: "Supervisor" },
                      { value: "CONFIGURATOR", label: "Configurador" }, { value: "ADMIN", label: "Admin" }] },
        ],
      },
      {
        id: "delete-agent", label: "Eliminar Agente",
        description: "Revoca el acceso de un agente al bot.",
        method: "DELETE", path: "/agents/{id}",
        fields: [{ key: "id", label: "ID del agente", required: true }],
      },
      {
        id: "logout-agent", label: "Desconectar Agente",
        description: "Cierra la sesión activa de un agente.",
        method: "POST", path: "/agents/{id}/actions/logout",
        fields: [{ key: "id", label: "ID del agente", required: true }],
      },
    ],
  },
  {
    id: "channels", label: "Canales",
    description: "Canales de comunicación activos",
    icon: Radio, color: "var(--cyan)",
    endpoints: [
      {
        id: "list-channels", label: "Listar Canales",
        description: "Lista todos los canales activos (WhatsApp, Facebook, Instagram, etc.).",
        method: "GET", path: "/channels",
      },
    ],
  },
  {
    id: "templates", label: "Templates WA",
    description: "Plantillas aprobadas de WhatsApp",
    icon: FileText, color: "var(--emerald)",
    endpoints: [
      {
        id: "list-templates", label: "Listar Templates",
        description: "Lista todas las plantillas aprobadas.",
        method: "GET", path: "/waTemplates",
        fields: [{ key: "channelId", label: "Canal WA (filtro)", dynamicOptions: "channels" }],
      },
      {
        id: "get-template", label: "Ver Template",
        description: "Obtén el detalle de un template.",
        method: "GET", path: "/waTemplates/{templateId}",
        fields: [{ key: "templateId", label: "ID del Template", required: true }],
      },
    ],
  },
  {
    id: "notifications", label: "Notificaciones",
    description: "Envía campañas masivas por WA",
    icon: Bell, color: "#d98843",
    endpoints: [
      {
        id: "send-notification", label: "Enviar Campaña",
        description: "Envía un template WA a múltiples contactos.",
        method: "POST", path: "/notifications",
        fields: [
          { key: "ruleNameOrId", label: "Nombre del Intent/Template", required: true },
          { key: "chatChannelNumber", label: "Número de Canal WA", required: true },
          { key: "recipients", label: "Destinatarios (JSON Array)", type: "textarea", required: true,
            placeholder: '[{"platformContactId":"5491155556666"}]',
            hint: "Array de objetos con platformContactId" },
        ],
      },
      {
        id: "list-notifications", label: "Listar Notificaciones",
        description: "Lista las notificaciones enviadas.",
        method: "GET", path: "/notifications",
        fields: [{ key: "page", label: "Página", type: "number", placeholder: "1" }],
      },
      {
        id: "cancel-notification", label: "Cancelar Notificación",
        description: "Cancela una notificación pendiente.",
        method: "DELETE", path: "/notifications/{notificationId}",
        fields: [{ key: "notificationId", label: "ID de Notificación", required: true }],
      },
    ],
  },
  {
    id: "ecommerce", label: "E-commerce",
    description: "Catálogos y productos por WhatsApp",
    icon: ShoppingCart, color: "#bc5fb2",
    endpoints: [
      { id: "list-catalogs", label: "Listar Catálogos", description: "Lista todos los catálogos.", method: "GET", path: "/ecommerce/catalogs" },
      {
        id: "list-products", label: "Listar Productos",
        description: "Lista los productos de un catálogo.",
        method: "GET", path: "/ecommerce/catalogs/{catalogId}/products",
        fields: [
          { key: "catalogId", label: "ID del Catálogo", required: true },
          { key: "page", label: "Página", type: "number" },
        ],
      },
      {
        id: "create-product", label: "Crear Producto",
        description: "Agrega un producto a un catálogo.",
        method: "POST", path: "/ecommerce/catalogs/{catalogId}/products",
        fields: [
          { key: "catalogId", label: "ID del Catálogo", required: true },
          { key: "name", label: "Nombre del producto", required: true },
          { key: "price", label: "Precio", type: "number", required: true },
          { key: "currency", label: "Moneda", placeholder: "MXN" },
          { key: "description", label: "Descripción", type: "textarea" },
          { key: "imageUrl", label: "URL de imagen" },
        ],
      },
    ],
  },
  {
    id: "webhooks", label: "Webhooks",
    description: "Eventos entrantes y salientes",
    icon: Webhook, color: "var(--purple)",
    endpoints: [
      { id: "list-webhooks", label: "Listar Webhooks", description: "Lista todos los webhooks registrados.", method: "GET", path: "/webhooks" },
      {
        id: "create-webhook", label: "Registrar Webhook",
        description: "Registra un nuevo webhook para recibir eventos.",
        method: "POST", path: "/webhooks",
        fields: [
          { key: "url", label: "URL del Webhook", required: true, placeholder: "https://mi-servidor.com/hook" },
          { key: "events", label: "Eventos (separados por coma)", required: true,
            placeholder: "message.received,chat.closed",
            hint: "Ej: message.received, chat.closed, chat.assigned" },
          { key: "secret", label: "Secret (HMAC)", placeholder: "mi-secreto-privado" },
        ],
      },
      {
        id: "delete-webhook", label: "Eliminar Webhook",
        description: "Elimina un webhook registrado.",
        method: "DELETE", path: "/webhooks/{webhookId}",
        fields: [{ key: "webhookId", label: "ID del Webhook", required: true }],
      },
    ],
  },
  {
    id: "billing", label: "Facturación",
    description: "Consumos y conversaciones cobradas",
    icon: CreditCard, color: "var(--amber)",
    endpoints: [
      {
        id: "list-consumptions", label: "Consumos del Mes",
        description: "Lista los consumos de un período mensual.",
        method: "GET", path: "/billing/consumptions",
        fields: [{ key: "billing-period", label: "Período (YYYY-MM)", placeholder: "2024-06", hint: "Formato año-mes" }],
      },
      {
        id: "billed-conversations", label: "Conversaciones Cobradas WA",
        description: "Lista conversaciones de WhatsApp con info de facturación.",
        method: "GET", path: "/billing/whatsapp/billed-conversations",
        fields: [
          { key: "billingPeriod", label: "Período", placeholder: "2024-06" },
          { key: "businessId", label: "ID de Negocio (filtro)" },
        ],
      },
    ],
  },
  {
    id: "audit", label: "Auditoría",
    description: "Historial de cambios del proyecto",
    icon: ClipboardList, color: "var(--text-secondary)",
    endpoints: [
      {
        id: "list-audit", label: "Ver Historial",
        description: "Consulta qué cambios se hicieron y quién los hizo.",
        method: "GET", path: "/audits/{auditSection}",
        fields: [
          { key: "auditSection", label: "Sección", type: "select", required: true,
            options: [{ value: "intents", label: "Intents" }, { value: "agents", label: "Agentes" },
                      { value: "roles", label: "Roles" }, { value: "channels", label: "Canales" }, { value: "webhooks", label: "Webhooks" }] },
          { key: "from", label: "Desde (fecha)", type: "date" },
          { key: "to", label: "Hasta (fecha)", type: "date" },
          { key: "actions", label: "Tipo de acción", type: "select",
            options: [{ value: "", label: "Todos" }, { value: "CREATE", label: "Creación" },
                      { value: "UPDATE", label: "Modificación" }, { value: "DELETE", label: "Eliminación" }] },
        ],
      },
    ],
  },
  {
    id: "auth", label: "Credenciales API",
    description: "Estado de la conexión y tokens",
    icon: Key, color: "var(--red)",
    endpoints: [
      { id: "get-credentials", label: "Obtener Credenciales", description: "Credenciales asociadas al token actual.", method: "GET", path: "/auth/credentials" },
      { id: "health-check", label: "Health Check", description: "Verifica si la API está activa.", method: "GET", path: "/health" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: "var(--emerald)", POST: "var(--cyan)", PATCH: "var(--amber)", DELETE: "var(--red)", PUT: "#d98843",
};

async function callProxy(method: string, path: string, body?: Record<string, unknown>) {
  const res = await fetch("/api/botmaker/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, path, body }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function SetupScreen({ onConnected }: { onConnected: () => void }) {
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConnect = async () => {
    if (!token.trim()) {
      setError("El access-token es obligatorio.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "botmaker",
          token: token.trim(),
          baseUrl: baseUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Error al conectar con Botmaker.");
      } else {
        setSuccess(true);
        setTimeout(() => onConnected(), 1200);
      }
    } catch {
      setError("Error de red. Verifica tu conexión.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 32, background: "var(--background, #030508)",
    }}>
      <div style={{
        width: "100%", maxWidth: 520,
        background: "var(--surface-hover)",
        border: "1px solid var(--border)",
        borderRadius: 20, overflow: "hidden",
      }}>
        {/* Top gradient banner */}
        <div style={{
          height: 6,
          background: "linear-gradient(90deg, var(--purple), var(--purple), var(--purple))",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s linear infinite",
        }} />

        <div style={{ padding: "36px 40px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "linear-gradient(135deg, var(--purple), var(--purple))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(124,107,214,0.35)",
            }}>
              <Bot style={{ width: 26, height: 26, color: "var(--foreground)" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>
                Conectar Botmaker
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                API v2.0 · Acceso a todas las funciones
              </p>
            </div>
          </div>

          {/* Features preview */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32,
          }}>
            {[
              { icon: MessageSquare, label: "Gestión de Chats", color: "var(--purple)" },
              { icon: Send, label: "Envío de Mensajes", color: "var(--emerald)" },
              { icon: Users, label: "CRM Contactos", color: "var(--cyan)" },
              { icon: Bell, label: "Notificaciones WA", color: "#d98843" },
              { icon: Webhook, label: "Webhooks", color: "var(--purple)" },
              { icon: Shield, label: "40+ Endpoints", color: "var(--amber)" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px",
                background: `${color}0d`,
                border: `1px solid ${color}20`,
                borderRadius: 8,
              }}>
                <Icon style={{ width: 13, height: 13, color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                Access Token <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="botmaker-token-input"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => { setToken(e.target.value); setError(null); }}
                  placeholder="Pega tu access-token de Botmaker aquí"
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  style={{
                    width: "100%", padding: "12px 44px 12px 14px",
                    background: "var(--surface-hover)",
                    border: `1px solid ${error ? "rgba(229,72,77,0.5)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 10, color: "var(--foreground)", fontSize: 13,
                    outline: "none", fontFamily: "var(--font-mono)", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--text-secondary)", padding: 2,
                  }}
                >
                  {showToken ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                Encriptado con AES-256 al guardar. Nunca se expone en el cliente.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                Base URL <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.botmaker.com/v2.0 (por defecto)"
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10, color: "var(--foreground)", fontSize: 13,
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                Déjalo vacío si usas la instancia cloud de Botmaker.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                padding: "10px 14px",
                background: "var(--red-dim)",
                border: "1px solid rgba(229,72,77,0.2)",
                borderRadius: 8, display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <XCircle style={{ width: 14, height: 14, color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "var(--red)" }}>{error}</span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div style={{
                padding: "10px 14px",
                background: "rgba(52,183,124,0.08)",
                border: "1px solid rgba(52,183,124,0.2)",
                borderRadius: 8, display: "flex", gap: 8, alignItems: "center",
              }}>
                <CheckCircle style={{ width: 14, height: 14, color: "var(--emerald)" }} />
                <span style={{ fontSize: 12, color: "var(--emerald)", fontWeight: 600 }}>
                  ¡Conectado! Cargando el módulo...
                </span>
              </div>
            )}

            {/* CTA */}
            <button
              id="botmaker-connect-btn"
              onClick={handleConnect}
              disabled={loading || success || !token.trim()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "14px 24px", border: "none", borderRadius: 10, cursor: loading || success || !token.trim() ? "not-allowed" : "pointer",
                background: token.trim() && !loading && !success
                  ? "linear-gradient(135deg, var(--purple), var(--purple))"
                  : "rgba(255,255,255,0.06)",
                color: token.trim() && !loading && !success ? "white" : "rgba(148,163,184,0.4)",
                fontWeight: 700, fontSize: 14, transition: "all 0.25s",
                boxShadow: token.trim() && !loading && !success ? "0 4px 16px rgba(124,107,214,0.3)" : "none",
              }}
            >
              {loading ? (
                <><Loader2 style={{ width: 17, height: 17, animation: "spin 1s linear infinite" }} /> Validando token...</>
              ) : success ? (
                <><CheckCircle style={{ width: 17, height: 17 }} /> Conectado</>
              ) : (
                <><Zap style={{ width: 17, height: 17 }} /> Validar y Conectar</>
              )}
            </button>

            {/* Docs link */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
              <a
                href="https://api.botmaker.com/v2.0/docs"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, color: "var(--text-secondary)", textDecoration: "none",
                }}
              >
                <ExternalLink style={{ width: 11, height: 11 }} />
                ¿Cómo obtengo mi token? Ver documentación
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT FORM
// ─────────────────────────────────────────────────────────────────────────────

function EndpointForm({
  endpoint,
  categoryColor,
  preloaded,
}: {
  endpoint: EndpointDef;
  categoryColor: string;
  preloaded: PreloadedData;
}) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; status: number; data: unknown } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset fields when endpoint changes
  useEffect(() => { setFields({}); setResult(null); }, [endpoint.id]);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setResult(null);

    let resolvedPath = endpoint.path;
    const body: Record<string, unknown> = {};
    const params: Record<string, string> = {};

    for (const [key, val] of Object.entries(fields)) {
      if (!val) continue;
      const pathParamRegex = new RegExp(`\\{${key}\\}`);
      if (pathParamRegex.test(resolvedPath)) {
        resolvedPath = resolvedPath.replace(`{${key}}`, encodeURIComponent(val));
      } else if (endpoint.method === "GET") {
        params[key] = val;
      } else {
        if ((key === "variables" || key === "recipients") && (val.trim().startsWith("{") || val.trim().startsWith("["))) {
          try { body[key] = JSON.parse(val); } catch { body[key] = val; }
        } else {
          body[key] = val;
        }
      }
    }

    if (endpoint.method === "GET" && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      resolvedPath = `${resolvedPath}?${qs}`;
    }

    try {
      const res = await callProxy(endpoint.method, resolvedPath, endpoint.method !== "GET" ? body : undefined);
      setResult(res);
    } catch (e: unknown) {
      setResult({ ok: false, status: 0, data: { error: e instanceof Error ? e.message : "Error desconocido" } });
    }
    setLoading(false);
  }, [endpoint, fields]);

  const copyResult = () => {
    navigator.clipboard.writeText(JSON.stringify(result?.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getDynamicOptions = (dynamicKey: "channels" | "agents") => {
    if (dynamicKey === "channels") {
      return preloaded.channels.map(ch => ({ value: ch.id, label: `${ch.name} (${ch.platform})` }));
    }
    return preloaded.agents.map(ag => ({ value: ag.id, label: `${ag.name} — ${ag.email}` }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          padding: "5px 10px", borderRadius: 6,
          background: `${METHOD_COLORS[endpoint.method]}18`,
          border: `1px solid ${METHOD_COLORS[endpoint.method]}40`,
          fontSize: 11, fontWeight: 800, color: METHOD_COLORS[endpoint.method],
          fontFamily: "var(--font-mono)", flexShrink: 0, alignSelf: "flex-start", marginTop: 3,
          letterSpacing: "0.05em",
        }}>
          {endpoint.method}
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: "0 0 5px" }}>{endpoint.label}</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 4px", lineHeight: 1.5 }}>{endpoint.description}</p>
          <code style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            api.botmaker.com/v2.0{endpoint.path}
          </code>
        </div>
      </div>

      {endpoint.note && (
        <div style={{
          padding: "10px 14px", background: "rgba(224,168,60,0.06)",
          border: "1px solid rgba(224,168,60,0.18)", borderRadius: 8,
          fontSize: 12, color: "var(--amber)", display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
          {endpoint.note}
        </div>
      )}

      {/* Fields */}
      {endpoint.fields && endpoint.fields.length > 0 && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--hairline)",
          borderRadius: 12, padding: "20px 20px 16px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-secondary)", textTransform: "uppercase", margin: 0 }}>
            Parámetros
          </p>
          {endpoint.fields.map((f) => {
            const dynamicOpts = f.dynamicOptions ? getDynamicOptions(f.dynamicOptions) : null;
            const hasOptions = f.type === "select" || (dynamicOpts && dynamicOpts.length > 0);

            return (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                  {f.label}
                  {f.required && <span style={{ color: "var(--red)", fontSize: 11 }}>*</span>}
                  {f.dynamicOptions && dynamicOpts && dynamicOpts.length > 0 && (
                    <span style={{ fontSize: 9, color: "var(--emerald)", fontWeight: 600, background: "var(--emerald-dim)", padding: "1px 5px", borderRadius: 4 }}>
                      PRECARGADO
                    </span>
                  )}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    value={fields[f.key] || ""}
                    onChange={(e) => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder || ""}
                    rows={4}
                    style={{
                      width: "100%", padding: "10px 12px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8, color: "var(--foreground)", fontSize: 12, outline: "none",
                      resize: "vertical", fontFamily: "var(--font-mono)", boxSizing: "border-box",
                    }}
                  />
                ) : hasOptions ? (
                  <select
                    value={fields[f.key] || ""}
                    onChange={(e) => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px 12px",
                      background: "rgba(8,12,28,0.95)",
                      border: "1px solid var(--border)",
                      borderRadius: 8, color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {(dynamicOpts || f.options || []).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type || "text"}
                    value={fields[f.key] || ""}
                    onChange={(e) => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder || ""}
                    style={{
                      width: "100%", padding: "10px 12px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8, color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                  />
                )}
                {f.hint && (
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "4px 0 0" }}>{f.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Run button */}
      <button
        id={`run-${endpoint.id}`}
        onClick={handleRun}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "13px 24px", border: "none", borderRadius: 10,
          cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${categoryColor}cc, ${categoryColor}88)`,
          color: loading ? "rgba(148,163,184,0.4)" : "white",
          fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", transition: "all 0.2s",
          boxShadow: loading ? "none" : `0 4px 12px ${categoryColor}30`,
        }}
      >
        {loading
          ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Ejecutando...</>
          : <><Play style={{ width: 14, height: 14 }} /> Ejecutar</>}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          background: "var(--surface-hover)",
          border: `1px solid ${result.ok ? "rgba(52,183,124,0.2)" : "rgba(229,72,77,0.2)"}`,
          borderRadius: 12, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px",
            background: result.ok ? "rgba(52,183,124,0.05)" : "rgba(229,72,77,0.05)",
            border: "1px solid var(--hairline)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {result.ok
                ? <CheckCircle style={{ width: 14, height: 14, color: "var(--emerald)" }} />
                : <XCircle style={{ width: 14, height: 14, color: "var(--red)" }} />}
              <span style={{ fontSize: 12, color: result.ok ? "var(--emerald)" : "var(--red)", fontWeight: 700 }}>
                {result.ok ? "Éxito" : "Error"} — HTTP {result.status}
              </span>
            </div>
            <button
              onClick={copyResult}
              style={{
                display: "flex", alignItems: "center", gap: 5, background: "transparent",
                border: "1px solid var(--border)", borderRadius: 6,
                cursor: "pointer", color: "var(--text-secondary)", fontSize: 11,
                padding: "4px 10px", fontWeight: 500, transition: "all 0.15s",
              }}
            >
              <Copy style={{ width: 11, height: 11 }} />
              {copied ? "¡Copiado!" : "Copiar JSON"}
            </button>
          </div>
          <pre style={{
            padding: "16px 20px", margin: 0, overflow: "auto",
            fontSize: 12, color: "var(--foreground)", fontFamily: "var(--font-mono)",
            maxHeight: 400, lineHeight: 1.65,
          }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTED MODULE
// ─────────────────────────────────────────────────────────────────────────────

function ConnectedModule({
  connectionInfo,
  onDisconnect,
}: {
  connectionInfo: ConnectionInfo;
  onDisconnect: () => void;
}) {
  const [selectedCat, setSelectedCat] = useState<string>("chats");
  const [selectedEp, setSelectedEp] = useState<string>("list-chats");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(["chats"]));
  const [disconnecting, setDisconnecting] = useState(false);
  const [preloaded, setPreloaded] = useState<PreloadedData>({ channels: [], agents: [] });
  const [preloadStatus, setPreloadStatus] = useState<"loading" | "done" | "error">("loading");

  // Generative Model Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState("gpt-4.1-mini");

  // Fetch AI config
  useEffect(() => {
    fetch("/api/workspace/ai-model")
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.model) {
          setSelectedAiModel(res.data.model);
        }
      })
      .catch((e) => console.error("Failed to load AI model", e));
  }, []);

  const activeCat = CATEGORIES.find(c => c.id === selectedCat)!;
  const activeEp = activeCat?.endpoints.find(e => e.id === selectedEp)!;

  // Preload channels + agents on mount
  useEffect(() => {
    const preload = async () => {
      try {
        const [chRes, agRes] = await Promise.allSettled([
          callProxy("GET", "/channels"),
          callProxy("GET", "/agents"),
        ]);

        const channels: PreloadedData["channels"] = [];
        const agents: PreloadedData["agents"] = [];

        if (chRes.status === "fulfilled" && chRes.value.ok) {
          const raw = chRes.value.data as { data?: { channels?: unknown[] } } | unknown[];
          const arr = Array.isArray(raw) ? raw : (raw as { data?: { channels?: unknown[] } })?.data?.channels || [];
          for (const ch of arr as Record<string, string>[]) {
            if (ch.id) channels.push({ id: ch.id, name: ch.name || ch.id, platform: ch.platform || "unknown" });
          }
        }

        if (agRes.status === "fulfilled" && agRes.value.ok) {
          const raw = agRes.value.data as { data?: unknown[] } | unknown[];
          const arr = Array.isArray(raw) ? raw : (raw as { data?: unknown[] })?.data || [];
          for (const ag of arr as Record<string, string>[]) {
            if (ag.id) agents.push({ id: ag.id, name: ag.name || ag.id, email: ag.email || "" });
          }
        }

        setPreloaded({ channels, agents });
        setPreloadStatus("done");
      } catch {
        setPreloadStatus("error");
      }
    };
    preload();
  }, []);

  const handleDisconnect = async () => {
    if (!confirm("¿Desconectar Botmaker? Necesitarás ingresar el token nuevamente.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/botmaker/connect", { method: "DELETE" });
      onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectEndpoint = (catId: string, epId: string) => {
    setSelectedCat(catId);
    setSelectedEp(epId);
    setExpandedCats(prev => new Set([...prev, catId]));
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── Left sidebar ── */}
      <div style={{
        width: 270, flexShrink: 0, display: "flex", flexDirection: "column",
        border: "1px solid var(--hairline)",
        background: "rgba(4,7,16,0.9)", overflowY: "auto",
      }}>
        {/* Connection header */}
        <div style={{ padding: "16px 16px 12px", border: "1px solid var(--hairline)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, var(--purple), var(--purple))",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Bot style={{ width: 17, height: 17, color: "var(--foreground)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Botmaker API</p>
              <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "1px 0 0" }}>v2.0</p>
            </div>
            {/* Connected badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 8px", borderRadius: 20,
              background: "var(--emerald-dim)", border: "1px solid rgba(52,183,124,0.25)",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 4px var(--emerald)" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--emerald)", letterSpacing: "0.05em" }}>ACTIVO</span>
            </div>
          </div>

          {/* Preload status */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 10px", borderRadius: 7,
            background: preloadStatus === "done" ? "rgba(52,183,124,0.05)" : "rgba(255,255,255,0.03)",
            border: "1px solid var(--hairline)",
            marginBottom: 10,
          }}>
            {preloadStatus === "loading" ? (
              <><Loader2 style={{ width: 11, height: 11, color: "var(--text-secondary)", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Cargando canales y agentes...</span></>
            ) : preloadStatus === "done" ? (
              <><Sparkles style={{ width: 11, height: 11, color: "var(--emerald)" }} />
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                  {preloaded.channels.length} canales · {preloaded.agents.length} agentes
                </span></>
            ) : (
              <><AlertTriangle style={{ width: 11, height: 11, color: "var(--amber)" }} />
                <span style={{ fontSize: 10, color: "rgba(224,168,60,0.7)" }}>Preload parcial</span></>
            )}
          </div>

          <NextLink
            href="/dashboard/botmaker/analytics"
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 7,
              padding: "8px 10px", marginBottom: 8,
              background: "rgba(124,107,214,0.1)",
              border: "1px solid rgba(124,107,214,0.3)", borderRadius: 7,
              color: "rgba(196,181,253,0.95)", fontSize: 11, fontWeight: 600,
              textDecoration: "none", transition: "all 0.15s",
            }}
          >
            <LayoutGrid style={{ width: 12, height: 12 }} />
            Métricas de bots
            <ArrowRight style={{ width: 12, height: 12, marginLeft: "auto" }} />
          </NextLink>

          {/* Selector de Modelo Generativo */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 7,
              padding: "8px 10px", marginBottom: 12,
              background: "var(--cyan-dim)",
              border: "1px solid rgba(59,130,246,0.3)", borderRadius: 7,
              color: "rgba(147,197,253,0.95)", fontSize: 11, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <Cpu style={{ width: 12, height: 12 }} />
            Modelo generativo
            <ArrowRight style={{ width: 12, height: 12, marginLeft: "auto" }} />
          </button>

          {/* Disconnect button */}
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 7,
              padding: "7px 10px", background: "var(--red-dim)",
              border: "1px solid rgba(229,72,77,0.15)", borderRadius: 7,
              cursor: "pointer", color: "rgba(255,100,120,0.75)", fontSize: 11,
              transition: "all 0.15s",
            }}
          >
            {disconnecting
              ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
              : <Unlink style={{ width: 12, height: 12 }} />}
            Desconectar Botmaker
          </button>
        </div>

        {/* Categories accordion */}
        <nav style={{ flex: 1, padding: "6px 0 12px", overflowY: "auto" }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isExpanded = expandedCats.has(cat.id);
            const isCatActive = selectedCat === cat.id;

            return (
              <div key={cat.id}>
                {/* Category header */}
                <button
                  onClick={() => toggleCat(cat.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 14px 8px 12px",
                    background: isCatActive && !isExpanded ? `${cat.color}0e` : "transparent",
                    border: "none", cursor: "pointer",
                    borderLeft: isCatActive ? `2px solid ${cat.color}` : "2px solid transparent",
                    transition: "all 0.12s",
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: `${cat.color}15`, border: `1px solid ${cat.color}28`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon style={{ width: 13, height: 13, color: cat.color }} />
                  </div>
                  <span style={{
                    flex: 1, textAlign: "left", fontSize: 12, fontWeight: 600,
                    color: isCatActive ? "white" : "rgba(148,163,184,0.7)",
                  }}>
                    {cat.label}
                  </span>
                  <span style={{
                    fontSize: 9, color: "var(--text-secondary)", fontWeight: 700,
                    background: "var(--surface-hover)", padding: "1px 5px", borderRadius: 10, marginRight: 2,
                  }}>
                    {cat.endpoints.length}
                  </span>
                  <div style={{
                    transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.2s ease",
                    color: "var(--text-secondary)",
                  }}>
                    <ChevronDown style={{ width: 13, height: 13 }} />
                  </div>
                </button>

                {/* Endpoints list — animated dropdown */}
                <div style={{
                  overflow: "hidden",
                  maxHeight: isExpanded ? `${cat.endpoints.length * 40}px` : "0px",
                  transition: "max-height 0.25s ease-in-out",
                }}>
                  <div style={{ paddingLeft: 12, paddingBottom: 4 }}>
                    {cat.endpoints.map(ep => {
                      const isEpActive = selectedCat === cat.id && selectedEp === ep.id;
                      return (
                        <button
                          key={ep.id}
                          onClick={() => selectEndpoint(cat.id, ep.id)}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 8,
                            padding: "7px 10px",
                            background: isEpActive ? "rgba(255,255,255,0.07)" : "transparent",
                            border: "none", cursor: "pointer", borderRadius: 6,
                            transition: "all 0.12s",
                          }}
                        >
                          <span style={{
                            fontSize: 9, fontWeight: 800, fontFamily: "var(--font-mono)",
                            color: METHOD_COLORS[ep.method], minWidth: 34, letterSpacing: "0.03em",
                          }}>
                            {ep.method}
                          </span>
                          <span style={{
                            flex: 1, textAlign: "left", fontSize: 12,
                            color: isEpActive ? "white" : "rgba(148,163,184,0.6)",
                            fontWeight: isEpActive ? 600 : 400,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {ep.label}
                          </span>
                          {isEpActive && (
                            <ArrowRight style={{ width: 11, height: 11, color: cat.color, flexShrink: 0 }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Connection info footer */}
        {connectionInfo.connectedBy && (
          <div style={{
            padding: "10px 14px", border: "1px solid var(--hairline)",
            fontSize: 10, color: "var(--text-secondary)",
          }}>
            Conectado por {connectionInfo.connectedBy.name || connectionInfo.connectedBy.email}
            {connectionInfo.connectedAt && (
              <><br />{new Date(connectionInfo.connectedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</>
            )}
          </div>
        )}
      </div>

      {/* ── Right content area ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        {activeEp ? (
          <EndpointForm
            key={`${selectedCat}-${selectedEp}`}
            endpoint={activeEp}
            categoryColor={activeCat.color}
            preloaded={preloaded}
          />
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: 12,
          }}>
            <Bot style={{ width: 48, height: 48, color: "rgba(124,107,214,0.3)" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Selecciona un endpoint del menú
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      
      <GenerativeModelModal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)} 
        initialSelectedId={selectedAiModel}
        onSave={async (modelId) => {
          setSelectedAiModel(modelId);
          setIsAiModalOpen(false);
          try {
            await fetch("/api/workspace/ai-model", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model: modelId }),
            });
          } catch (e) {
            console.error("Error saving AI model", e);
          }
        }} 
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type PageState = "loading" | "setup" | "connected";

export default function BotmakerPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({ connected: false });

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch("/api/botmaker/connect");
        const { data } = await res.json();
        if (data?.connected) {
          setConnectionInfo(data as ConnectionInfo);
          setPageState("connected");
        } else {
          setPageState("setup");
        }
      } catch {
        setPageState("setup");
      }
    };
    checkConnection();
  }, []);

  const handleConnected = () => {
    // Refresh connection info after connecting
    fetch("/api/botmaker/connect").then(r => r.json()).then(({ data }) => {
      if (data?.connected) {
        setConnectionInfo(data as ConnectionInfo);
        setPageState("connected");
      }
    });
  };

  const handleDisconnect = () => {
    setConnectionInfo({ connected: false });
    setPageState("setup");
  };

  // Loading state
  if (pageState === "loading") {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16, background: "var(--background, #030508)",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "linear-gradient(135deg, var(--purple), var(--purple))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(124,107,214,0.3)",
          animation: "pulse 2s ease-in-out infinite",
        }}>
          <Bot style={{ width: 26, height: 26, color: "var(--foreground)" }} />
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Verificando conexión...</p>
        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 8px 24px rgba(124,107,214,0.3); transform: scale(1); }
            50% { box-shadow: 0 8px 32px rgba(124,107,214,0.5); transform: scale(1.04); }
          }
        `}</style>
      </div>
    );
  }

  // Setup state
  if (pageState === "setup") {
    return (
      <div style={{ flex: 1, display: "flex", overflow: "auto" }}>
        <SetupScreen onConnected={handleConnected} />
      </div>
    );
  }

  // Connected state
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <ConnectedModule connectionInfo={connectionInfo} onDisconnect={handleDisconnect} />
    </div>
  );
}
