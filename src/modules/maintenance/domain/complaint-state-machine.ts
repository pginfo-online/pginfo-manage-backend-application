import { ComplaintStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

/**
 * Valid state transitions for the maintenance workflow.
 *
 * RECEIVED -> VERIFIED, NEED_MORE_TIME, TEAM_WORKING, RESOLVED
 * VERIFIED -> TEAM_WORKING, NEED_MORE_TIME, PENDING, RESOLVED
 * TEAM_WORKING -> NEED_MORE_TIME, PENDING, RESOLVED
 * NEED_MORE_TIME -> TEAM_WORKING, PENDING, RESOLVED
 * PENDING -> TEAM_WORKING, RESOLVED
 * RESOLVED -> RECEIVED (re-open)
 */
export const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  RECEIVED: ['VERIFIED', 'TEAM_WORKING', 'NEED_MORE_TIME', 'RESOLVED'],
  VERIFIED: ['TEAM_WORKING', 'NEED_MORE_TIME', 'PENDING', 'RESOLVED'],
  TEAM_WORKING: ['NEED_MORE_TIME', 'PENDING', 'RESOLVED'],
  NEED_MORE_TIME: ['TEAM_WORKING', 'PENDING', 'RESOLVED'],
  PENDING: ['TEAM_WORKING', 'RESOLVED'],
  RESOLVED: ['RECEIVED'], // Re-open if unresolved
};

export class ComplaintStateMachine {
  static validateTransition(
    currentStatus: ComplaintStatus,
    targetStatus: ComplaintStatus,
  ): void {
    if (currentStatus === targetStatus) return;

    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed?.join(', ') ?? 'none'}`,
      );
    }
  }
}
