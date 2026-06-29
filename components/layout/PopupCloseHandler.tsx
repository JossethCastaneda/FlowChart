"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PopupCloseHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if the current window has an opener and we are not on the explicit connect/done page.
    if (window.opener && pathname !== "/connect/done") {
      const isDashboardOrOnboarding =
        pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

      if (isDashboardOrOnboarding) {
        try {
          // Send the connection complete message to the parent window.
          window.opener.postMessage(
            { type: "CONNECT_DONE", module: "login" },
            window.location.origin
          );
          
          // Close the popup window.
          window.close();
        } catch (e) {
          console.error("[PopupCloseHandler] Error posting message or closing window:", e);
          // Try to close as a fallback if the opener is not accessible.
          try {
            window.close();
          } catch (closeError) {
            console.error("[PopupCloseHandler] Fallback close failed:", closeError);
          }
        }
      }
    }
  }, [pathname]);

  return null;
}
