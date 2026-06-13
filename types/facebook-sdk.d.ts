/**
 * Declaraciones globales para el Facebook JavaScript SDK.
 * Compartidas entre WhatsAppConnectCard y la página de login.
 * Al no tener `export`, este archivo es ambient y todo queda global.
 */

// Interfaces disponibles globalmente (sin import)
interface FbAuthResponse {
  accessToken: string;
  expiresIn: number;
  signedRequest: string;
  userID: string;
  /** Presente cuando response_type:"code" (Embedded Signup v4) */
  code?: string;
}

interface FbLoginResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: FbAuthResponse | null;
}

// Augmentación del objeto Window global
declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: object) => void;
      login: (
        callback: (response: FbLoginResponse) => void,
        options?: object,
      ) => void;
      getLoginStatus: (callback: (response: FbLoginResponse) => void) => void;
      AppEvents: { logPageView: () => void };
    };
  }
}
