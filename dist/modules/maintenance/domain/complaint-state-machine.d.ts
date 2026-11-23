import { ComplaintStatus } from '@prisma/client';
export declare const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]>;
export declare class ComplaintStateMachine {
    static validateTransition(currentStatus: ComplaintStatus, targetStatus: ComplaintStatus): void;
}
