/**
 * Unit Tests: Step-Up Authentication
 *
 * Tests token generation, validation, and expiry logic.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { StepUpAuthService, type StepUpToken } from "@/domain/services/step-up-auth";

describe("StepUpAuthService", () => {
  describe("Token Generation", () => {
    it("should generate cryptographically secure tokens", () => {
      const token1 = StepUpAuthService.generateToken();
      const token2 = StepUpAuthService.generateToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(20);
    });

    it("should create token with correct TTL", () => {
      const userId = "user-123";
      const ttl = 10 * 60 * 1000; // 10 minutes

      const token = StepUpAuthService.createToken(userId, ttl);

      expect(token.token).toBeTruthy();
      expect(token.userId).toBe(userId);
      expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(token.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + ttl + 1000, // +1s tolerance
      );
    });

    it("should use default TTL when not specified", () => {
      const userId = "user-123";
      const token = StepUpAuthService.createToken(userId);

      const expectedExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
      expect(token.expiresAt.getTime()).toBeLessThanOrEqual(
        expectedExpiry + 1000, // +1s tolerance
      );
    });
  });

  describe("Token Validation", () => {
    it("should accept valid unused tokens", () => {
      const token: StepUpToken = {
        token: "valid-token",
        userId: "user-123",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
      };

      const result = StepUpAuthService.validateToken(token);
      expect(result.valid).toBe(true);
    });

    it("should reject used tokens", () => {
      const token: StepUpToken = {
        token: "used-token",
        userId: "user-123",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: true,
      };

      const result = StepUpAuthService.validateToken(token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already been used");
    });

    it("should reject expired tokens", () => {
      const token: StepUpToken = {
        token: "expired-token",
        userId: "user-123",
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        used: false,
      };

      const result = StepUpAuthService.validateToken(token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });
  });

  describe("Token Ownership Validation", () => {
    it("should accept tokens belonging to the user", () => {
      const token: StepUpToken = {
        token: "valid-token",
        userId: "user-123",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
      };

      const result = StepUpAuthService.validateTokenOwnership(
        token,
        "user-123",
      );
      expect(result.valid).toBe(true);
    });

    it("should reject tokens belonging to other users", () => {
      const token: StepUpToken = {
        token: "valid-token",
        userId: "user-123",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
      };

      const result = StepUpAuthService.validateTokenOwnership(
        token,
        "user-456",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("does not belong");
    });
  });
});
