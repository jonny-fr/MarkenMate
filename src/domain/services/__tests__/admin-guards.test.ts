/**
 * Unit Tests: Admin Guards
 *
 * Tests all security rules for admin role management.
 */

import { describe, it, expect } from "vitest";
import { AdminGuards, type AdminUser } from "@/domain/services/admin-guards";

describe("AdminGuards", () => {
  describe("Last Admin Protection", () => {
    it("should prevent removing the last admin", async () => {
      const admins: AdminUser[] = [
        {
          id: "admin-1",
          role: "admin",
          isMasterAdmin: false,
        },
      ];

      const result = await AdminGuards.validateLastAdmin(admins, "admin-1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("last admin");
    });

    it("should allow removing an admin when others exist", async () => {
      const admins: AdminUser[] = [
        {
          id: "admin-1",
          role: "admin",
          isMasterAdmin: false,
        },
        {
          id: "admin-2",
          role: "admin",
          isMasterAdmin: false,
        },
      ];

      const result = await AdminGuards.validateLastAdmin(admins, "admin-1");
      expect(result.allowed).toBe(true);
    });

    it("should allow removing a non-admin user", async () => {
      const admins: AdminUser[] = [
        {
          id: "admin-1",
          role: "admin",
          isMasterAdmin: false,
        },
      ];

      const result = await AdminGuards.validateLastAdmin(admins, "user-1");
      expect(result.allowed).toBe(true);
    });
  });

  describe("Master Admin Protection", () => {
    it("should prevent demoting master admin", () => {
      const masterAdmin: AdminUser = {
        id: "admin-1",
        role: "admin",
        isMasterAdmin: true,
      };

      const result = AdminGuards.validateMasterAdminProtection(masterAdmin);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("master admin");
    });

    it("should allow demoting regular admins", () => {
      const regularAdmin: AdminUser = {
        id: "admin-2",
        role: "admin",
        isMasterAdmin: false,
      };

      const result = AdminGuards.validateMasterAdminProtection(regularAdmin);
      expect(result.allowed).toBe(true);
    });

    it("should allow promoting users (not demoting)", () => {
      const regularUser: AdminUser = {
        id: "user-1",
        role: "user",
        isMasterAdmin: false,
      };

      const result = AdminGuards.validateMasterAdminProtection(regularUser);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Self-Demotion Prevention", () => {
    it("should prevent admins from demoting themselves", () => {
      const result = AdminGuards.validateNotSelfDemotion("admin-1", "admin-1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("your own");
    });

    it("should allow admins to modify other users", () => {
      const result = AdminGuards.validateNotSelfDemotion("admin-1", "admin-2");
      expect(result.allowed).toBe(true);
    });
  });

  describe("Comprehensive Role Change Validation", () => {
    it("should block all violations and aggregate reasons", async () => {
      const currentUserId = "admin-1";
      const targetUser: AdminUser = {
        id: "admin-1",
        role: "admin",
        isMasterAdmin: true,
      };
      const allAdmins: AdminUser[] = [targetUser];

      const result = await AdminGuards.validateRoleChange(
        currentUserId,
        targetUser,
        allAdmins,
      );

      expect(result.allowed).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.some((r) => r.includes("master admin"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("last admin"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("your own"))).toBe(true);
    });

    it("should allow valid role changes", async () => {
      const currentUserId = "admin-1";
      const targetUser: AdminUser = {
        id: "admin-2",
        role: "admin",
        isMasterAdmin: false,
      };
      const allAdmins: AdminUser[] = [
        {
          id: "admin-1",
          role: "admin",
          isMasterAdmin: true,
        },
        targetUser,
      ];

      const result = await AdminGuards.validateRoleChange(
        currentUserId,
        targetUser,
        allAdmins,
      );

      expect(result.allowed).toBe(true);
      expect(result.reasons.length).toBe(0);
    });

    it("should respect allowSelfDemotion option", async () => {
      const currentUserId = "admin-1";
      const targetUser: AdminUser = {
        id: "admin-1",
        role: "admin",
        isMasterAdmin: false,
      };
      const allAdmins: AdminUser[] = [
        targetUser,
        {
          id: "admin-2",
          role: "admin",
          isMasterAdmin: false,
        },
      ];

      const result = await AdminGuards.validateRoleChange(
        currentUserId,
        targetUser,
        allAdmins,
        { allowSelfDemotion: true },
      );

      expect(result.allowed).toBe(true);
      expect(result.reasons.length).toBe(0);
    });
  });
});
