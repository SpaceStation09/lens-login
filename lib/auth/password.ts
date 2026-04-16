import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, saved] = storedHash.split(":");
  const current = scryptSync(password, salt, 64);
  const expected = Buffer.from(saved, "hex");
  return timingSafeEqual(current, expected);
}
