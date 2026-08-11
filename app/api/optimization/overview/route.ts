import { apiSuccess } from "@/lib/api-response";
import { withWorkspace } from "@/lib/api-handler";
import { getOptimizationOverview } from "@/lib/optimization/overview";

export const dynamic = "force-dynamic";

export const GET = withWorkspace(async (_request, context) => {
  return apiSuccess(await getOptimizationOverview(context.workspaceId));
});
