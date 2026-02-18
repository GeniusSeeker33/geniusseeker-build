import { z } from "zod";

export const IssueBadgeSchema = z.object({
  hederaAccountId: z.string().min(4),
  displayName: z.string().min(1).max(80).optional(),
  badge: z.object({
    category: z.string().min(1),   // Science/Tech/Engineering/Arts/Math/Healer...
    level: z.number().int().min(1).max(5),
    payRange: z.string().min(1),
    issuedFor: z.string().min(1)   // e.g. "STEAM Quiz"
  })
});

export const VerifyCredentialSchema = z.object({
  hederaAccountId: z.string().min(4),
  credentialType: z.string().min(1), // "Verified Interview" | "Verified Experience" etc
  metadata: z.record(z.any())
});

export const ValueEventSchema = z.object({
  actor: z.string().min(1),        // account id or company id
  eventType: z.string().min(1),    // "QUIZ_COMPLETED" | "HIRED" | "PLACEMENT_PAID" etc
  amount: z.string().optional(),   // store as string to avoid float issues
  currency: z.string().optional(), // "GLCD" | "HBAR" | "DGB" | "USD"
  reference: z.string().optional(),
  metadata: z.record(z.any()).optional()
});
