import { z } from "zod";
import { ValidationError } from "./errors";

export const cuidSchema = z
  .string()
  .regex(/^c[a-z0-9]+$/i, "Invalid id")
  .min(10);

export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(200);

export const urlSchema = z.string().url("Invalid URL").max(2000);

export const positiveInt = z.number().int().positive();
export const nonNegInt = z.number().int().nonnegative();

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const first = r.error.issues[0];
    throw new ValidationError(
      first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
      { issues: r.error.issues },
    );
  }
  return r.data;
}
