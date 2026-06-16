/**
 * Opens a Meta OAuth connection flow in a small popup window.
 * When done, calls onSuccess() so the parent can refresh its state.
 *
 * @param module  - e.g. "publisher_facebook", "ads", "analytics"
 * @param onSuccess - callback fired when the popup closes successfully
 */
export function openConnectPopup(moduleOrUrl: string, onSuccess?: (module: string) => void) {
  const url = moduleOrUrl.includes("/") ? moduleOrUrl : `/api/connect/${moduleOrUrl}`;
  const w = 520, h = 660;
  const left = Math.max(0, (window.screen.width - w) / 2);
  const top = Math.max(0, (window.screen.height - h) / 2);
  const features = `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`;
  // Use a safe window name without slashes
  const windowName = moduleOrUrl.includes("/") ? "connect_oauth" : `connect_${moduleOrUrl}`;
  const popup = window.open(url, windowName, features);

  if (!popup) {
    // Popup blocked — fall back to redirect
    window.location.href = url;
    return;
  }

  // Listen for postMessage from /connect/done
  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "CONNECT_DONE") {
      window.removeEventListener("message", handler);
      if (!event.data.error && onSuccess) {
        onSuccess(event.data.module);
      }
      popup.close();
    }
  };
  window.addEventListener("message", handler);

  // Cleanup if popup closed manually
  const timer = setInterval(() => {
    if (popup.closed) {
      clearInterval(timer);
      window.removeEventListener("message", handler);
    }
  }, 500);
}
