/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateAutoSLA, updateAutoSLA } from "@/lib/sla-calculator";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    task: {
      findMany: vi.fn(),
    },
    workspaceSettings: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("SLA Calculator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateAutoSLA", () => {
    it("should return null if less than 3 tasks", async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { createdAt: new Date(), closedAt: new Date() } as any,
      ]);
      const res = await calculateAutoSLA("area-1", "ws-1");
      expect(res).toBeNull();
    });

    it("should calculate median duration in hours", async () => {
      const now = Date.now();
      const hour = 1000 * 60 * 60;
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { createdAt: new Date(now - 10 * hour), closedAt: new Date(now) } as any, // 10h
        { createdAt: new Date(now - 2 * hour), closedAt: new Date(now) } as any, // 2h
        { createdAt: new Date(now - 4 * hour), closedAt: new Date(now) } as any, // 4h
        { createdAt: new Date(now - 5 * hour), closedAt: new Date(now) } as any, // 5h
      ]);
      
      // sorted: 2, 4, 5, 10
      // median for even (4 elements): (4 + 5) / 2 = 4.5 -> round to 5
      
      const res = await calculateAutoSLA("area-1", "ws-1");
      expect(res).toBe(5);
    });
    
    it("should fallback to 1 hour minimum", async () => {
      const now = Date.now();
      const minute = 1000 * 60;
      
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { createdAt: new Date(now - 5 * minute), closedAt: new Date(now) } as any, 
        { createdAt: new Date(now - 2 * minute), closedAt: new Date(now) } as any, 
        { createdAt: new Date(now - 4 * minute), closedAt: new Date(now) } as any, 
      ]);
      
      // all would be 0 hours, min 1 hour -> 1, 1, 1
      const res = await calculateAutoSLA("area-1", "ws-1");
      expect(res).toBe(1);
    });
  });

  describe("updateAutoSLA", () => {
    it("should return null if settings not found", async () => {
      vi.mocked(prisma.workspaceSettings.findUnique).mockResolvedValue(null);
      const res = await updateAutoSLA("area-1", "ws-1");
      expect(res).toBeNull();
    });

    it("should return null if area not found", async () => {
      vi.mocked(prisma.workspaceSettings.findUnique).mockResolvedValue({
        areas: [{ id: "other-area" }],
      } as any);
      const res = await updateAutoSLA("area-1", "ws-1");
      expect(res).toBeNull();
    });

    it("should return null if slaMode is not auto", async () => {
      vi.mocked(prisma.workspaceSettings.findUnique).mockResolvedValue({
        areas: [{ id: "area-1", slaMode: "manual", slaHours: 24 }],
      } as any);
      const res = await updateAutoSLA("area-1", "ws-1");
      expect(res).toBeNull();
    });

    it("should calculate and update if slaMode is auto", async () => {
      vi.mocked(prisma.workspaceSettings.findUnique).mockResolvedValue({
        areas: [{ id: "area-1", slaMode: "auto", slaHours: 24 }],
      } as any);
      
      const now = Date.now();
      const hour = 1000 * 60 * 60;
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { createdAt: new Date(now - 2 * hour), closedAt: new Date(now) } as any,
        { createdAt: new Date(now - 4 * hour), closedAt: new Date(now) } as any,
        { createdAt: new Date(now - 6 * hour), closedAt: new Date(now) } as any,
      ]);
      // 2, 4, 6 -> median is 4
      
      vi.mocked(prisma.workspaceSettings.update).mockResolvedValue({} as any);

      const res = await updateAutoSLA("area-1", "ws-1");
      expect(res).toBe(4);
      
      expect(prisma.workspaceSettings.update).toHaveBeenCalledWith({
        where: { workspaceId: "ws-1" },
        data: {
          areas: [expect.objectContaining({ id: "area-1", slaMode: "auto", slaHours: 4 })],
        }
      });
    });
  });
});
