// Server-side validation the real NestJS DTOs perform (class-validator), reproduced for mocks.
import { ApiError } from '@/foundation';
import { EXPERIENCE_CATEGORIES } from './db.js';

// CreateExperienceDto / UpdateExperienceDto: the only fields the backend accepts.
export const EXPERIENCE_FIELDS = [
  'id', 'partnerId', 'title', 'description', 'destination', 'category', 'availability', 'price',
  'durationHours', 'capacity', 'booked', 'image', 'nextSlot', 'slots', 'status', 'isDeleted',
];

const isString = (v) => typeof v === 'string';
const isNonEmpty = (v) => isString(v) && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

const RULES = {
  id: [isString, 'id must be a string'],
  partnerId: [isString, 'partnerId must be a string'],
  title: [isNonEmpty, 'title should not be empty'],
  description: [isString, 'description must be a string'],
  destination: [isNonEmpty, 'destination should not be empty'],
  category: [(v) => EXPERIENCE_CATEGORIES.includes(v), `category must be one of the following values: ${EXPERIENCE_CATEGORIES.join(', ')}`],
  availability: [(v) => ['available', 'unavailable'].includes(v), 'availability must be one of the following values: available, unavailable'],
  price: [(v) => isNum(v) && v >= 0, 'price must not be less than 0'],
  durationHours: [(v) => isNum(v) && v >= 1, 'durationHours must not be less than 1'],
  capacity: [(v) => isNum(v) && v >= 0, 'capacity must not be less than 0'],
  booked: [(v) => isNum(v) && v >= 0, 'booked must not be less than 0'],
  image: [isString, 'image must be a string'],
  nextSlot: [isString, 'nextSlot must be a string'],
  status: [(v) => ['active', 'inactive', 'restricted'].includes(v), 'status must be one of the following values: active, inactive, restricted'],
  isDeleted: [(v) => typeof v === 'boolean', 'isDeleted must be a boolean value'],
};

const REQUIRED_ON_CREATE = ['title', 'description', 'destination', 'category', 'price', 'durationHours'];

function slotProblem(slot, index) {
  const at = `slots.${index}`;
  if (slot === null || typeof slot !== 'object') return `${at} must be an object`;
  if (!isString(slot.id) || !slot.id) return `${at}.id must be a string`;
  if (!isString(slot.date) || !/^\d{4}-\d{2}-\d{2}$/.test(slot.date)) return `${at}.date must be a date in YYYY-MM-DD format`;
  if (!isNonEmpty(slot.time)) return `${at}.time should not be empty`;
  if (!isNum(slot.booked) || slot.booked < 0) return `${at}.booked must not be less than 0`;
  if (!isNum(slot.capacity) || slot.capacity < 1) return `${at}.capacity must not be less than 1`;
  if (typeof slot.available !== 'boolean') return `${at}.available must be a boolean value`;
  const extra = Object.keys(slot).find((k) => !['id', 'date', 'time', 'booked', 'capacity', 'available'].includes(k));
  if (extra) return `${at}.property ${extra} should not exist`;
  return null;
}

export function validateSlots(slots) {
  if (!Array.isArray(slots)) return 'slots must be an array';
  for (let i = 0; i < slots.length; i += 1) {
    const problem = slotProblem(slots[i], i);
    if (problem) return problem;
  }
  return null;
}

export function validateExperience(body, { partial }) {
  const errors = {};
  if (!partial) {
    REQUIRED_ON_CREATE.forEach((field) => {
      if (body[field] === undefined) errors[field] = `${field} should not be empty`;
    });
  }
  Object.entries(RULES).forEach(([field, [test, message]]) => {
    if (body[field] !== undefined && !test(body[field])) errors[field] = message;
  });
  if (body.slots !== undefined) {
    const problem = validateSlots(body.slots);
    if (problem) errors.slots = problem;
  }
  if (Object.keys(errors).length) throw new ApiError(400, Object.values(errors)[0], errors);
}
