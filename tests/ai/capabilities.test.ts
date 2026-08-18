import { describe, it, expect } from "vitest";
import { satisfiesRequirements } from "../../lib/ai/capabilities";
import type { ModelCapability } from "../../lib/ai/capabilities";

describe("Model Capabilities", () => {
  it("should satisfy when all required capabilities are present", () => {
    const modelCaps: ModelCapability[] = ["text", "structured_output", "vision"];
    expect(satisfiesRequirements(modelCaps, { required: ["structured_output"] })).toBe(true);
    expect(satisfiesRequirements(modelCaps, { required: ["text", "vision"] })).toBe(true);
  });

  it("should fail when any required capability is missing", () => {
    const modelCaps: ModelCapability[] = ["text"];
    expect(satisfiesRequirements(modelCaps, { required: ["structured_output"] })).toBe(false);
    expect(satisfiesRequirements(modelCaps, { required: ["text", "vision"] })).toBe(false);
  });

  it("should ignore preferred capabilities for strict satisfaction", () => {
    const modelCaps: ModelCapability[] = ["text"];
    expect(satisfiesRequirements(modelCaps, { required: ["text"], preferred: ["vision"] })).toBe(true);
  });
});
