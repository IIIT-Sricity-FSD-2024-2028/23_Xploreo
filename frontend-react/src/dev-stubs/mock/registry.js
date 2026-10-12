// TEMP-STUB: stands in for M1's Mock Kit v0 registry.
//   registerMock('GET', '/experiences/:id', handler)
//   handler(ctx) -> data | throws ApiError, with ctx = { method, path, params, query, body, headers, user }
// ctx.user is built ONLY from the request headers, exactly what a real server would see.
import { ApiError } from '../http/ApiError.js';

const routes = [];

function compile(pattern) {
  const keys = [];
  const source = pattern.replace(/\/:([A-Za-z]+)/g, (_, key) => {
    keys.push(key);
    return '/([^/]+)';
  });
  return { re: new RegExp(`^${source}$`), keys };
}

export function registerMock(method, pattern, handler) {
  const { re, keys } = compile(pattern);
  routes.push({ method: method.toUpperCase(), pattern, re, keys, handler });
}

function delay() {
  const configured = import.meta.env.VITE_MOCK_LATENCY;
  if (configured === '0') return Promise.resolve();
  const ms = 300 + Math.round(Math.random() * 400);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function userFromHeaders(headers) {
  return {
    id: headers['x-user-id'] || null,
    role: headers['x-user-role'] || null,
    region: headers['x-user-location'] || null,
  };
}

export async function dispatchMock(method, url, { body, headers }) {
  const [pathname, search = ''] = url.split('?');
  const route = routes.find((r) => r.method === method.toUpperCase() && r.re.test(pathname));
  if (!route) return { handled: false };

  await delay();

  const match = pathname.match(route.re);
  const params = {};
  route.keys.forEach((key, i) => {
    params[key] = decodeURIComponent(match[i + 1]);
  });

  const ctx = {
    method: method.toUpperCase(),
    path: pathname,
    params,
    query: Object.fromEntries(new URLSearchParams(search)),
    body: body === undefined ? undefined : structuredClone(body),
    headers,
    user: userFromHeaders(headers),
  };

  try {
    const result = await route.handler(ctx);
    return { handled: true, data: result === undefined ? null : structuredClone(result) };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // A bug inside a mock handler must not look like a real server answer.
    console.error(`[mock] ${method} ${pathname} crashed`, error);
    throw new ApiError(500, 'The mock handler crashed. See the console.');
  }
}
