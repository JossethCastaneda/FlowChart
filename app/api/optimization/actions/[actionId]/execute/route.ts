import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { ActionExecutionSchema } from "@/lib/optimization/contracts";
import { optimizationErrorResponse } from "@/lib/optimization/http";
import { runOptimizationAction } from "@/lib/optimization/execution/service";

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (request, context) => {
  const { actionId } = await context.params;
  const body = await validateBody(request, ActionExecutionSchema);
  if (!body.ok) return body.response;
  try {
    return apiSuccess(await runOptimizationAction(
      context.workspaceId,
      context.userId,
      context.role,
      actionId,
      body.data
    ));
  } catch (error) {
    return optimizationErrorResponse(error);
  }
});
