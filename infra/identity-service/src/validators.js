"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueEventSchema = exports.VerifyCredentialSchema = exports.IssueBadgeSchema = void 0;
const zod_1 = require("zod");
exports.IssueBadgeSchema = zod_1.z.object({
    hederaAccountId: zod_1.z.string().min(4),
    displayName: zod_1.z.string().min(1).max(80).optional(),
    badge: zod_1.z.object({
        category: zod_1.z.string().min(1), // Science/Tech/Engineering/Arts/Math/Healer...
        level: zod_1.z.number().int().min(1).max(5),
        payRange: zod_1.z.string().min(1),
        issuedFor: zod_1.z.string().min(1) // e.g. "STEAM Quiz"
    })
});
exports.VerifyCredentialSchema = zod_1.z.object({
    hederaAccountId: zod_1.z.string().min(4),
    credentialType: zod_1.z.string().min(1), // "Verified Interview" | "Verified Experience" etc
    metadata: zod_1.z.record(zod_1.z.any())
});
exports.ValueEventSchema = zod_1.z.object({
    actor: zod_1.z.string().min(1), // account id or company id
    eventType: zod_1.z.string().min(1), // "QUIZ_COMPLETED" | "HIRED" | "PLACEMENT_PAID" etc
    amount: zod_1.z.string().optional(), // store as string to avoid float issues
    currency: zod_1.z.string().optional(), // "GLCD" | "HBAR" | "DGB" | "USD"
    reference: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
//# sourceMappingURL=validators.js.map