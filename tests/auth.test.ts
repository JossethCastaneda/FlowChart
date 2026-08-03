import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma BEFORE importing anything else
const mockFindUniqueAccount = vi.fn();
const mockUpsertAccount = vi.fn();
const mockFindUniqueUser = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockCountWorkspaceMember = vi.fn();

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      account: {
        findUnique: mockFindUniqueAccount,
        upsert: mockUpsertAccount,
      },
      user: {
        findUnique: mockFindUniqueUser,
        create: mockCreateUser,
        update: mockUpdateUser,
      },
      workspaceMember: {
        count: mockCountWorkspaceMember,
      },
    },
  };
});

// Mock global fetch for Meta Graph API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { authOptions } from "../lib/auth.config";


describe("authOptions configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("facebook-sdk authorize", () => {
    const facebookSdkProvider = authOptions.providers.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      (p: any) => p.options?.id === "facebook-sdk" || p.id === "facebook-sdk"
    );

    it("matches existing legacy user by Facebook ID when no Account record exists and email is null", async () => {
      // 1. Mock debug_token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            is_valid: true,
            app_id: process.env.FACEBOOK_CLIENT_ID || "ci-only-dummy-fb-id",
          },
        }),
      });

      // 1b. Mock Graph API /me response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "758431820460507",
          name: "CT JE",
          email: null,
          picture: { data: { url: "fb-pic-url" } },
        }),
      });

      // 2. Mock Prisma: existing account is not found
      mockFindUniqueAccount.mockResolvedValueOnce(null);

      // 3. Mock Prisma: existing user is found by legacy numeric ID directly
      mockFindUniqueUser.mockImplementation(async ({ where }) => {
        if (where.id === "758431820460507") {
          return {
            id: "758431820460507",
            name: "CT JE",
            email: null,
            image: null,
          };
        }
        return null;
      });

      // 4. Mock user update
      mockUpdateUser.mockImplementation(async ({ where, data }) => ({
        id: where.id,
        name: data.name ?? "CT JE",
        email: null,
        image: data.image ?? "fb-pic-url",
      }));

      // 5. Mock account upsert
      mockUpsertAccount.mockResolvedValueOnce({ id: "acc_id" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const result = await (facebookSdkProvider as any).options.authorize({
        accessToken: "test-token",
      });

      // Verification
      expect(result).toEqual({
        id: "758431820460507",
        name: "CT JE",
        email: null,
        image: "fb-pic-url",
      });

      expect(mockFindUniqueAccount).toHaveBeenCalledWith({
        where: {
          provider_providerAccountId: {
            provider: "facebook",
            providerAccountId: "758431820460507",
          },
        },
        include: { user: true },
      });

      // The new fallback lookup must have been called:
      expect(mockFindUniqueUser).toHaveBeenCalledWith({
        where: { id: "758431820460507" },
      });

      // It must not create a new user:
      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(mockUpsertAccount).toHaveBeenCalled();
    });
  });

  describe("jwt callback fallback lookup", () => {
    const jwtCallback = authOptions.callbacks?.jwt;

    it("matches existing legacy user by account.providerAccountId in JWT callback when Account is missing", async () => {
      // Setup mock inputs
      const token = {};
      const user = { id: "some-temp-id", name: "CT JE", email: null };
      const account = { provider: "facebook", providerAccountId: "758431820460507" };

      // Prisma mocks:
      // Step 1: findUnique account returns null
      mockFindUniqueAccount.mockResolvedValueOnce(null);

      // Step 2: findUnique user by id "some-temp-id" returns null
      mockFindUniqueUser.mockImplementation(async ({ where }) => {
        if (where.id === "758431820460507") {
          return {
            id: "758431820460507",
            name: "CT JE",
            email: null,
          };
        }
        return null;
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
      mockUpdateUser.mockImplementation(async ({ where, data }) => ({
        id: where.id,
        name: "CT JE",
        email: null,
      }));

      mockCountWorkspaceMember.mockResolvedValueOnce(1);
      mockUpsertAccount.mockResolvedValueOnce({});

      const result = await jwtCallback!({
        token,
        user,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
        account: account as any,
        trigger: "signIn",
      });

      // Verification
      expect(result.sub).toBe("758431820460507");

      // Verify fallback check was called with providerAccountId
      expect(mockFindUniqueUser).toHaveBeenCalledWith({
        where: { id: "758431820460507" },
      });

      expect(mockCreateUser).not.toHaveBeenCalled();
    });
  });
});
