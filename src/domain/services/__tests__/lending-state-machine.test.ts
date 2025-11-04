/**
 * Unit Tests: Lending State Machine
 *
 * Tests all business rules and invariants for token lending.
 */

import { describe, it, expect } from "vitest";
import {
  LendingStateMachine,
  type LendingState,
} from "@/domain/services/lending-state-machine";

describe("LendingStateMachine", () => {
  describe("State Transitions", () => {
    it("should allow pending -> accepted transition", () => {
      expect(LendingStateMachine.canTransition("pending", "accepted")).toBe(
        true,
      );
    });

    it("should allow pending -> declined transition", () => {
      expect(LendingStateMachine.canTransition("pending", "declined")).toBe(
        true,
      );
    });

    it("should allow accepted -> accepted transition (updates)", () => {
      expect(LendingStateMachine.canTransition("accepted", "accepted")).toBe(
        true,
      );
    });

    it("should NOT allow declined -> accepted transition", () => {
      expect(LendingStateMachine.canTransition("declined", "accepted")).toBe(
        false,
      );
    });

    it("should NOT allow declined -> declined transition", () => {
      expect(LendingStateMachine.canTransition("declined", "declined")).toBe(
        false,
      );
    });

    it("should NOT allow accepted -> pending transition", () => {
      expect(LendingStateMachine.canTransition("accepted", "pending")).toBe(
        false,
      );
    });

    it("should provide reason for invalid transitions", () => {
      const transition = LendingStateMachine.getTransition(
        "declined",
        "accepted",
      );
      expect(transition.allowed).toBe(false);
      expect(transition.reason).toContain("cannot be modified");
    });
  });

  describe("Token Count Validation", () => {
    it("should accept positive token counts", () => {
      const result = LendingStateMachine.validateTokenCount(5);
      expect(result.valid).toBe(true);
    });

    it("should accept negative token counts (borrowed)", () => {
      const result = LendingStateMachine.validateTokenCount(-5);
      expect(result.valid).toBe(true);
    });

    it("should reject zero token count", () => {
      const result = LendingStateMachine.validateTokenCount(0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be zero");
    });

    it("should reject extremely large numbers", () => {
      const result = LendingStateMachine.validateTokenCount(
        Number.MAX_SAFE_INTEGER + 1,
      );
      expect(result.valid).toBe(false);
    });
  });

  describe("Update Validation", () => {
    it("should allow updates for accepted lendings", () => {
      const state: LendingState = {
        id: 1,
        userId: "user-1",
        lendToUserId: "user-2",
        personName: "John",
        tokenCount: 5,
        totalTokensLent: 5,
        acceptanceStatus: "accepted",
        version: 1,
      };

      const result = LendingStateMachine.canUpdate(state);
      expect(result.allowed).toBe(true);
    });

    it("should reject updates for pending lendings", () => {
      const state: LendingState = {
        id: 1,
        userId: "user-1",
        lendToUserId: "user-2",
        personName: "John",
        tokenCount: 5,
        totalTokensLent: 5,
        acceptanceStatus: "pending",
        version: 1,
      };

      const result = LendingStateMachine.canUpdate(state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("pending");
    });

    it("should reject updates for declined lendings", () => {
      const state: LendingState = {
        id: 1,
        userId: "user-1",
        lendToUserId: "user-2",
        personName: "John",
        tokenCount: 5,
        totalTokensLent: 5,
        acceptanceStatus: "declined",
        version: 1,
      };

      const result = LendingStateMachine.canUpdate(state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("declined");
    });
  });

  describe("Total Calculation", () => {
    it("should calculate new total correctly when increasing tokens", () => {
      const newTotal = LendingStateMachine.calculateNewTotal(10, 5, 8);
      expect(newTotal).toBe(13); // 10 + (8 - 5)
    });

    it("should calculate new total correctly when decreasing tokens", () => {
      const newTotal = LendingStateMachine.calculateNewTotal(10, 5, 2);
      expect(newTotal).toBe(7); // 10 + (2 - 5)
    });

    it("should handle negative tokens correctly", () => {
      const newTotal = LendingStateMachine.calculateNewTotal(0, -5, -8);
      expect(newTotal).toBe(-3); // 0 + (-8 - (-5))
    });
  });

  describe("Ownership Validation", () => {
    it("should validate owner can modify lending", () => {
      const state: LendingState = {
        id: 1,
        userId: "user-1",
        lendToUserId: "user-2",
        personName: "John",
        tokenCount: 5,
        totalTokensLent: 5,
        acceptanceStatus: "accepted",
        version: 1,
      };

      const result = LendingStateMachine.validateOwnership(state, "user-1");
      expect(result.valid).toBe(true);
    });

    it("should reject non-owner modifications", () => {
      const state: LendingState = {
        id: 1,
        userId: "user-1",
        lendToUserId: "user-2",
        personName: "John",
        tokenCount: 5,
        totalTokensLent: 5,
        acceptanceStatus: "accepted",
        version: 1,
      };

      const result = LendingStateMachine.validateOwnership(state, "user-3");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("permission");
    });
  });

  describe("Borrower Action Validation", () => {
    it("should allow borrower to accept/decline", () => {
      const state: LendingState = {
        id: 1,
        userId: "user-1",
        lendToUserId: "user-2",
        personName: "John",
        tokenCount: 5,
        totalTokensLent: 5,
        acceptanceStatus: "pending",
        version: 1,
      };

      const result = LendingStateMachine.validateBorrowerAction(
        state,
        "user-2",
      );
      expect(result.valid).toBe(true);
    });

    it("should reject non-borrower actions", () => {
      const state: LendingState = {
        id: 1,
        userId: "user-1",
        lendToUserId: "user-2",
        personName: "John",
        tokenCount: 5,
        totalTokensLent: 5,
        acceptanceStatus: "pending",
        version: 1,
      };

      const result = LendingStateMachine.validateBorrowerAction(
        state,
        "user-3",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("borrower");
    });

    it("should reject actions on legacy lendings without linked user", () => {
      const state: LendingState = {
        id: 1,
        userId: "user-1",
        lendToUserId: null,
        personName: "John",
        tokenCount: 5,
        totalTokensLent: 5,
        acceptanceStatus: "pending",
        version: 1,
      };

      const result = LendingStateMachine.validateBorrowerAction(
        state,
        "user-2",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("legacy");
    });
  });

  describe("Duplicate Validation", () => {
    it("should detect duplicate lending relationships", () => {
      const existing = [
        { userId: "user-1", lendToUserId: "user-2" },
        { userId: "user-1", lendToUserId: "user-3" },
      ];

      const result = LendingStateMachine.validateNoDuplicate(
        existing,
        "user-1",
        "user-2",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("should allow new unique lending relationships", () => {
      const existing = [
        { userId: "user-1", lendToUserId: "user-2" },
        { userId: "user-1", lendToUserId: "user-3" },
      ];

      const result = LendingStateMachine.validateNoDuplicate(
        existing,
        "user-1",
        "user-4",
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("Version Validation (Optimistic Locking)", () => {
    it("should accept matching versions", () => {
      const result = LendingStateMachine.validateVersion(1, 1);
      expect(result.valid).toBe(true);
    });

    it("should reject mismatched versions", () => {
      const result = LendingStateMachine.validateVersion(2, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("modified by another user");
    });
  });
});
