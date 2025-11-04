/**
 * Domain Service: Admin Guards
 *
 * Enforces business rules for admin role management:
 * 1. Last Admin Protection: Cannot remove the last admin
 * 2. Master Admin Protection: Cannot demote the master admin
 * 3. Self-Demotion Prevention: Admins cannot demote themselves (optional)
 *
 * Security Philosophy:
 * - Deny by default
 * - Fail loudly (throw errors for security violations)
 * - Audit all attempts (successful and failed)
 */

export interface AdminUser {
  id: string;
  role: "user" | "admin";
  isMasterAdmin: boolean;
}

export class AdminGuards {
  /**
   * Validates that removing this admin won't leave the system without admins
   */
  static async validateLastAdmin(
    allAdmins: AdminUser[],
    targetUserId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const activeAdmins = allAdmins.filter((u) => u.role === "admin");

    // If there's only one admin left and we're trying to remove it
    if (activeAdmins.length === 1 && activeAdmins[0]?.id === targetUserId) {
      return {
        allowed: false,
        reason:
          "Cannot remove the last admin. System must have at least one admin.",
      };
    }

    return { allowed: true };
  }

  /**
   * Validates that the master admin cannot be demoted
   */
  static validateMasterAdminProtection(
    targetUser: AdminUser,
  ): { allowed: boolean; reason?: string } {
    if (targetUser.isMasterAdmin && targetUser.role === "admin") {
      return {
        allowed: false,
        reason:
          "Cannot demote the master admin. This is a protected account.",
      };
    }

    return { allowed: true };
  }

  /**
   * Validates that an admin is not trying to demote themselves
   * (Optional security measure - can be disabled for flexibility)
   */
  static validateNotSelfDemotion(
    currentUserId: string,
    targetUserId: string,
  ): { allowed: boolean; reason?: string } {
    if (currentUserId === targetUserId) {
      return {
        allowed: false,
        reason: "Cannot change your own admin role. Ask another admin.",
      };
    }

    return { allowed: true };
  }

  /**
   * Comprehensive validation for role changes
   * Combines all guards into a single check
   */
  static async validateRoleChange(
    currentUserId: string,
    targetUser: AdminUser,
    allAdmins: AdminUser[],
    options: {
      allowSelfDemotion?: boolean;
    } = {},
  ): Promise<{ allowed: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    // Check master admin protection
    const masterCheck = this.validateMasterAdminProtection(targetUser);
    if (!masterCheck.allowed && masterCheck.reason) {
      reasons.push(masterCheck.reason);
    }

    // Check last admin protection (only if demoting to user)
    if (targetUser.role === "admin") {
      const lastAdminCheck = await this.validateLastAdmin(
        allAdmins,
        targetUser.id,
      );
      if (!lastAdminCheck.allowed && lastAdminCheck.reason) {
        reasons.push(lastAdminCheck.reason);
      }
    }

    // Check self-demotion (if not explicitly allowed)
    if (!options.allowSelfDemotion) {
      const selfCheck = this.validateNotSelfDemotion(
        currentUserId,
        targetUser.id,
      );
      if (!selfCheck.allowed && selfCheck.reason) {
        reasons.push(selfCheck.reason);
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons,
    };
  }
}
