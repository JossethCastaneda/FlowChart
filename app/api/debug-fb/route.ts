import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID;

    // 1. Probar generar un App Access Token (valida ID y Secret)
    let secretStatus = "Pendiente";
    let metaError = null;
    if (clientId && clientSecret) {
      const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`);
      const data = await res.json();
      if (res.ok && data.access_token) {
        secretStatus = "? VÁLIDO (ID y Secret coinciden)";
      } else {
        secretStatus = "? INVÁLIDO";
        metaError = data.error?.message || JSON.stringify(data);
      }
    } else {
      secretStatus = "?? Faltan variables (ID o Secret)";
    }

    return NextResponse.json({
      "1. Variables configuradas": {
        FACEBOOK_CLIENT_ID: clientId ? "Configurado (***" + clientId.slice(-4) + ")" : "Falta",
        FACEBOOK_CLIENT_SECRET: clientSecret ? "Configurado (***" + clientSecret.slice(-4) + ")" : "Falta",
        NEXTAUTH_URL: nextAuthUrl || "?? NO CONFIGURADO (Crítico para callback)",
        FACEBOOK_LOGIN_CONFIG_ID: configId || "Usando default: 2028091691078800"
      },
      "2. Test de Credenciales en Meta": secretStatus,
      "3. Detalle Error Meta": metaError
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

