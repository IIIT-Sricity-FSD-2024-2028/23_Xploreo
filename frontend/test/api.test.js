import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, authApi, getSavedUser, API_BASE_URL } from '../src/services/api.js';

describe('Shared API Service (frontend/src/services/api.js)', () => {
  let originalFetch;
  let originalLocalStorage;
  let mockStorage = {};
  let lastFetchCall = null;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalLocalStorage = globalThis.localStorage;
    mockStorage = {};

    globalThis.localStorage = {
      getItem: (key) => mockStorage[key] ?? null,
      setItem: (key, val) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    lastFetchCall = null;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  });

  function setupMockFetch({
    status = 200,
    ok = true,
    data = { success: true, data: { ok: true } },
    contentType = 'application/json',
  } = {}) {
    globalThis.fetch = async (url, options) => {
      lastFetchCall = { url, options };
      return {
        status,
        ok,
        headers: {
          get: (header) => (header.toLowerCase() === 'content-type' ? contentType : null),
        },
        json: async () => data,
        text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
      };
    };
  }

  describe('Saved User Extraction', () => {
    it('returns null when localStorage has no xploreoUser key', () => {
      assert.equal(getSavedUser(), null);
    });

    it('returns null when xploreoUser contains invalid JSON', () => {
      mockStorage['xploreoUser'] = 'invalid-json';
      assert.equal(getSavedUser(), null);
    });

    it('returns parsed user object when valid JSON is stored', () => {
      const user = { userId: 'usr-101', role: 'traveller', name: 'Alice' };
      mockStorage['xploreoUser'] = JSON.stringify(user);
      assert.deepEqual(getSavedUser(), user);
    });
  });

  describe('Header Injection & Authentication', () => {
    it('automatically injects x-user-id and x-user-role for authenticated requests', async () => {
      mockStorage['xploreoUser'] = JSON.stringify({
        userId: 'usr-trav-999',
        role: 'TRAVELLER',
      });
      setupMockFetch({ data: { success: true, data: { trips: [] } } });

      const result = await apiRequest('/trips');

      assert.deepEqual(result, { trips: [] });
      assert.ok(lastFetchCall);
      assert.equal(lastFetchCall.options.headers['x-user-id'], 'usr-trav-999');
      assert.equal(lastFetchCall.options.headers['x-user-role'], 'traveller');
      assert.equal(lastFetchCall.options.headers['Content-Type'], 'application/json');
    });

    it('supports user.id if user.userId is absent', async () => {
      mockStorage['xploreoUser'] = JSON.stringify({
        id: 'user-guid-555',
        role: 'guide',
      });
      setupMockFetch();

      await apiRequest('/schedule');

      assert.equal(lastFetchCall.options.headers['x-user-id'], 'user-guid-555');
      assert.equal(lastFetchCall.options.headers['x-user-role'], 'guide');
    });

    it('preserves caller-supplied x-user-id or x-user-role headers', async () => {
      mockStorage['xploreoUser'] = JSON.stringify({
        userId: 'session-id',
        role: 'traveller',
      });
      setupMockFetch();

      await apiRequest('/custom', {
        headers: {
          'x-user-id': 'custom-override-id',
          'X-Custom': 'hello',
        },
      });

      assert.equal(lastFetchCall.options.headers['x-user-id'], 'custom-override-id');
      assert.equal(lastFetchCall.options.headers['x-user-role'], 'traveller');
      assert.equal(lastFetchCall.options.headers['X-Custom'], 'hello');
    });

    it('does not forward internal auth option to native fetch options', async () => {
      mockStorage['xploreoUser'] = JSON.stringify({
        userId: 'usr-1',
        role: 'traveller',
      });
      setupMockFetch();

      await apiRequest('/trips', { auth: true });

      assert.equal(lastFetchCall.options.auth, undefined);
    });
  });

  describe('Missing or Malformed Identity Handling', () => {
    it('throws error when authenticated request has no saved user in localStorage', async () => {
      setupMockFetch();

      await assert.rejects(
        async () => {
          await apiRequest('/protected-endpoint');
        },
        {
          name: 'Error',
          message: 'Authentication required. Missing or invalid saved session.',
        }
      );

      // Verify no fetch was issued
      assert.equal(lastFetchCall, null);
    });

    it('throws error when saved user is missing userId', async () => {
      mockStorage['xploreoUser'] = JSON.stringify({ role: 'traveller' });
      setupMockFetch();

      await assert.rejects(
        async () => {
          await apiRequest('/protected-endpoint');
        },
        /Authentication required/
      );
      assert.equal(lastFetchCall, null);
    });

    it('throws error when saved user is missing role', async () => {
      mockStorage['xploreoUser'] = JSON.stringify({ userId: 'u1' });
      setupMockFetch();

      await assert.rejects(
        async () => {
          await apiRequest('/protected-endpoint');
        },
        /Authentication required/
      );
      assert.equal(lastFetchCall, null);
    });
  });

  describe('Public & Anonymous Endpoints (auth: false)', () => {
    it('allows requests without saved identity when auth: false is provided', async () => {
      setupMockFetch({ data: { success: true, data: { hotels: [] } } });

      const data = await apiRequest('/hotels', { auth: false });

      assert.deepEqual(data, { hotels: [] });
      assert.ok(lastFetchCall);
      assert.equal(lastFetchCall.options.headers['x-user-id'], undefined);
      assert.equal(lastFetchCall.options.headers['x-user-role'], undefined);
    });

    it('authApi.login sends auth: false and JSON body', async () => {
      setupMockFetch({
        data: {
          success: true,
          data: {
            user: { userId: '1', role: 'traveller' },
            headers: { 'x-user-id': '1', 'x-user-role': 'traveller' },
          },
        },
      });

      const res = await authApi.login({ username: 'u', password: 'p' });

      assert.ok(lastFetchCall.url.endsWith('/auth/login'));
      assert.equal(lastFetchCall.options.method, 'POST');
      assert.equal(lastFetchCall.options.headers['x-user-id'], undefined);
      assert.equal(JSON.parse(lastFetchCall.options.body).username, 'u');
      assert.equal(res.user.role, 'traveller');
    });

    it('authApi.register sends auth: false and JSON body', async () => {
      setupMockFetch({
        data: {
          success: true,
          data: { message: 'Registered successfully' },
        },
      });

      const res = await authApi.register({ username: 'new', role: 'traveller' });

      assert.ok(lastFetchCall.url.endsWith('/auth/register'));
      assert.equal(lastFetchCall.options.method, 'POST');
      assert.equal(lastFetchCall.options.headers['x-user-id'], undefined);
      assert.equal(res.message, 'Registered successfully');
    });
  });

  describe('Response Unwrapping & Error Handling', () => {
    it('unwraps NestJS ResponseInterceptor data envelope', async () => {
      setupMockFetch({
        data: {
          success: true,
          data: { ticketId: 'tick-100', status: 'OPEN' },
          timestamp: '2026-10-13T20:00:00.000Z',
        },
      });
      mockStorage['xploreoUser'] = JSON.stringify({ userId: 'u1', role: 'traveller' });

      const result = await apiRequest('/tickets');
      assert.deepEqual(result, { ticketId: 'tick-100', status: 'OPEN' });
    });

    it('returns raw payload if no data property exists', async () => {
      setupMockFetch({
        data: { customField: 42 },
      });
      mockStorage['xploreoUser'] = JSON.stringify({ userId: 'u1', role: 'traveller' });

      const result = await apiRequest('/custom');
      assert.deepEqual(result, { customField: 42 });
    });

    it('extracts first item when backend validation returns array message', async () => {
      setupMockFetch({
        status: 400,
        ok: false,
        data: {
          success: false,
          statusCode: 400,
          message: [
            'subject must be longer than or equal to 3 characters',
            'message must be longer than or equal to 10 characters',
          ],
        },
      });
      mockStorage['xploreoUser'] = JSON.stringify({ userId: 'u1', role: 'traveller' });

      await assert.rejects(
        async () => {
          await apiRequest('/tickets', { method: 'POST', body: '{}' });
        },
        {
          name: 'Error',
          message: 'subject must be longer than or equal to 3 characters',
        }
      );
    });

    it('extracts string error message when backend returns string message', async () => {
      setupMockFetch({
        status: 403,
        ok: false,
        data: {
          success: false,
          statusCode: 403,
          message: 'x-user-role header is required',
        },
      });
      mockStorage['xploreoUser'] = JSON.stringify({ userId: 'u1', role: 'traveller' });

      await assert.rejects(
        async () => {
          await apiRequest('/forbidden');
        },
        {
          name: 'Error',
          message: 'x-user-role header is required',
        }
      );
    });

    it('handles non-JSON error response smoothly', async () => {
      setupMockFetch({
        status: 500,
        ok: false,
        data: 'Internal Gateway Timeout',
        contentType: 'text/plain',
      });
      mockStorage['xploreoUser'] = JSON.stringify({ userId: 'u1', role: 'traveller' });

      await assert.rejects(
        async () => {
          await apiRequest('/server-down');
        },
        {
          name: 'Error',
          message: 'Internal Gateway Timeout',
        }
      );
    });
  });

  describe('URL Normalization', () => {
    it('normalizes path and prevents duplicate /api segment', async () => {
      assert.equal(typeof API_BASE_URL, 'string');
      setupMockFetch({ data: { success: true, data: 'ok' } });
      mockStorage['xploreoUser'] = JSON.stringify({ userId: 'u1', role: 'traveller' });

      await apiRequest('/api/hotels');
      assert.ok(lastFetchCall.url.endsWith('/api/hotels'));
      assert.ok(!lastFetchCall.url.includes('/api/api/'));

      await apiRequest('hotels');
      assert.ok(lastFetchCall.url.endsWith('/api/hotels'));
      assert.ok(!lastFetchCall.url.includes('/api/api/'));
    });
  });
});
