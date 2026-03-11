import { z } from "zod";
export declare const IssueBadgeSchema: z.ZodObject<{
    hederaAccountId: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    badge: z.ZodObject<{
        category: z.ZodString;
        level: z.ZodNumber;
        payRange: z.ZodString;
        issuedFor: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        category: string;
        level: number;
        payRange: string;
        issuedFor: string;
    }, {
        category: string;
        level: number;
        payRange: string;
        issuedFor: string;
    }>;
}, "strip", z.ZodTypeAny, {
    hederaAccountId: string;
    badge: {
        category: string;
        level: number;
        payRange: string;
        issuedFor: string;
    };
    displayName?: string | undefined;
}, {
    hederaAccountId: string;
    badge: {
        category: string;
        level: number;
        payRange: string;
        issuedFor: string;
    };
    displayName?: string | undefined;
}>;
export declare const VerifyCredentialSchema: z.ZodObject<{
    hederaAccountId: z.ZodString;
    credentialType: z.ZodString;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    hederaAccountId: string;
    credentialType: string;
    metadata: Record<string, any>;
}, {
    hederaAccountId: string;
    credentialType: string;
    metadata: Record<string, any>;
}>;
export declare const ValueEventSchema: z.ZodObject<{
    actor: z.ZodString;
    eventType: z.ZodString;
    amount: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodString>;
    reference: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    actor: string;
    eventType: string;
    metadata?: Record<string, any> | undefined;
    amount?: string | undefined;
    currency?: string | undefined;
    reference?: string | undefined;
}, {
    actor: string;
    eventType: string;
    metadata?: Record<string, any> | undefined;
    amount?: string | undefined;
    currency?: string | undefined;
    reference?: string | undefined;
}>;
//# sourceMappingURL=validators.d.ts.map