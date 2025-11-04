"use server";

import "server-only";
import { z } from "zod";
import { redirect } from "next/navigation";
import { signInEmail } from "@/lib/auth-server";
import {
  checkRateLimit,
  recordRateLimitAttempt,
  formatRetryAfter,
} from "@/lib/enhanced-rate-limit";
import { createEmailSchema, createPasswordSchema } from "@/lib/input-sanitization";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

const loginSchema = z.object({
  email: createEmailSchema(),
  password: createPasswordSchema({ minLength: 8, maxLength: 128 }),
});

export type SignInSchema = z.infer<typeof loginSchema>;

export const login = async (
  _prevState: { error?: string },
  formData: FormData,
): Promise<never | { error?: string }> => {
  console.debug("Calling login server action!");

  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  // SECURITY: Validate and sanitize input
  const { success, data, error } = loginSchema.safeParse(rawData);

  if (!success) {
    return { error: z.prettifyError(error) };
  }

  // SECURITY: Check rate limit before attempting login
  // This prevents brute force attacks
  const [userRecord] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, data.email))
    .limit(1);

  if (userRecord) {
    const rateLimit = await checkRateLimit(userRecord.id, "LOGIN_ATTEMPT");

    if (!rateLimit.allowed) {
      const retryAfter = rateLimit.retryAfter
        ? formatRetryAfter(rateLimit.retryAfter)
        : "später";
      return {
        error: `Zu viele Anmeldeversuche. Bitte versuche es ${retryAfter} erneut.`,
      };
    }
  }

  try {
    // SECURITY: Use timing-safe authentication
    await signInEmail({
      body: {
        email: data.email,
        password: data.password,
      },
      asResponse: false,
    });

    // Login successful
    console.debug("Login successful");
    redirect("/dashboard");
  } catch (err) {
    // SECURITY: Record failed attempt for rate limiting
    if (userRecord) {
      await recordRateLimitAttempt(userRecord.id, "LOGIN_ATTEMPT");
    }

    // SECURITY: Log error without exposing PII (GDPR compliance)
    console.error("[login] Failed login attempt:", {
      userId: userRecord?.id, // Use ID instead of email
      error: err instanceof Error ? err.message : "Unknown error",
    });

    // SECURITY: Generic error message to prevent user enumeration
    return {
      error: "E-Mail oder Passwort ist falsch",
    };
  }
};
