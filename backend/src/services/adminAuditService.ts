import { db } from "../db";
import type { AdminContext } from "../types";

interface AuditDetails {
  [key: string]: unknown;
}

export const logAdminAction = async (
  actionType: string,
  details: AuditDetails = {},
  actor?: AdminContext,
  sessionId: string | null = null,
): Promise<void> => {
  if (!actor) {
    return;
  }

  try {
    // IMPORTANT: call the method on the db instance to preserve `this` binding
    const dbWithAudit = db as unknown as Record<string, unknown>;
    const addAdminAction = dbWithAudit.addAdminAction;
    if (typeof addAdminAction === "function") {
      await (
        addAdminAction as (
          sessionId: string | null,
          actionType: string,
          details: Record<string, unknown>,
          email?: string,
        ) => Promise<void>
      ).call(
        db,
        sessionId,
        actionType,
        {
          ...details,
          adminId: actor.userId,
          adminRole: actor.role,
        },
        actor.email,
      );
    } else {
      console.info("[AdminAudit]", {
        actionType,
        details,
        actor: actor.email ?? actor.userId,
      });
    }
  } catch (error) {
    console.error("[AdminAudit] Failed to record action", {
      actionType,
      error,
    });
  }
};
