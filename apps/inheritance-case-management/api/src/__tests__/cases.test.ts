import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';

type CaseResponse = {
  id: string;
  deceasedName: string;
  dateOfDeath: string;
  fiscalYear: number;
  status: string;
};

type PaginatedCasesResponse = {
  data: CaseResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type ErrorResponse = {
  code: string;
  message: string;
};

describe('Cases API', () => {
  const testCaseIds: string[] = [];

  // Clean up test data after all tests
  afterAll(async () => {
    for (const id of testCaseIds) {
      await prisma.inheritanceCase.delete({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('GET /api/cases', () => {
    it('should return paginated cases', async () => {
      const res = await app.request('/api/cases?page=1&pageSize=10');
      expect(res.status).toBe(200);

      const json = await res.json() as PaginatedCasesResponse;
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.pagination).toBeDefined();
      expect(json.pagination.page).toBe(1);
      expect(json.pagination.pageSize).toBe(10);
    });

    it('should filter by status', async () => {
      const res = await app.request('/api/cases?status=' + encodeURIComponent('未着手'));
      expect(res.status).toBe(200);

      const json = await res.json() as PaginatedCasesResponse;
      for (const c of json.data) {
        expect(c.status).toBe('未着手');
      }
    });

    it('should filter by fiscalYear', async () => {
      const res = await app.request('/api/cases?fiscalYear=2024');
      expect(res.status).toBe(200);

      const json = await res.json() as PaginatedCasesResponse;
      for (const c of json.data) {
        expect(c.fiscalYear).toBe(2024);
      }
    });
  });

  describe('POST /api/cases', () => {
    it('should create a new case', async () => {
      const newCase = {
        deceasedName: 'テスト 太郎',
        dateOfDeath: '2024-01-15',
        fiscalYear: 2024,
      };

      const res = await app.request('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCase),
      });

      expect(res.status).toBe(201);

      const json = await res.json() as CaseResponse;
      expect(json.id).toBeDefined();
      expect(json.deceasedName).toBe('テスト 太郎');
      expect(json.dateOfDeath).toBe('2024-01-15');
      expect(json.status).toBe('未着手');

      testCaseIds.push(json.id);
    });

    it('should reject invalid data', async () => {
      const invalidCase = {
        // Missing required deceasedName
        dateOfDeath: '2024-01-15',
        fiscalYear: 2024,
      };

      const res = await app.request('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidCase),
      });

      expect(res.status).toBe(400);
    });

    it('should reject invalid date format', async () => {
      const invalidCase = {
        deceasedName: 'テスト',
        dateOfDeath: '2024/01/15', // Wrong format
        fiscalYear: 2024,
      };

      const res = await app.request('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidCase),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/cases/:id', () => {
    it('should return a case by id', async () => {
      // Create a test case first
      const createRes = await app.request('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deceasedName: 'テスト 次郎',
          dateOfDeath: '2024-02-01',
          fiscalYear: 2024,
        }),
      });
      const created = await createRes.json() as CaseResponse;
      testCaseIds.push(created.id);

      // Get the case
      const res = await app.request(`/api/cases/${created.id}`);
      expect(res.status).toBe(200);

      const json = await res.json() as CaseResponse;
      expect(json.id).toBe(created.id);
      expect(json.deceasedName).toBe('テスト 次郎');
    });

    it('should return 404 for non-existent case', async () => {
      const res = await app.request('/api/cases/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);

      const json = await res.json() as ErrorResponse;
      expect(json.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await app.request('/api/cases/invalid-id');
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/cases/:id', () => {
    it('should update a case', async () => {
      // Create a test case first
      const createRes = await app.request('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deceasedName: 'テスト 三郎',
          dateOfDeath: '2024-03-01',
          fiscalYear: 2024,
        }),
      });
      const created = await createRes.json() as CaseResponse;
      testCaseIds.push(created.id);

      // Update the case
      const res = await app.request(`/api/cases/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: '進行中',
          taxAmount: 5000000,
        }),
      });
      expect(res.status).toBe(200);

      const json = await res.json() as CaseResponse & { taxAmount: number };
      expect(json.status).toBe('進行中');
      expect(json.taxAmount).toBe(5000000);
    });

    it('should return 404 for non-existent case', async () => {
      const res = await app.request('/api/cases/00000000-0000-0000-0000-000000000000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: '進行中',
        }),
      });
      expect(res.status).toBe(404);

      const json = await res.json() as ErrorResponse;
      expect(json.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/cases/:id', () => {
    it('should delete a case', async () => {
      // Create a test case first
      const createRes = await app.request('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deceasedName: 'テスト 削除用',
          dateOfDeath: '2024-04-01',
          fiscalYear: 2024,
        }),
      });
      const created = await createRes.json() as CaseResponse;

      // Delete the case
      const res = await app.request(`/api/cases/${created.id}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(204);

      // Verify it's deleted
      const getRes = await app.request(`/api/cases/${created.id}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent case', async () => {
      const res = await app.request('/api/cases/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);

      const json = await res.json() as ErrorResponse;
      expect(json.code).toBe('NOT_FOUND');
    });
  });
});
