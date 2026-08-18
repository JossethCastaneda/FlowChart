/**
 * Model Capability Declarations
 * Defines features actually supported by the FlowChart LLM adapters,
 * not just what the provider theoretically supports.
 */

export type ModelCapability =
  | "text"
  | "structured_output"
  | "vision"
  | "tool_calling"
  | "search"
  | "long_context"
  | "reasoning"
  | "streaming";

export interface ModelRequirements {
  /** Capabilities the model MUST support to be selected. */
  required: ModelCapability[];
  /** Capabilities the model SHOULD support (used for tie-breaking). */
  preferred?: ModelCapability[];
}

/**
 * Validates if a model supports all required capabilities.
 */
export function satisfiesRequirements(
  modelCaps: ModelCapability[],
  requirements: ModelRequirements
): boolean {
  return requirements.required.every((cap) => modelCaps.includes(cap));
}
