import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function recordAudit(input: { userId?: string; action: string; entityType?: string; entityId?: string; metadata?: Prisma.InputJsonValue }) {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  } catch {
    // Auditing must never make the main admin action fail.
  }
}
