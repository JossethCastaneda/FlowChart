import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    
    const { searchParams } = new URL(request.url);
    const host = request.headers.get("host") || "sodare.xyz";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const origin = `${protocol}://${host}`;

    const baseUrl = nextAuthUrl || origin;
    const redirectUri = `${baseUrl}/api/oauth/google/callback`;

    return NextResponse.json({
      "1. Variables configuradas": {
        GOOGLE_CLIENT_ID: clientId ? `Configurado (***${clientId.slice(-6)})` : "⚠️ FALTA (GOOGLE_CLIENT_ID)",
        GOOGLE_CLIENT_SECRET: clientSecret ? "Configurado (***)" : "⚠️ FALTA (GOOGLE_CLIENT_SECRET)",
        NEXTAUTH_URL: nextAuthUrl || "⚠️ NO CONFIGURADO (Usando origin de la petición)",
      },
      "2. URL de Redirección (Callback) que debes registrar en Google Cloud": redirectUri,
      "3. Instrucciones": [
        "1. Ve a Google Cloud Console (APIs & Services > Credentials).",
        "2. Edita las credenciales del cliente OAuth cuyo ID termina en la sección '1' anterior.",
        "3. En 'URIs de redireccionamiento autorizados', añade la URL exacta que aparece en la sección '2'.",
        "4. Guarda los cambios y espera 2 minutos."
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
