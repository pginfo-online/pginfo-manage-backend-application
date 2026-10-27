import { describe, it, expect } from 'vitest';
import { ComplaintStateMachine } from '../../src/modules/maintenance/domain/complaint-state-machine.js';
import { BadRequestException } from '@nestjs/common';

describe('ComplaintStateMachine', () => {
  it('should allow valid transitions: RECEIVED -> VERIFIED', () => {
    expect(() =>
      ComplaintStateMachine.validateTransition('RECEIVED', 'VERIFIED'),
    ).not.toThrow();
  });

  it('should allow valid transitions: VERIFIED -> RESOLVED', () => {
    expect(() =>
      ComplaintStateMachine.validateTransition('VERIFIED', 'RESOLVED'),
    ).not.toThrow();
  });

  it('should allow re-opening a RESOLVED complaint to RECEIVED', () => {
    expect(() =>
      ComplaintStateMachine.validateTransition('RESOLVED', 'RECEIVED'),
    ).not.toThrow();
  });

  it('should throw BadRequestException on invalid transitions', () => {
    expect(() =>
      ComplaintStateMachine.validateTransition('RESOLVED', 'TEAM_WORKING'),
    ).toThrow(BadRequestException);
  });
});
