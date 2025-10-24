/**
 * Unit Tests for StateMachineValidator
 * Tests state transition validation logic
 */

import { StateMachineValidator } from '../../services/StateMachineValidator';
import { Session, ConversationPhase } from '../../types/database';
import { QualityScores } from '../../types/conversation';

describe('StateMachineValidator', () => {
  // Helper to create test session
  const createTestSession = (
    phase: ConversationPhase,
    context: any = null
  ): Session => ({
    id: 'test-session-id',
    user_id: 'test-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    phase,
    context,
    metadata: null
  });

  // Helper to create test quality scores
  const createTestQualityScores = (overrides: Partial<QualityScores> = {}): QualityScores => ({
    objective: { overall: 0, clarity: 0, measurability: 0, achievability: 0, relevance: 0, time_bound: 0 },
    keyResults: [],
    overall: { score: 0, confidence: 0 },
    ...overrides
  });

  describe('validateTransition', () => {
    describe('Phase Order Validation', () => {
      it('should allow forward transitions', () => {
        const session = createTestSession('discovery', {
          okrData: { objective: 'Test objective' }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 65, clarity: 65, measurability: 65, achievability: 65, relevance: 65, time_bound: 65 }
        });

        const result = StateMachineValidator.validateTransition(
          'discovery',
          'refinement',
          session,
          qualityScores
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should block backward transitions', () => {
        const session = createTestSession('refinement', {
          okrData: { objective: 'Test objective' }
        });
        const qualityScores = createTestQualityScores();

        const result = StateMachineValidator.validateTransition(
          'refinement',
          'discovery',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid transition: refinement → discovery (backward movement not allowed)');
      });

      it('should block transitions from completed phase', () => {
        const session = createTestSession('completed', {
          okrData: { objective: 'Test', keyResults: ['KR1'] }
        });
        const qualityScores = createTestQualityScores();

        const result = StateMachineValidator.validateTransition(
          'completed',
          'validation',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot transition from completed phase - it is terminal');
      });

      it('should block same-phase transitions with warning', () => {
        const session = createTestSession('discovery', {
          okrData: { objective: 'Test' }
        });
        const qualityScores = createTestQualityScores();

        const result = StateMachineValidator.validateTransition(
          'discovery',
          'discovery',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false); // Backward transition check catches this
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('Pre-condition Validation', () => {
      it('should require objective for refinement entry', () => {
        const session = createTestSession('discovery', {
          okrData: {} // No objective
        });
        const qualityScores = createTestQualityScores();

        const result = StateMachineValidator.validateTransition(
          'discovery',
          'refinement',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot enter refinement: No objective extracted from discovery');
      });

      it('should require objective quality score > 0 for refinement', () => {
        const session = createTestSession('discovery', {
          okrData: { objective: 'Test objective' }
        });
        const qualityScores = createTestQualityScores({
          objective: null as any
        });

        const result = StateMachineValidator.validateTransition(
          'discovery',
          'refinement',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot enter refinement: Objective quality score is 0 (not yet evaluated)');
      });

      it('should require objective for kr_discovery entry', () => {
        const session = createTestSession('refinement', {
          okrData: {} // No objective
        });
        const qualityScores = createTestQualityScores();

        const result = StateMachineValidator.validateTransition(
          'refinement',
          'kr_discovery',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot enter kr_discovery: No objective found in session');
      });

      it('should require key results for validation entry', () => {
        const session = createTestSession('kr_discovery', {
          okrData: { objective: 'Test', keyResults: [] }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 70, clarity: 70, measurability: 70, achievability: 70, relevance: 70, time_bound: 70 },
          keyResults: []
        });

        const result = StateMachineValidator.validateTransition(
          'kr_discovery',
          'validation',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot enter validation: No key results created');
      });

      it('should require complete OKR for completion', () => {
        const session = createTestSession('validation', {
          okrData: { objective: 'Test' } // Missing key results
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 70, clarity: 70, measurability: 70, achievability: 70, relevance: 70, time_bound: 70 }
        });

        const result = StateMachineValidator.validateTransition(
          'validation',
          'completed',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot complete: No key results in session');
      });
    });

    describe('Quality Requirement Validation', () => {
      it('should enforce minimum objective quality for refinement', () => {
        const session = createTestSession('discovery', {
          okrData: { objective: 'Test objective' }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 20, clarity: 20, measurability: 20, achievability: 20, relevance: 20, time_bound: 20 } // Below minimum of 30
        });

        const result = StateMachineValidator.validateTransition(
          'discovery',
          'refinement',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Objective quality too low'))).toBe(true);
      });

      it('should enforce minimum objective quality for kr_discovery', () => {
        const session = createTestSession('refinement', {
          okrData: { objective: 'Test objective' }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 49, clarity: 49, measurability: 49, achievability: 49, relevance: 49, time_bound: 49 } // Below minimum of 50
        });

        const result = StateMachineValidator.validateTransition(
          'refinement',
          'kr_discovery',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Objective quality too low'))).toBe(true);
      });

      it('should enforce minimum KR quality for validation', () => {
        const session = createTestSession('kr_discovery', {
          okrData: {
            objective: 'Test',
            keyResults: ['KR1', 'KR2']
          }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 70, clarity: 70, measurability: 70, achievability: 70, relevance: 70, time_bound: 70 },
          keyResults: [
            { overall: 30, clarity: 30, measurability: 30, achievability: 30, relevance: 30, time_bound: 30 },
            { overall: 40, clarity: 40, measurability: 40, achievability: 40, relevance: 40, time_bound: 40 }
          ] // Average 35, below minimum of 60
        });

        const result = StateMachineValidator.validateTransition(
          'kr_discovery',
          'validation',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Key results quality too low'))).toBe(true);
      });

      it('should enforce minimum overall quality for completion', () => {
        const session = createTestSession('validation', {
          okrData: {
            objective: 'Test',
            keyResults: ['KR1', 'KR2']
          }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 70, clarity: 70, measurability: 70, achievability: 70, relevance: 70, time_bound: 70 },
          keyResults: [
            { overall: 60, clarity: 60, measurability: 60, achievability: 60, relevance: 60, time_bound: 60 },
            { overall: 65, clarity: 65, measurability: 65, achievability: 65, relevance: 65, time_bound: 65 }
          ],
          overall: { score: 30, confidence: 0.8 } // Below minimum of 40
        });

        const result = StateMachineValidator.validateTransition(
          'validation',
          'completed',
          session,
          qualityScores
        );

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Overall OKR quality too low'))).toBe(true);
      });
    });

    describe('Valid Transition Scenarios', () => {
      it('should allow discovery → refinement with acceptable quality', () => {
        const session = createTestSession('discovery', {
          okrData: { objective: 'Increase revenue by 25%' }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 65, clarity: 65, measurability: 65, achievability: 65, relevance: 65, time_bound: 65 }
        });

        const result = StateMachineValidator.validateTransition(
          'discovery',
          'refinement',
          session,
          qualityScores
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow refinement → kr_discovery with high quality objective', () => {
        const session = createTestSession('refinement', {
          okrData: { objective: 'Increase customer satisfaction from NPS 45 to 65' }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 75, clarity: 75, measurability: 75, achievability: 75, relevance: 75, time_bound: 75 }
        });

        const result = StateMachineValidator.validateTransition(
          'refinement',
          'kr_discovery',
          session,
          qualityScores
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow kr_discovery → validation with quality KRs', () => {
        const session = createTestSession('kr_discovery', {
          okrData: {
            objective: 'Test objective',
            keyResults: ['KR1: Achieve X', 'KR2: Reach Y']
          }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 75, clarity: 75, measurability: 75, achievability: 75, relevance: 75, time_bound: 75 },
          keyResults: [
            { overall: 70, clarity: 70, measurability: 70, achievability: 70, relevance: 70, time_bound: 70 },
            { overall: 65, clarity: 65, measurability: 65, achievability: 65, relevance: 65, time_bound: 65 }
          ]
        });

        const result = StateMachineValidator.validateTransition(
          'kr_discovery',
          'validation',
          session,
          qualityScores
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow validation → completed with complete OKR', () => {
        const session = createTestSession('validation', {
          okrData: {
            objective: 'Complete test objective',
            keyResults: ['KR1', 'KR2', 'KR3']
          }
        });
        const qualityScores = createTestQualityScores({
          objective: { overall: 80, clarity: 80, measurability: 80, achievability: 80, relevance: 80, time_bound: 80 },
          keyResults: [
            { overall: 75, clarity: 75, measurability: 75, achievability: 75, relevance: 75, time_bound: 75 },
            { overall: 70, clarity: 70, measurability: 70, achievability: 70, relevance: 70, time_bound: 70 },
            { overall: 72, clarity: 72, measurability: 72, achievability: 72, relevance: 72, time_bound: 72 }
          ],
          overall: { score: 75, confidence: 0.9 }
        });

        const result = StateMachineValidator.validateTransition(
          'validation',
          'completed',
          session,
          qualityScores
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('validatePhaseInvariants', () => {
    it('should validate required data exists for phase', () => {
      const session = createTestSession('refinement', {
        okrData: {} // Missing required objective
      });
      const qualityScores = createTestQualityScores();

      const result = StateMachineValidator.validatePhaseInvariants(
        'refinement',
        session,
        qualityScores
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing required data'))).toBe(true);
    });

    it('should warn if in refinement phase with 0 quality objective', () => {
      const session = createTestSession('refinement', {
        okrData: { objective: 'Test' }
      });
      const qualityScores = createTestQualityScores({
        objective: null as any
      });

      const result = StateMachineValidator.validatePhaseInvariants(
        'refinement',
        session,
        qualityScores
      );

      expect(result.warnings.some(w => w.includes('objective quality is 0'))).toBe(true);
    });

    it('should validate validation phase has key results', () => {
      const session = createTestSession('validation', {
        okrData: { objective: 'Test', keyResults: [] }
      });
      const qualityScores = createTestQualityScores({
        objective: { overall: 70, clarity: 70, measurability: 70, achievability: 70, relevance: 70, time_bound: 70 },
        keyResults: []
      });

      const result = StateMachineValidator.validatePhaseInvariants(
        'validation',
        session,
        qualityScores
      );

      expect(result.warnings.some(w => w.includes('no key results scored'))).toBe(true);
    });

    it('should pass validation for well-formed state', () => {
      const session = createTestSession('kr_discovery', {
        okrData: {
          objective: 'Test objective',
          keyResults: ['KR1', 'KR2']
        }
      });
      const qualityScores = createTestQualityScores({
        objective: { overall: 70, clarity: 70, measurability: 70, achievability: 70, relevance: 70, time_bound: 70 },
        keyResults: [
          { overall: 60, clarity: 60, measurability: 60, achievability: 60, relevance: 60, time_bound: 60 },
          { overall: 65, clarity: 65, measurability: 65, achievability: 65, relevance: 65, time_bound: 65 }
        ]
      });

      const result = StateMachineValidator.validatePhaseInvariants(
        'kr_discovery',
        session,
        qualityScores
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
