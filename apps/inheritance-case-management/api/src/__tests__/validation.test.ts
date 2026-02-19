import { describe, it, expect } from 'vitest';
import {
  createCaseSchema,
  createAssigneeSchema,
  createReferrerSchema,
} from '../schemas/validation.js';

describe('Validation Schemas', () => {
  describe('createCaseSchema', () => {
    it('should validate valid case data', () => {
      const validData = {
        deceasedName: '相続 太郎',
        dateOfDeath: '2025-01-15',
        fiscalYear: 2025,
      };

      const result = createCaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty deceasedName', () => {
      const invalidData = {
        deceasedName: '',
        dateOfDeath: '2025-01-15',
        fiscalYear: 2025,
      };

      const result = createCaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('被相続人氏名');
      }
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        deceasedName: '相続 太郎',
        dateOfDeath: '2025/01/15',
        fiscalYear: 2025,
      };

      const result = createCaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid fiscal year', () => {
      const invalidData = {
        deceasedName: '相続 太郎',
        dateOfDeath: '2025-01-15',
        fiscalYear: 1999,
      };

      const result = createCaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const minimalData = {
        deceasedName: '相続 太郎',
        dateOfDeath: '2025-01-15',
        fiscalYear: 2025,
      };

      const result = createCaseSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('未着手');
        expect(result.data.acceptanceStatus).toBe('未判定');
        expect(result.data.taxAmount).toBe(0);
      }
    });
  });

  describe('createAssigneeSchema', () => {
    it('should validate valid assignee data', () => {
      const validData = {
        name: '山田 太郎',
        employeeId: 'EMP001',
        department: '資産税部',
      };

      const result = createAssigneeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      };

      const result = createAssigneeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow minimal data', () => {
      const minimalData = {
        name: '山田 太郎',
      };

      const result = createAssigneeSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
  });

  describe('createReferrerSchema', () => {
    it('should validate valid referrer data', () => {
      const validData = {
        company: '○○銀行',
        name: '田中 次郎',
        department: '信託部',
      };

      const result = createReferrerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty company', () => {
      const invalidData = {
        company: '',
        name: '田中 次郎',
      };

      const result = createReferrerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const invalidData = {
        company: '○○銀行',
        name: '',
      };

      const result = createReferrerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
