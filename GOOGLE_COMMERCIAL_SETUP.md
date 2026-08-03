# Guía de Configuración: Integración Comercial de Google (OAuth Incremental)

Dado que la plataforma es multi-tenant, **NO usaremos Service Accounts por cliente**. Cada cliente autenticará su propia cuenta de Google mediante OAuth 2.0. El dueño de la plataforma FlowChart (tú) debe registrar UNA aplicación en Google Cloud Platform (GCP).

## 1. Crear el Proyecto en Google Cloud
1. Entra a [Google Cloud Console](https://console.cloud.google.com).
2. Crea un nuevo proyecto llamado **FlowChart Hub Comercial**.

## 2. Habilitar APIs Necesarias
En **APIs & Services > Library**, busca y habilita las siguientes APIs:
- **Google Analytics Data API** (Para GA4 `runReport`)
- **Google Analytics Admin API** (Para listar propiedades GA4)
- **Google Search Console API** (Para métricas de tráfico SEO)
- **Tag Manager API** (Para leer/gestionar contenedores GTM)
- *(Opcionales para futuros módulos)*: Google Ads API, BigQuery API.

## 3. Configurar OAuth Consent Screen
En **APIs & Services > OAuth consent screen**:
1. Elige **External**.
2. **App name**: FlowChart
3. **User support email**: Tu email (luego uno de soporte).
4. **App logo**: Agrega el logo (esto es importante para la verificación).
5. **Authorized domains**: Agrega tu dominio de producción (ej. `flowchart.xyz`).
6. **Developer contact information**: Tu email.

### Scopes
Agrega los siguientes scopes en la pestaña "Scopes" (debes agregarlos manualmente):
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`
- `openid`
- `https://www.googleapis.com/auth/analytics.readonly`
- `https://www.googleapis.com/auth/webmasters.readonly`
- `https://www.googleapis.com/auth/tagmanager.readonly`

*(Nota: como los scopes son "sensibles" o "restringidos", la app estará en estado **Testing** hasta que pases el proceso de verificación de Google. Mientras tanto, solo cuentas de test que tú agregues manualmente en "Test Users" podrán autenticarse).*

## 4. Crear Credenciales (Client ID & Secret)
1. Ve a **Credentials > Create Credentials > OAuth client ID**.
2. **Application type**: Web application.
3. **Name**: FlowChart Web.
4. **Authorized JavaScript origins**: `https://flowchart.xyz` (y `http://localhost:3000` para dev).
5. **Authorized redirect URIs**: `https://flowchart.xyz/api/oauth/google/callback` (y `http://localhost:3000/api/oauth/google/callback` para dev).
6. Copia el **Client ID** y el **Client Secret**.

## 5. Configurar Variables de Entorno en FlowChart
Agrega a tu `.env` (o `.env.local`) y en las variables de entorno de Vercel:
```env
GOOGLE_APIKEY_CONNECT="<tu-client-id>.apps.googleusercontent.com"
GOOGLE_SECRET_CONNECT="<tu-client-secret>"
```

*(La integración leerá automáticamente de aquí para el flujo Incremental OAuth).*

## 6. Proceso de Verificación (Para Producción)
Cuando pases a Producción y quieras que cualquier usuario pueda conectar su Google sin ver la pantalla de "App no verificada":
1. En la Consent Screen, haz clic en **Publish App**.
2. Sigue los pasos de verificación. Google te pedirá:
   - Un video de YouTube mostrando cómo FlowChart usa los datos.
   - Políticas de privacidad publicadas en tu web.
   - Términos de servicio.
   - Dominio verificado en Search Console a nombre de la cuenta de GCP.
