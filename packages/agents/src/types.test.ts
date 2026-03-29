import { describe, it, expect } from 'vitest';
import { AgentType, Decision, ConfidenceLevel } from './types';

describe('Agents Types', () => {
  describe('AgentType', () => {
    it('should have all agent types defined', () => {
      expect(AgentType.SNIPER).toBe('SNIPER');
      expect(AgentType.ANALYST).toBe('ANALYST');
      expect(AgentType.RISK_MANAGER).toBe('RISK_MANAGER');
      expect(AgentType.STRATEGY).toBe('STRATEGY');
      expect(AgentType.EXECUTOR).toBe('EXECUTOR');
      expect(AgentType.COORDINATOR).toBe('COORDINATOR');
    });
  });

  describe('Decision', () => {
    it('should have all decision types defined', () => {
      expect(Decision.BUY).toBe('BUY');
      expect(Decision.SELL).toBe('SELL');
      expect(Decision.SKIP).toBe('SKIP');
      expect(Decision.HOLD).toBe('HOLD');
    });
  });

  describe('ConfidenceLevel', () => {
    it('should have correct confidence values', () => {
      expect(ConfidenceLevel.VERY_LOW).toBe(0.2);
      expect(ConfidenceLevel.LOW).toBe(0.4);
      expect(ConfidenceLevel.MEDIUM).toBe(0.6);
      expect(ConfidenceLevel.HIGH).toBe(0.8);
      expect(ConfidenceLevel.VERY_HIGH).toBe(1.0);
    });
  });
});
