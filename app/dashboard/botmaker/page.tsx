"use client";

import React, { useState, useCallback, useRef } from "react";
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
  Image,
  FileIcon,
  Layers,
  Tag,
  UserMinus,
  Phone,
  Zap,
  Search,
  Plus,
  Trash2,
  Edit,
  LogOut,
  AlertTriangle,
  Activity,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "select" | "number" | "date";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
};

type EndpointDef = {
  id: string;
  label: string;
  description: string;
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string; // path relativo al proxy interno /api/botmaker/proxy
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

// ── Categorías y endpoints ────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: "chats",
    label: "Chats",
    description: "Gestiona conversaciones activas",
    icon: MessageSquare,
    color: "#a855f7",
    endpoints: [
      {
        id: "list-chats",
        label: "Listar Chats",
        description: "Obtén todas las conversaciones del bot con paginación.",
        method: "GET",
        path: "/chats",
        fields: [
          { key: "page", label: "Página", placeholder: "1", type: "number" },
          { key: "size", label: "Tamaño de página", placeholder: "20", type: "number" },
          { key: "platformContactId", label: "ID Contacto (filtro)", placeholder: "5491155556666" },
          { key: "chatChannelId", label: "ID Canal (filtro)", placeholder: "botproject-whatsapp-..." },
        ],
      },
      {
        id: "get-chat",
        label: "Ver Chat",
        description: "Obtén los datos de una conversación por su ID.",
        method: "GET",
        path: "/chats/{chatId}",
        fields: [
          { key: "chatId", label: "ID del Chat", placeholder: "ABC123DEF456", required: true },
        ],
      },
      {
        id: "close-chat",
        label: "Cerrar Chat",
        description: "Cierra una conversación activa.",
        method: "POST",
        path: "/chats-actions/close",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }, { value: "Instagram", label: "Instagram" }] },
          { key: "chatChannelId", label: "ID de Canal", placeholder: "botproject-whatsapp-5491...", required: true },
          { key: "platformContactId", label: "ID Contacto", placeholder: "5491155556666", required: true },
        ],
      },
      {
        id: "assign-chat",
        label: "Asignar Agente",
        description: "Asigna una conversación a un agente específico.",
        method: "POST",
        path: "/chats-actions/assign",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }] },
          { key: "chatChannelId", label: "ID de Canal", required: true },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "agentId", label: "ID de Agente", placeholder: "agente@empresa.com o ID" },
        ],
      },
      {
        id: "snooze-chat",
        label: "Posponer Chat",
        description: "Pospone (snooze) una conversación por minutos.",
        method: "POST",
        path: "/chats-actions/snooze",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }] },
          { key: "chatChannelId", label: "ID de Canal", required: true },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "snoozeMinutes", label: "Minutos a posponer", type: "number", placeholder: "30" },
        ],
      },
      {
        id: "chat-history",
        label: "Historial de Mensajes",
        description: "Descarga el historial de mensajes de una conversación.",
        method: "GET",
        path: "/chats/{chatId}/messages",
        fields: [
          { key: "chatId", label: "ID del Chat", required: true },
          { key: "page", label: "Página", type: "number", placeholder: "1" },
          { key: "size", label: "Cantidad", type: "number", placeholder: "50" },
        ],
      },
    ],
  },
  {
    id: "messages",
    label: "Mensajes",
    description: "Envía mensajes, imágenes, plantillas y más",
    icon: Send,
    color: "#06d6a0",
    endpoints: [
      {
        id: "send-text",
        label: "Enviar Texto",
        description: "Envía un mensaje de texto a un contacto.",
        method: "POST",
        path: "/chats-actions/send-message",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }, { value: "Instagram", label: "Instagram" }] },
          { key: "chatChannelId", label: "ID de Canal", required: true },
          { key: "platformContactId", label: "ID Contacto / Teléfono", required: true, placeholder: "5491155556666" },
          { key: "messageText", label: "Mensaje", type: "textarea", required: true, placeholder: "Hola, ¿cómo estás?" },
        ],
      },
      {
        id: "send-image",
        label: "Enviar Imagen",
        description: "Envía una imagen con URL pública.",
        method: "POST",
        path: "/chats-actions/send-message",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }] },
          { key: "chatChannelId", label: "ID de Canal", required: true },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "imageUrl", label: "URL de la imagen", required: true, placeholder: "https://ejemplo.com/foto.jpg" },
          { key: "messageText", label: "Caption (opcional)", placeholder: "Descripción de la imagen" },
        ],
      },
      {
        id: "send-document",
        label: "Enviar Documento",
        description: "Envía un documento (PDF, Word, etc.) por URL.",
        method: "POST",
        path: "/chats-actions/send-message",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }] },
          { key: "chatChannelId", label: "ID de Canal", required: true },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "documentUrl", label: "URL del documento", required: true, placeholder: "https://ejemplo.com/archivo.pdf" },
          { key: "documentName", label: "Nombre del archivo", placeholder: "contrato.pdf" },
        ],
      },
      {
        id: "trigger-intent",
        label: "Disparar Intent",
        description: "Dispara una intención del bot en una conversación.",
        method: "POST",
        path: "/intent/v2",
        fields: [
          { key: "chatPlatform", label: "Plataforma", type: "select", required: true,
            options: [{ value: "Whatsapp", label: "WhatsApp" }, { value: "Facebook", label: "Facebook" }] },
          { key: "chatChannelNumber", label: "Número de Canal", required: true, placeholder: "5411XXXXXXXX" },
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "ruleNameOrId", label: "Nombre o ID del Intent", required: true, placeholder: "bienvenida" },
        ],
      },
      {
        id: "send-template",
        label: "Enviar Template WA",
        description: "Envía una plantilla aprobada de WhatsApp.",
        method: "POST",
        path: "/intent/v2",
        note: "Usa el nombre del intent asociado al template HSM.",
        fields: [
          { key: "chatChannelNumber", label: "Número de Canal WA", required: true, placeholder: "5411XXXXXXXX" },
          { key: "platformContactId", label: "Teléfono Destino", required: true, placeholder: "5491155556666" },
          { key: "ruleNameOrId", label: "Nombre del Template/Intent", required: true },
          { key: "variables", label: "Variables (JSON)", type: "textarea", placeholder: '{"nombre":"Juan","fecha":"15/01"}', hint: "JSON con las variables del template" },
        ],
      },
    ],
  },
  {
    id: "contacts",
    label: "Contactos",
    description: "Gestiona el CRM de contactos",
    icon: Users,
    color: "#00d4ff",
    endpoints: [
      {
        id: "list-contacts",
        label: "Listar Contactos",
        description: "Obtén todos los contactos del proyecto.",
        method: "GET",
        path: "/contacts",
        fields: [
          { key: "page", label: "Página", type: "number", placeholder: "1" },
          { key: "size", label: "Tamaño", type: "number", placeholder: "20" },
        ],
      },
      {
        id: "get-contact",
        label: "Buscar Contacto",
        description: "Busca un contacto por ID o plataforma.",
        method: "GET",
        path: "/contacts",
        fields: [
          { key: "platformContactId", label: "ID en Plataforma", placeholder: "5491155556666" },
          { key: "chatChannelId", label: "ID de Canal" },
        ],
      },
      {
        id: "update-contact-vars",
        label: "Actualizar Variables",
        description: "Establece variables de un contacto en el CRM.",
        method: "PATCH",
        path: "/contacts",
        fields: [
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "chatChannelId", label: "ID Canal", required: true },
          { key: "variables", label: "Variables (JSON)", type: "textarea", required: true,
            placeholder: '{"plan":"premium","ciudad":"CDMX"}', hint: "Mapa clave-valor de variables a actualizar" },
        ],
      },
      {
        id: "add-tag",
        label: "Agregar Tag",
        description: "Agrega una etiqueta a un contacto.",
        method: "POST",
        path: "/contacts/tags/add",
        fields: [
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "chatChannelId", label: "ID Canal", required: true },
          { key: "tag", label: "Tag a agregar", required: true, placeholder: "cliente-vip" },
        ],
      },
      {
        id: "remove-tag",
        label: "Quitar Tag",
        description: "Elimina una etiqueta de un contacto.",
        method: "POST",
        path: "/contacts/tags/remove",
        fields: [
          { key: "platformContactId", label: "ID Contacto", required: true },
          { key: "chatChannelId", label: "ID Canal", required: true },
          { key: "tag", label: "Tag a quitar", required: true },
        ],
      },
    ],
  },
  {
    id: "agents",
    label: "Agentes",
    description: "Administra agentes y roles",
    icon: Users,
    color: "#ffbe0b",
    endpoints: [
      {
        id: "list-agents",
        label: "Listar Agentes",
        description: "Lista todos los agentes con acceso al bot.",
        method: "GET",
        path: "/agents",
        fields: [
          { key: "online", label: "Solo en línea", type: "select",
            options: [{ value: "", label: "Todos" }, { value: "true", label: "En línea" }, { value: "false", label: "Fuera de línea" }] },
          { key: "emails", label: "Filtrar por emails (separados por coma)" },
        ],
      },
      {
        id: "create-agent",
        label: "Crear Agente",
        description: "Crea un nuevo agente en el proyecto.",
        method: "POST",
        path: "/agents",
        fields: [
          { key: "name", label: "Nombre", required: true },
          { key: "email", label: "Email", required: true, placeholder: "agente@empresa.com" },
          { key: "password", label: "Contraseña temporal", placeholder: "(opcional)" },
          { key: "role", label: "Rol", type: "select",
            options: [{ value: "OPERATOR", label: "Operador" }, { value: "SUPERVISOR", label: "Supervisor" },
                      { value: "CONFIGURATOR", label: "Configurador" }, { value: "ADMIN", label: "Admin" }] },
        ],
      },
      {
        id: "update-agent",
        label: "Actualizar Agente",
        description: "Modifica los datos de un agente existente.",
        method: "PATCH",
        path: "/agents/{idOrEmail}",
        fields: [
          { key: "idOrEmail", label: "ID o Email del agente", required: true },
          { key: "name", label: "Nombre nuevo" },
          { key: "role", label: "Nuevo rol", type: "select",
            options: [{ value: "OPERATOR", label: "Operador" }, { value: "SUPERVISOR", label: "Supervisor" },
                      { value: "CONFIGURATOR", label: "Configurador" }, { value: "ADMIN", label: "Admin" }] },
        ],
      },
      {
        id: "delete-agent",
        label: "Eliminar Agente",
        description: "Revoca el acceso de un agente al bot.",
        method: "DELETE",
        path: "/agents/{id}",
        fields: [
          { key: "id", label: "ID del agente", required: true },
        ],
      },
      {
        id: "logout-agent",
        label: "Desconectar Agente",
        description: "Cierra la sesión activa de un agente en Botmaker.",
        method: "POST",
        path: "/agents/{id}/actions/logout",
        fields: [
          { key: "id", label: "ID del agente", required: true },
        ],
      },
    ],
  },
  {
    id: "channels",
    label: "Canales",
    description: "Obtén IDs de canales de comunicación",
    icon: Radio,
    color: "#22d3ee",
    endpoints: [
      {
        id: "list-channels",
        label: "Listar Canales",
        description: "Lista todos los canales activos del proyecto (WhatsApp, Facebook, Instagram, etc.).",
        method: "GET",
        path: "/channels",
      },
    ],
  },
  {
    id: "templates",
    label: "Templates WA",
    description: "Gestiona plantillas de WhatsApp",
    icon: FileText,
    color: "#06d6a0",
    endpoints: [
      {
        id: "list-templates",
        label: "Listar Templates",
        description: "Lista todas las plantillas de WhatsApp aprobadas.",
        method: "GET",
        path: "/waTemplates",
        fields: [
          { key: "channelId", label: "ID de Canal WA", placeholder: "Filtra por canal" },
        ],
      },
      {
        id: "get-template",
        label: "Ver Template",
        description: "Obtén el detalle de un template específico.",
        method: "GET",
        path: "/waTemplates/{templateId}",
        fields: [
          { key: "templateId", label: "ID del Template", required: true },
        ],
      },
    ],
  },
  {
    id: "notifications",
    label: "Notificaciones",
    description: "Envía campañas masivas por WA",
    icon: Bell,
    color: "#fb923c",
    endpoints: [
      {
        id: "send-notification",
        label: "Enviar Notificación",
        description: "Envía un template WA a múltiples contactos (campaña).",
        method: "POST",
        path: "/notifications",
        fields: [
          { key: "ruleNameOrId", label: "Nombre del Intent/Template", required: true },
          { key: "chatChannelNumber", label: "Número de Canal WA", required: true },
          { key: "recipients", label: "Destinatarios (JSON Array)", type: "textarea", required: true,
            placeholder: '[{"platformContactId":"5491155556666"},{"platformContactId":"5491166667777"}]',
            hint: "Array de objetos con platformContactId" },
        ],
      },
      {
        id: "list-notifications",
        label: "Listar Notificaciones",
        description: "Lista las notificaciones enviadas.",
        method: "GET",
        path: "/notifications",
        fields: [
          { key: "page", label: "Página", type: "number", placeholder: "1" },
        ],
      },
      {
        id: "cancel-notification",
        label: "Cancelar Notificación",
        description: "Cancela una notificación pendiente.",
        method: "DELETE",
        path: "/notifications/{notificationId}",
        fields: [
          { key: "notificationId", label: "ID de la Notificación", required: true },
        ],
      },
    ],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    description: "Catálogos y productos por WhatsApp",
    icon: ShoppingCart,
    color: "#f472b6",
    endpoints: [
      {
        id: "list-catalogs",
        label: "Listar Catálogos",
        description: "Lista todos los catálogos del proyecto.",
        method: "GET",
        path: "/ecommerce/catalogs",
      },
      {
        id: "list-products",
        label: "Listar Productos",
        description: "Lista los productos de un catálogo.",
        method: "GET",
        path: "/ecommerce/catalogs/{catalogId}/products",
        fields: [
          { key: "catalogId", label: "ID del Catálogo", required: true },
          { key: "page", label: "Página", type: "number" },
        ],
      },
      {
        id: "create-product",
        label: "Crear Producto",
        description: "Agrega un producto a un catálogo.",
        method: "POST",
        path: "/ecommerce/catalogs/{catalogId}/products",
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
    id: "webhooks",
    label: "Webhooks",
    description: "Gestiona webhooks de eventos",
    icon: Webhook,
    color: "#7c3aed",
    endpoints: [
      {
        id: "list-webhooks",
        label: "Listar Webhooks",
        description: "Lista todos los webhooks registrados.",
        method: "GET",
        path: "/webhooks",
      },
      {
        id: "create-webhook",
        label: "Registrar Webhook",
        description: "Registra un nuevo webhook para recibir eventos.",
        method: "POST",
        path: "/webhooks",
        fields: [
          { key: "url", label: "URL del Webhook", required: true, placeholder: "https://mi-servidor.com/hook" },
          { key: "events", label: "Eventos (separados por coma)", required: true,
            placeholder: "message.received,chat.closed",
            hint: "Ej: message.received, chat.closed, chat.assigned" },
          { key: "secret", label: "Secret (HMAC)", placeholder: "mi-secreto-privado" },
        ],
      },
      {
        id: "delete-webhook",
        label: "Eliminar Webhook",
        description: "Elimina un webhook registrado.",
        method: "DELETE",
        path: "/webhooks/{webhookId}",
        fields: [
          { key: "webhookId", label: "ID del Webhook", required: true },
        ],
      },
    ],
  },
  {
    id: "billing",
    label: "Facturación",
    description: "Consulta consumos y cobros",
    icon: CreditCard,
    color: "#f59e0b",
    endpoints: [
      {
        id: "list-consumptions",
        label: "Consumos del Mes",
        description: "Lista los consumos de un período mensual.",
        method: "GET",
        path: "/billing/consumptions",
        fields: [
          { key: "billing-period", label: "Período (YYYY-MM)", placeholder: "2024-06", hint: "Formato año-mes" },
        ],
      },
      {
        id: "billed-conversations",
        label: "Conversaciones Cobradas WA",
        description: "Lista las conversaciones de WhatsApp con info de facturación.",
        method: "GET",
        path: "/billing/whatsapp/billed-conversations",
        fields: [
          { key: "billingPeriod", label: "Período", placeholder: "2024-06" },
          { key: "businessId", label: "ID de Negocio (filtro)" },
        ],
      },
    ],
  },
  {
    id: "audit",
    label: "Auditoría",
    description: "Historial de cambios del proyecto",
    icon: ClipboardList,
    color: "#94a3b8",
    endpoints: [
      {
        id: "list-audit",
        label: "Ver Historial de Cambios",
        description: "Consulta qué cambios se hicieron y quién los hizo.",
        method: "GET",
        path: "/audits/{auditSection}",
        fields: [
          { key: "auditSection", label: "Sección a auditar", type: "select", required: true,
            options: [
              { value: "intents", label: "Intents" }, { value: "agents", label: "Agentes" },
              { value: "roles", label: "Roles" }, { value: "channels", label: "Canales" },
              { value: "webhooks", label: "Webhooks" },
            ] },
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
    id: "auth",
    label: "Credenciales API",
    description: "Gestiona tokens de acceso",
    icon: Key,
    color: "#ff2d55",
    endpoints: [
      {
        id: "get-credentials",
        label: "Obtener Credenciales",
        description: "Obtén las credenciales asociadas al token actual.",
        method: "GET",
        path: "/auth/credentials",
      },
      {
        id: "health-check",
        label: "Estado de Conexión",
        description: "Verifica si la conexión con la API está activa.",
        method: "GET",
        path: "/health",
      },
    ],
  },
];

// ── Proxy API call ────────────────────────────────────────────────────────────

async function callBotmakerProxy(
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  const res = await fetch("/api/botmaker/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, path, body }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ── Endpoint Form ─────────────────────────────────────────────────────────────

function EndpointForm({
  endpoint,
  categoryColor,
}: {
  endpoint: EndpointDef;
  categoryColor: string;
}) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; status: number; data: unknown } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setResult(null);

    // Build path with path params
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
        // Try to parse JSON fields
        if ((key === "variables" || key === "recipients") && val.trim().startsWith("{") || val.trim().startsWith("[")) {
          try { body[key] = JSON.parse(val); } catch { body[key] = val; }
        } else {
          body[key] = val;
        }
      }
    }

    // Add query params to path for GET
    if (endpoint.method === "GET" && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      resolvedPath = `${resolvedPath}?${qs}`;
    }

    try {
      const res = await callBotmakerProxy(
        endpoint.method,
        resolvedPath,
        endpoint.method !== "GET" ? body : undefined
      );
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

  const methodColors: Record<string, string> = {
    GET: "#06d6a0",
    POST: "#00d4ff",
    PATCH: "#ffbe0b",
    DELETE: "#ff2d55",
    PUT: "#fb923c",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{
          padding: "4px 10px",
          borderRadius: 6,
          background: `${methodColors[endpoint.method]}20`,
          border: `1px solid ${methodColors[endpoint.method]}40`,
          fontSize: 11,
          fontWeight: 700,
          color: methodColors[endpoint.method],
          fontFamily: "monospace",
          flexShrink: 0,
          alignSelf: "flex-start",
          marginTop: 2,
        }}>
          {endpoint.method}
        </div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "white", margin: "0 0 4px" }}>{endpoint.label}</p>
          <p style={{ fontSize: 13, color: "rgba(148,163,184,0.85)", margin: "0 0 4px", lineHeight: 1.5 }}>{endpoint.description}</p>
          <code style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", fontFamily: "monospace" }}>{endpoint.path}</code>
        </div>
      </div>

      {endpoint.note && (
        <div style={{
          padding: "10px 14px",
          background: "rgba(255,190,11,0.08)",
          border: "1px solid rgba(255,190,11,0.2)",
          borderRadius: 8,
          fontSize: 12,
          color: "#ffbe0b",
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}>
          <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
          {endpoint.note}
        </div>
      )}

      {/* Fields */}
      {endpoint.fields && endpoint.fields.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(148,163,184,0.6)", textTransform: "uppercase", margin: 0 }}>
            Parámetros
          </p>
          {endpoint.fields.map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", display: "block", marginBottom: 6 }}>
                {f.label}
                {f.required && <span style={{ color: "#ff2d55", marginLeft: 4 }}>*</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  value={fields[f.key] || ""}
                  onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder || ""}
                  rows={4}
                  style={{
                    width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                    color: "white", fontSize: 13, outline: "none",
                    resize: "vertical", fontFamily: "monospace", boxSizing: "border-box",
                  }}
                />
              ) : f.type === "select" ? (
                <select
                  value={fields[f.key] || ""}
                  onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={{
                    width: "100%", padding: "10px 12px", background: "rgba(10,15,30,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                    color: "white", fontSize: 13, outline: "none", boxSizing: "border-box",
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type || "text"}
                  value={fields[f.key] || ""}
                  onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder || ""}
                  style={{
                    width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                    color: "white", fontSize: 13, outline: "none", boxSizing: "border-box",
                  }}
                />
              )}
              {f.hint && (
                <p style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", margin: "4px 0 0" }}>{f.hint}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 24px", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${categoryColor}cc, ${categoryColor}80)`,
          color: loading ? "rgba(148,163,184,0.5)" : "white", fontWeight: 700, fontSize: 13,
          letterSpacing: "0.05em", transition: "all 0.2s",
        }}
      >
        {loading ? (
          <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Ejecutando...</>
        ) : (
          <><Play style={{ width: 15, height: 15 }} /> Ejecutar</>
        )}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${result.ok ? "rgba(6,214,160,0.2)" : "rgba(255,45,85,0.2)"}`,
          borderRadius: 10, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px",
            background: result.ok ? "rgba(6,214,160,0.06)" : "rgba(255,45,85,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {result.ok
                ? <CheckCircle style={{ width: 14, height: 14, color: "#06d6a0" }} />
                : <XCircle style={{ width: 14, height: 14, color: "#ff2d55" }} />}
              <span style={{ fontSize: 12, color: result.ok ? "#06d6a0" : "#ff2d55", fontWeight: 600 }}>
                {result.ok ? "Éxito" : "Error"} — HTTP {result.status}
              </span>
            </div>
            <button
              onClick={copyResult}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none",
                cursor: "pointer", color: "rgba(148,163,184,0.6)", fontSize: 11 }}
            >
              <Copy style={{ width: 12, height: 12 }} />
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <pre style={{
            padding: 16, margin: 0, overflow: "auto", fontSize: 12,
            color: "#e2e8f0", fontFamily: "monospace", maxHeight: 400,
            lineHeight: 1.6,
          }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BotmakerPage() {
  const [selectedCat, setSelectedCat] = useState<string>("chats");
  const [selectedEp, setSelectedEp] = useState<string>("list-chats");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(["chats"]));
  const [healthStatus, setHealthStatus] = useState<"idle" | "ok" | "error">("idle");
  const [checkingHealth, setCheckingHealth] = useState(false);

  const activeCat = CATEGORIES.find((c) => c.id === selectedCat)!;
  const activeEp = activeCat?.endpoints.find((e) => e.id === selectedEp)!;

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const checkHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await callBotmakerProxy("GET", "/health");
      setHealthStatus(res.ok ? "ok" : "error");
    } catch {
      setHealthStatus("error");
    }
    setCheckingHealth(false);
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--background, #030508)" }}>
      {/* ── Left sidebar (categories + endpoints) ── */}
      <div style={{
        width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(5,8,18,0.8)", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "white", margin: 0 }}>Botmaker</p>
              <p style={{ fontSize: 10, color: "rgba(148,163,184,0.5)", margin: 0 }}>API v2.0</p>
            </div>
          </div>

          {/* Health indicator */}
          <button
            onClick={checkHealth}
            disabled={checkingHealth}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: healthStatus === "ok"
                ? "rgba(6,214,160,0.1)"
                : healthStatus === "error"
                  ? "rgba(255,45,85,0.1)"
                  : "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: healthStatus === "ok" ? "#06d6a0" : healthStatus === "error" ? "#ff2d55" : "rgba(148,163,184,0.4)",
              boxShadow: healthStatus === "ok" ? "0 0 6px #06d6a0" : healthStatus === "error" ? "0 0 6px #ff2d55" : "none",
              animation: checkingHealth ? "pulse 1s ease infinite" : "none",
            }} />
            <span style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", flex: 1, textAlign: "left" }}>
              {checkingHealth ? "Verificando..." : healthStatus === "ok" ? "Conectado" : healthStatus === "error" ? "Sin conexión" : "Verificar conexión"}
            </span>
            {checkingHealth
              ? <Loader2 style={{ width: 12, height: 12, color: "rgba(148,163,184,0.4)", animation: "spin 1s linear infinite" }} />
              : <RefreshCw style={{ width: 12, height: 12, color: "rgba(148,163,184,0.4)" }} />}
          </button>
        </div>

        {/* Categories nav */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isExpanded = expandedCats.has(cat.id);
            const isActive = selectedCat === cat.id;

            return (
              <div key={cat.id}>
                {/* Category header */}
                <button
                  onClick={() => { toggleCat(cat.id); setSelectedCat(cat.id); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 16px", background: isActive ? `${cat.color}12` : "transparent",
                    border: "none", cursor: "pointer",
                    borderLeft: isActive ? `2px solid ${cat.color}` : "2px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: `${cat.color}18`, border: `1px solid ${cat.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon style={{ width: 14, height: 14, color: cat.color }} />
                  </div>
                  <span style={{
                    flex: 1, textAlign: "left", fontSize: 12, fontWeight: 600,
                    color: isActive ? "white" : "rgba(148,163,184,0.75)",
                  }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", marginRight: 4 }}>
                    {cat.endpoints.length}
                  </span>
                  {isExpanded
                    ? <ChevronDown style={{ width: 12, height: 12, color: "rgba(148,163,184,0.4)" }} />
                    : <ChevronRight style={{ width: 12, height: 12, color: "rgba(148,163,184,0.4)" }} />}
                </button>

                {/* Endpoints list */}
                {isExpanded && (
                  <div style={{ paddingLeft: 16, paddingBottom: 4 }}>
                    {cat.endpoints.map((ep) => {
                      const isEpActive = selectedEp === ep.id && selectedCat === cat.id;
                      const methodColors: Record<string, string> = {
                        GET: "#06d6a0", POST: "#00d4ff", PATCH: "#ffbe0b", DELETE: "#ff2d55", PUT: "#fb923c",
                      };
                      return (
                        <button
                          key={ep.id}
                          onClick={() => { setSelectedEp(ep.id); setSelectedCat(cat.id); }}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 8,
                            padding: "7px 12px", background: isEpActive ? "rgba(255,255,255,0.06)" : "transparent",
                            border: "none", cursor: "pointer", borderRadius: 6,
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{
                            fontSize: 9, fontWeight: 700, fontFamily: "monospace",
                            color: methodColors[ep.method], minWidth: 32,
                          }}>
                            {ep.method}
                          </span>
                          <span style={{
                            flex: 1, textAlign: "left", fontSize: 12,
                            color: isEpActive ? "white" : "rgba(148,163,184,0.65)",
                            fontWeight: isEpActive ? 600 : 400,
                          }}>
                            {ep.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Config link */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <a
            href="/dashboard/settings"
            style={{
              display: "flex", alignItems: "center", gap: 8, fontSize: 11,
              color: "rgba(148,163,184,0.5)", textDecoration: "none",
            }}
          >
            <Key style={{ width: 12, height: 12 }} />
            Configurar credenciales
          </a>
        </div>
      </div>

      {/* ── Right: endpoint form ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        {activeEp ? (
          <EndpointForm
            key={`${selectedCat}-${selectedEp}`}
            endpoint={activeEp}
            categoryColor={activeCat.color}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
            <Bot style={{ width: 48, height: 48, color: "rgba(124,58,237,0.4)" }} />
            <p style={{ color: "rgba(148,163,184,0.5)", fontSize: 14 }}>Selecciona un endpoint del menú</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
