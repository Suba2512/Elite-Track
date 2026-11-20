import { execute, queryAll, queryOne } from '../../db/database.js';
import {
  NotificationLogRecord,
  OpportunityRecord,
  StudentRecordDB,
} from '../../models/types.js';
import { WhatsAppSendResult, WhatsAppService } from './WhatsAppService.js';

export interface OpportunityDistributionResult {
  opportunityId: string;
  inAppCount: number;
  whatsappQueuedCount: number;
  whatsappResults: WhatsAppSendResult[];
}

export class NotificationService {
  /**
   * Distributes an approved opportunity to students:
   * 1. Creates in-app notification records for all active students.
   * 2. Queues and dispatches WhatsApp messages only for opted-in students (whatsapp_consent = 1).
   */
  static async distributeApprovedOpportunity(opp: OpportunityRecord): Promise<OpportunityDistributionResult> {
    const students = queryAll<StudentRecordDB>('SELECT * FROM students');
    const nowIso = new Date().toISOString();
    let inAppCount = 0;
    const whatsappResults: WhatsAppSendResult[] = [];

    const formattedMessage = WhatsAppService.formatOpportunityMessage(opp);

    for (const student of students) {
      // 1. In-app notification for all students
      const inAppIdempotencyKey = `inapp-opp-${opp.id}-stu-${student.id}`;
      const existingInApp = queryOne<NotificationLogRecord>(
        'SELECT * FROM notification_logs WHERE idempotency_key = ?',
        [inAppIdempotencyKey]
      );

      if (!existingInApp) {
        const logId = `notif-inapp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        execute(
          `INSERT INTO notification_logs (
             id, opportunity_id, student_id, channel, notification_type, message_content,
             delivery_status, provider_message_id, failure_reason, idempotency_key, sent_at, delivered_at, created_at
           ) VALUES (?, ?, ?, 'in_app', 'new_opportunity', ?, 'delivered', NULL, NULL, ?, ?, ?, ?)`,
          [
            logId,
            opp.id,
            student.id,
            `Verified ${opp.category}: ${opp.title} (${opp.company}) approved by mentor. Deadline: ${opp.registration_deadline}`,
            inAppIdempotencyKey,
            nowIso,
            nowIso,
            nowIso,
          ]
        );
        inAppCount++;
      }

      // 2. WhatsApp notification for opted-in students only
      if (student.whatsapp_consent) {
        const waIdempotencyKey = `wa-opp-${opp.id}-stu-${student.id}`;
        try {
          const res = await WhatsAppService.sendToStudent(
            student,
            formattedMessage,
            opp.id,
            'new_opportunity',
            waIdempotencyKey
          );
          whatsappResults.push(res);
        } catch (err: any) {
          whatsappResults.push({
            studentId: student.id,
            phone: student.whatsapp_number,
            success: false,
            error: err.message || 'Error executing WhatsApp delivery',
          });
        }
      }
    }

    return {
      opportunityId: opp.id,
      inAppCount,
      whatsappQueuedCount: whatsappResults.length,
      whatsappResults,
    };
  }

  /**
   * Retries an eligible failed notification.
   */
  static async retryFailedNotification(notificationId: string): Promise<boolean> {
    const notif = queryOne<NotificationLogRecord>(
      'SELECT * FROM notification_logs WHERE id = ?',
      [notificationId]
    );

    if (!notif || notif.delivery_status !== 'failed') {
      return false;
    }

    const student = queryOne<StudentRecordDB>(
      'SELECT * FROM students WHERE id = ?',
      [notif.student_id]
    );

    if (!student) return false;

    if (notif.channel === 'whatsapp') {
      // Re-dispatch WhatsApp message
      const res = await WhatsAppService.sendToStudent(
        student,
        notif.message_content,
        notif.opportunity_id,
        notif.notification_type,
        `retry-${Date.now()}-${notif.idempotency_key}`
      );
      return res.success;
    } else {
      execute(
        `UPDATE notification_logs SET
           delivery_status = 'delivered',
           failure_reason = NULL,
           delivered_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), notif.id]
      );
      return true;
    }
  }

  /**
   * Retrieves notification logs with filtering.
   */
  static getLogs(options: {
    studentId?: string;
    channel?: string;
    status?: string;
    limit?: number;
  }): NotificationLogRecord[] {
    const { studentId, channel, status, limit = 50 } = options;
    let sql = 'SELECT * FROM notification_logs WHERE 1=1';
    const params: (string | number)[] = [];

    if (studentId) {
      sql += ' AND student_id = ?';
      params.push(studentId);
    }
    if (channel) {
      sql += ' AND channel = ?';
      params.push(channel);
    }
    if (status) {
      sql += ' AND delivery_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return queryAll<NotificationLogRecord>(sql, params);
  }
}
