import { request } from './request.js';

const enc = encodeURIComponent;

export function getTravellerProfile(userId) {
  if (!userId) return Promise.resolve(null);
  return request(`/traveller/${enc(userId)}`);
}

export function createTravellerProfile(payload) {
  return request('/traveller', { method: 'POST', body: payload });
}

export function updateTravellerProfile(userId, payload) {
  if (!userId) return Promise.reject(new Error('Traveller userId is required.'));
  return request(`/traveller/${enc(userId)}`, { method: 'PATCH', body: payload });
}
