import { apiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";
import { OptimizationDomainError } from "./service";

export function optimizationErrorResponse(error: unknown) {
  if (error instanceof OptimizationDomainError) {
    return apiError(error.message, error.code, error.status);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return apiError("Ya existe un registro con la misma identidad", "OPTIMIZATION_CONFLICT", 409);
  }
  throw error;
}
