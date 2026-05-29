/**
 * Notification Service
 * A centralized utility for pushing alerts.
 */

export async function sendNotification(title: string, message: string, channel: string = "system") {
  console.log(`[Notification - ${channel}] ${title}: ${message}`);
  // In the future, integrate with Pusher, email, or Slack APIs here
}

export async function sendOpsAlert(taskId: string, message: string) {
  return sendNotification(`Ops Task Updated: ${taskId}`, message, "ops");
}
