import { createHash, randomBytes, randomUUID, timingSafeEqual, createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { AppError, ValidationError } from "./errors";
import { logger } from "./logger";
import { APP_NAME, ROLES, type Role } from "./constants";


export const AUTH_SESSION_COOKIE = "ddcpl_session";
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const AUTH_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
};

export interface AuthTokens {
  token: string;
  plainRefresh?: string;
}

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

export function createSessionToken(): string {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

export function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function roleHas(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false;
  if (role === "ADMIN") return true;
  return role === min;
}

export function canManage(actor: Role | null | undefined): boolean {
  return roleHas(actor, "ADMIN");
}

export function canViewTender(actorRole: Role | null | undefined): boolean {
  return roleHas(actorRole, "USER");
}

export interface SessionPayload {
  userId: string;
  role: Role;
  pe: string;
  sub: string;
  exp: number;
}
