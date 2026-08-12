import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * A MarketingTool defines a capability that the AI can invoke.
 * P1 Constraints: READ ONLY. No mutations are allowed.
 */
export interface MarketingTool<Input = any, Output = any> {
  name: string;
  description: string;
  schema: z.ZodType<Input>;
  /**
   * Executes the tool. 
   * @param workspaceId Server-provided workspace boundary. LLMs CANNOT forge this.
   * @param input Validated input from the LLM.
   */
  execute: (workspaceId: string, input: Input) => Promise<Output>;
}

export class ToolGateway {
  private tools: Map<string, MarketingTool> = new Map();

  constructor(tools: MarketingTool[]) {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  getToolSchemas() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      schema: t.schema
    }));
  }

  async executeTool(workspaceId: string, name: string, input: unknown): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      const validatedInput = tool.schema.parse(input);
      logger.debug(`[ToolGateway] Executing ${name}`, { workspaceId, input: validatedInput });
      return await tool.execute(workspaceId, validatedInput);
    } catch (error) {
      logger.error(`[ToolGateway] Tool execution failed: ${name}`, { workspaceId, error });
      throw error;
    }
  }
}
