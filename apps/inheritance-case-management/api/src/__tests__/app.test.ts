import { describe, it, expect } from 'vitest';
import { app } from '../app.js';

describe('API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);

      const json = await res.json() as { status: string; service: string; timestamp: string };
      expect(json.status).toBe('OK');
      expect(json.service).toBe('inheritance-case-management-api');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('GET /openapi.json', () => {
    it('should return OpenAPI document', async () => {
      const res = await app.request('/openapi.json');
      expect(res.status).toBe(200);

      const json = await res.json() as { openapi: string; info: { title: string } };
      expect(json.openapi).toBe('3.0.0');
      expect(json.info.title).toBe('相続税案件管理 API');
    });
  });

  describe('GET /docs', () => {
    it('should return Swagger UI', async () => {
      const res = await app.request('/docs');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await app.request('/unknown');
      expect(res.status).toBe(404);

      const json = await res.json() as { code: string };
      expect(json.code).toBe('NOT_FOUND');
    });
  });
});
