import { PrismaClient } from "@prisma/client";

export interface FlowChartModule {
  key: string;
  name: string;
  description: string;
  category: "AI" | "MARKETING" | "ANALYTICS" | "CORE" | "ADMIN";
  implementationType: "FULL_STACK" | "BACKEND" | "FRONTEND" | "INFRASTRUCTURE";
  isPurchasable: boolean;
  frontendRoute?: string;
}

export const SYSTEM_MODULES: FlowChartModule[] = [
  {
    key: "core_platform",
    name: "Core OS Platform",
    description: "Foundational workspace, team, and project management.",
    category: "CORE",
    implementationType: "FULL_STACK",
    isPurchasable: false, // Included in all plans
    frontendRoute: "/dashboard"
  },
  {
    key: "optimization_planner",
    name: "Optimization Planner (AI)",
    description: "AI-driven continuous SEO and conversion optimization.",
    category: "AI",
    implementationType: "FULL_STACK",
    isPurchasable: true,
    frontendRoute: "/dashboard/optimization"
  },
  {
    key: "social_media_scheduler",
    name: "Social Media Scheduler",
    description: "Omnichannel post scheduling and content generation.",
    category: "MARKETING",
    implementationType: "FULL_STACK",
    isPurchasable: true,
    frontendRoute: "/dashboard/social"
  },
  {
    key: "ads_optimizer",
    name: "Ads Campaign Optimizer",
    description: "Automated budget allocation and ad creative generation.",
    category: "MARKETING",
    implementationType: "FULL_STACK",
    isPurchasable: true,
    frontendRoute: "/dashboard/ads"
  },
  {
    key: "advanced_analytics",
    name: "Advanced Analytics",
    description: "Custom reports, conversion tracking, and attribution.",
    category: "ANALYTICS",
    implementationType: "FRONTEND",
    isPurchasable: true,
    frontendRoute: "/dashboard/analytics"
  }
];

export class ModuleCatalog {
  private db: any;

  constructor(prismaInstance: any) {
    this.db = prismaInstance;
  }

  /**
   * Ensure all system modules exist in the database.
   * This is typically run during deployment or startup.
   */
  async syncModulesToDb() {
    for (const mod of SYSTEM_MODULES) {
      await this.db.module.upsert({
        where: { key: mod.key },
        update: {
          name: mod.name,
          description: mod.description,
          category: mod.category,
          implementationType: mod.implementationType,
          isPurchasable: mod.isPurchasable,
          frontendRoute: mod.frontendRoute
        },
        create: {
          key: mod.key,
          name: mod.name,
          description: mod.description,
          category: mod.category,
          implementationType: mod.implementationType,
          isPurchasable: mod.isPurchasable,
          frontendRoute: mod.frontendRoute
        }
      });
    }
    return true;
  }

  /**
   * Retrieves all modules available for purchase/inclusion
   */
  async getPurchasableModules() {
    return this.db.module.findMany({
      where: { isPurchasable: true, status: "ACTIVE" }
    });
  }
}
