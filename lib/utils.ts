import { randomUUID } from "node:crypto";

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export function normalizeAddress(value: string) {
  return value.toLowerCase();
}

export function nowIso() {
  return new Date().toISOString();
}
