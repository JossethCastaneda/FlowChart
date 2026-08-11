import { withWorkspaceRole } from "@/lib/api-handler";
import { apiCreated } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { ActionApprovalSchema } from "@/lib/optimization/contracts";
import { optimizationErrorResponse } from "@/lib/optimization/http";
import { recordOptimizationActionApproval } from "@/lib/optimization/execution/service";

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (request, context) => {
  const { actionId } = await context.params;
  const body = await validateBody(request, ActionApprovalSchema);
  if (!body.ok) return body.response;
  try {
    return apiCreated(await recordOptimizationActionApproval(
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
