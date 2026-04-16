import { createHmac } from "node:crypto";

import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";

import { getSessionById, getUserById } from "@/lib/db/store";

const sessionCookieName = "lens_demo_session";

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "demo-session-secret-change-me";
}

function signSessionValue(sessionId: string) {
  return createHmac("sha256", getSessionSecret()).update(sessionId).digest("hex");
}

export function encodeSessionCookie(sessionId: string) {
  const signature = signSessionValue(sessionId);
  return `${sessionId}.${signature}`;
}

function decodeSessionCookie(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [sessionId, signature] = value.split(".");

  if (!sessionId || !signature) {
    return null;
  }

  if (signSessionValue(sessionId) !== signature) {
    return null;
  }

  return sessionId;
}

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, encodeSessionCookie(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser(cookieStore: ReadonlyRequestCookies) {
  const encoded = cookieStore.get(sessionCookieName)?.value;
  const sessionId = decodeSessionCookie(encoded);

  if (!sessionId) {
    return null;
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return getUserById(session.userId);
}

export async function getCurrentSessionId(cookieStore: ReadonlyRequestCookies) {
  return decodeSessionCookie(cookieStore.get(sessionCookieName)?.value);
}
