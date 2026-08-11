import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { ActionRollbackSchema } from "@/lib/optimization/contracts";
import { optimizationErrorResponse } from "@/lib/optimization/http";
import { rollbackOptimizationAction } from "@/lib/optimization/execution/service";

export const POST = withWorkspaceRole(["OWNER"])(async (request, context) => {
  const { actionId } = await context.params;
  const body = await validateBody(request, ActionRollbackSchema);
  if (!body.ok) return body.response;
  try {
    return apiSuccess(await rollbackOptimizationAction(
      context.workspaceId,
      context.userId,
      context.role,
      actionId,
      body.data.idempotencyKey
    ));
  } catch (error) {
    return optimizationErrorResponse(error);
  }
});
