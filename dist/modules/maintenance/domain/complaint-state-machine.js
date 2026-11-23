import { BadRequestException } from '@nestjs/common';
export const VALID_TRANSITIONS = {
    RECEIVED: ['VERIFIED', 'TEAM_WORKING', 'NEED_MORE_TIME', 'RESOLVED'],
    VERIFIED: ['TEAM_WORKING', 'NEED_MORE_TIME', 'PENDING', 'RESOLVED'],
    TEAM_WORKING: ['NEED_MORE_TIME', 'PENDING', 'RESOLVED'],
    NEED_MORE_TIME: ['TEAM_WORKING', 'PENDING', 'RESOLVED'],
    PENDING: ['TEAM_WORKING', 'RESOLVED'],
    RESOLVED: ['RECEIVED'],
};
export class ComplaintStateMachine {
    static validateTransition(currentStatus, targetStatus) {
        if (currentStatus === targetStatus)
            return;
        const allowed = VALID_TRANSITIONS[currentStatus];
        if (!allowed || !allowed.includes(targetStatus)) {
            throw new BadRequestException(`Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed?.join(', ') ?? 'none'}`);
        }
    }
}
//# sourceMappingURL=complaint-state-machine.js.map