import { db } from '@novaflow/database';
import { activityLog } from '@novaflow/database';

export async function logActivity(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(activityLog).values({
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      entityName: params.entityName ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
