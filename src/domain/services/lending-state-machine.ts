import { TokenCount } from "../value-objects/token-count";

/**
 * Domain Service: Token Lending State Machine
 *
 * Enforces business invariants and state transitions for token lending.
 * Prevents illegal state changes and ensures data consistency.
 *
 * State Diagram:
 * ┌─────────┐     accept     ┌──────────┐
 * │ pending │────────────────>│ accepted │
 * └─────────┘                 └──────────┘
 *      │                           │
 *      │ decline                   │ update
 *      v                           v
 * ┌─────────┐                 ┌──────────┐
 * │declined │                 │ accepted │ (same state, token count changes)
 * └─────────┘                 └──────────┘
 *
 * Invariants:
 * 1. Token count cannot be zero (must delete instead)
 * 2. Pending lendings cannot be updated (must accept/decline first)
 * 3. Declined lendings cannot be updated
 * 4. Only accepted lendings can have token counts modified
 * 5. Total tokens lent must always equal sum of all transactions
 */

export type LendingStatus = "pending" | "accepted" | "declined";

export interface LendingState {
  id: number;
  userId: string;
  lendToUserId: string | null;
  personName: string;
  tokenCount: number;
  totalTokensLent: number;
  acceptanceStatus: LendingStatus;
  version: number;
}

export interface StateTransition {
  from: LendingStatus;
  to: LendingStatus;
  allowed: boolean;
  reason?: string;
}

export class LendingStateMachine {
  /**
   * Valid state transitions matrix
   */
  private static readonly TRANSITIONS: Record<
    LendingStatus,
    Set<LendingStatus>
  > = {
    pending: new Set(["accepted", "declined"]),
    accepted: new Set(["accepted"]), // can stay accepted with token count changes
    declined: new Set([]), // terminal state
  };

  /**
   * Validates if a state transition is allowed
   */
  static canTransition(from: LendingStatus, to: LendingStatus): boolean {
    return this.TRANSITIONS[from]?.has(to) ?? false;
  }

  /**
   * Gets detailed transition information
   */
  static getTransition(
    from: LendingStatus,
    to: LendingStatus,
  ): StateTransition {
    const allowed = this.canTransition(from, to);
    let reason: string | undefined;

    if (!allowed) {
      if (from === "declined") {
        reason = "Declined lendings cannot be modified";
      } else if (from === "pending" && to === "accepted") {
        reason = "Invalid transition"; // should not happen since this is allowed
      } else {
        reason = `Transition from ${from} to ${to} is not allowed`;
      }
    }

    return { from, to, allowed, reason };
  }

  /**
   * Validates token count for a lending operation
   */
  static validateTokenCount(count: number): {
    valid: boolean;
    error?: string;
  } {
    try {
      TokenCount.create(count); // throws if invalid
      if (count === 0) {
        return {
          valid: false,
          error:
            "Token count cannot be zero. Use delete operation to remove lending.",
        };
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid token count",
      };
    }
  }

  /**
   * Validates if a lending can be updated (token count change)
   */
  static canUpdate(state: LendingState): {
    allowed: boolean;
    reason?: string;
  } {
    if (state.acceptanceStatus === "pending") {
      return {
        allowed: false,
        reason:
          "Cannot update pending lending. Accept or decline it first.",
      };
    }

    if (state.acceptanceStatus === "declined") {
      return {
        allowed: false,
        reason: "Cannot update declined lending.",
      };
    }

    return { allowed: true };
  }

  /**
   * Calculates new total tokens lent after an update
   */
  static calculateNewTotal(
    currentTotal: number,
    oldTokenCount: number,
    newTokenCount: number,
  ): number {
    const current = TokenCount.create(currentTotal);
    const oldCount = TokenCount.create(oldTokenCount);
    const newCount = TokenCount.create(newTokenCount);

    const difference = newCount.subtract(oldCount);
    const newTotal = current.add(difference);

    return newTotal.value;
  }

  /**
   * Validates ownership (security check)
   */
  static validateOwnership(
    state: LendingState,
    userId: string,
  ): { valid: boolean; error?: string } {
    if (state.userId !== userId) {
      return {
        valid: false,
        error: "You do not have permission to modify this lending",
      };
    }
    return { valid: true };
  }

  /**
   * Validates borrower acceptance (only borrower can accept/decline)
   */
  static validateBorrowerAction(
    state: LendingState,
    currentUserId: string,
  ): { valid: boolean; error?: string } {
    if (!state.lendToUserId) {
      return {
        valid: false,
        error:
          "Cannot accept/decline legacy lending without linked user",
      };
    }

    if (state.lendToUserId !== currentUserId) {
      return {
        valid: false,
        error:
          "Only the borrower can accept or decline this lending request",
      };
    }

    return { valid: true };
  }

  /**
   * Validates that no duplicate lending exists
   */
  static validateNoDuplicate(
    existingLendings: Array<{
      userId: string;
      lendToUserId: string | null;
    }>,
    userId: string,
    lendToUserId: string,
  ): { valid: boolean; error?: string } {
    const duplicate = existingLendings.find(
      (l) => l.userId === userId && l.lendToUserId === lendToUserId,
    );

    if (duplicate) {
      return {
        valid: false,
        error: "A lending relationship with this user already exists",
      };
    }

    return { valid: true };
  }

  /**
   * Validates concurrency (optimistic locking)
   */
  static validateVersion(
    currentVersion: number,
    expectedVersion: number,
  ): { valid: boolean; error?: string } {
    if (currentVersion !== expectedVersion) {
      return {
        valid: false,
        error:
          "Lending was modified by another user. Please refresh and try again.",
      };
    }
    return { valid: true };
  }
}
