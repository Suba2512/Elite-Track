import { execute, queryAll, queryOne } from '../../db/database.js';
import {
  OpportunityRecord,
  OpportunityReminderRecord,
  ReminderType,
  StudentRecordDB,
  StudentOpportunityStatusRecord,
} from '../../models/types.js';
import { REMINDER_OFFSETS_HOURS } from '../../config/constants.js';
import { WhatsAppService } from '../notifications/WhatsAppService.js';

export class ReminderScheduler {
  /**
   * Automatically schedules 24h & 6h deadline reminders or 24h & 1h contest reminders
   * for students who have saved or opted into reminders for an opportunity.
   */
  static async scheduleDefaultRemindersForOpportunity(opp: OpportunityRecord): Promise<number> {
    // Find students who have remind_me = 1 or saved = 1 for this opportunity
    const interestedStatuses = queryAll<StudentOpportunityStatusRecord>(
      'SELECT * FROM student_opportunity_status WHERE opportunity_id = ? AND (remind_me = 1 OR saved = 1)',
      [opp.id]
    );

    let scheduledCount = 0;
    const now = Date.now();

    for (const st of interestedStatuses) {
      if (opp.category === 'Contest') {
        // Schedule contest start reminders
        const contestStartTime = new Date(opp.event_start).getTime();
        if (!isNaN(contestStartTime)) {
          // 24 hours before
          const time24h = new Date(contestStartTime - REMINDER_OFFSETS_HOURS.CONTEST_FIRST * 3600 * 1000);
          if (time24h.getTime() > now) {
            if (this.insertReminder(st.student_id, opp.id, 'contest_24h', time24h.toISOString())) {
              scheduledCount++;
            }
          }
          // 1 hour before
          const time1h = new Date(contestStartTime - REMINDER_OFFSETS_HOURS.CONTEST_URGENT * 3600 * 1000);
          if (time1h.getTime() > now) {
            if (this.insertReminder(st.student_id, opp.id, 'contest_1h', time1h.toISOString())) {
              scheduledCount++;
            }
          }
        }
      } else {
        // Schedule registration deadline reminders for hackathons
        const deadlineTime = new Date(opp.registration_deadline).getTime();
        if (!isNaN(deadlineTime)) {
          // 24 hours before
          const time24h = new Date(deadlineTime - REMINDER_OFFSETS_HOURS.DEADLINE_FIRST * 3600 * 1000);
          if (time24h.getTime() > now) {
            if (this.insertReminder(st.student_id, opp.id, 'deadline_24h', time24h.toISOString())) {
              scheduledCount++;
            }
          }
          // 6 hours before
          const time6h = new Date(deadlineTime - REMINDER_OFFSETS_HOURS.DEADLINE_URGENT * 3600 * 1000);
          if (time6h.getTime() > now) {
            if (this.insertReminder(st.student_id, opp.id, 'deadline_6h', time6h.toISOString())) {
              scheduledCount++;
            }
          }
        }
      }
    }

    return scheduledCount;
  }

  private static insertReminder(
    studentId: string,
    opportunityId: string,
    reminderType: ReminderType,
    scheduledAt: string
  ): boolean {
    const existing = queryOne(
      'SELECT id FROM opportunity_reminders WHERE student_id = ? AND opportunity_id = ? AND reminder_type = ?',
      [studentId, opportunityId, reminderType]
    );

    if (!existing) {
      const reminderId = `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      execute(
        `INSERT INTO opportunity_reminders (id, student_id, opportunity_id, reminder_type, scheduled_at, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [reminderId, studentId, opportunityId, reminderType, scheduledAt, new Date().toISOString()]
      );
      return true;
    }
    return false;
  }

  /**
   * Sweeps and processes all due reminders.
   */
  static async processDueReminders(): Promise<{ processedCount: number; errors: string[] }> {
    const nowIso = new Date().toISOString();
    const errors: string[] = [];
    let processedCount = 0;

    const dueReminders = queryAll<OpportunityReminderRecord>(
      "SELECT * FROM opportunity_reminders WHERE status = 'pending' AND scheduled_at <= ?",
      [nowIso]
    );

    for (const rem of dueReminders) {
      try {
        const opp = queryOne<OpportunityRecord>(
          'SELECT * FROM opportunities WHERE id = ?',
          [rem.opportunity_id]
        );

        // Discard if opportunity was cancelled, deleted or rejected
        if (!opp || opp.approval_status !== 'Approved') {
          execute("UPDATE opportunity_reminders SET status = 'cancelled' WHERE id = ?", [rem.id]);
          continue;
        }

        // Discard if already expired
        const deadlineTime = new Date(opp.registration_deadline).getTime();
        if (deadlineTime < Date.now()) {
          execute("UPDATE opportunity_reminders SET status = 'cancelled' WHERE id = ?", [rem.id]);
          continue;
        }

        const student = queryOne<StudentRecordDB>(
          'SELECT * FROM students WHERE id = ?',
          [rem.student_id]
        );

        if (!student) {
          execute("UPDATE opportunity_reminders SET status = 'cancelled' WHERE id = ?", [rem.id]);
          continue;
        }

        const reminderMsg = WhatsAppService.formatReminderMessage(opp, rem.reminder_type);

        // 1. In-App Notification
        const inAppKey = `inapp-rem-${rem.id}`;
        execute(
          `INSERT OR IGNORE INTO notification_logs (
             id, opportunity_id, student_id, channel, notification_type, message_content,
             delivery_status, failure_reason, idempotency_key, sent_at, delivered_at, created_at
           ) VALUES (?, ?, ?, 'in_app', 'deadline_reminder', ?, 'delivered', NULL, ?, ?, ?, ?)`,
          [
            `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            opp.id,
            student.id,
            `Reminder: ${opp.title} (${opp.company}) deadline approaching.`,
            inAppKey,
            nowIso,
            nowIso,
            nowIso,
          ]
        );

        // 2. WhatsApp Notification if student opted in
        if (student.whatsapp_consent) {
          const waKey = `wa-rem-${rem.id}`;
          await WhatsAppService.sendToStudent(
            student,
            reminderMsg,
            opp.id,
            'deadline_reminder',
            waKey
          );
        }

        // Mark reminder as sent
        execute(
          "UPDATE opportunity_reminders SET status = 'sent', sent_at = ? WHERE id = ?",
          [nowIso, rem.id]
        );
        processedCount++;
      } catch (err: any) {
        errors.push(`Error processing reminder ${rem.id}: ${err.message}`);
      }
    }

    return { processedCount, errors };
  }
}
