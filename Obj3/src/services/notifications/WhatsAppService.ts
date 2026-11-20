import { ENV } from '../../config/env.js';
import { execute, queryOne } from '../../db/database.js';
import {
  NotificationLogRecord,
  OpportunityRecord,
  StudentRecordDB,
} from '../../models/types.js';

export interface WhatsAppSendResult {
  studentId: string;
  phone: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppTemplatePayload {
  templateName: string;
  languageCode: string;
  headerText?: string;
  bodyParameters: string[];
}

export class WhatsAppService {
  /**
   * Normalizes an Indian or international phone number to WhatsApp E.164 format (e.g. "919840122104")
   */
  static normalizePhoneNumber(rawNumber: string): string {
    if (!rawNumber) return '';
    // Strip non-digit characters
    let digits = rawNumber.replace(/\D/g, '');
    // If 10 digits starting with 6,7,8,9, prepend 91
    if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) {
      digits = `91${digits}`;
    }
    return digits;
  }

  /**
   * Generates formatted message text for preview or text dispatch.
   */
  static formatOpportunityMessage(opp: OpportunityRecord): string {
    // Format deadline to Indian Standard Time (IST)
    let deadlineStr = opp.registration_deadline;
    try {
      const d = new Date(opp.registration_deadline);
      deadlineStr = d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      deadlineStr = opp.registration_deadline;
    }

    if (opp.category === 'Hackathon' || opp.category === 'Hiring Challenge') {
      return (
        `*NEW COMPANY ${opp.category.toUpperCase()}*\n\n` +
        `*Event:* ${opp.title}\n` +
        `*Company:* ${opp.company}\n` +
        `*Eligibility:* ${opp.eligibility}\n` +
        `*Registration Deadline:* ${deadlineStr}\n` +
        `*Perks:* ${opp.prize_or_perk}\n\n` +
        `*Registration Link:*\n${opp.registration_url}\n\n` +
        `_Approved by Elite Track Mentor (${ENV.MENTOR_NAME})_`
      );
    } else {
      let startStr = opp.event_start;
      try {
        const d = new Date(opp.event_start);
        startStr = d.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        startStr = opp.event_start;
      }

      return (
        `*UPCOMING CODING CONTEST*\n\n` +
        `*Platform:* ${opp.platform}\n` +
        `*Contest:* ${opp.title}\n` +
        `*Rating Status:* ${opp.contest_rating_type}\n` +
        `*Start Time (IST):* ${startStr}\n` +
        `*Registration Closes:* ${deadlineStr}\n\n` +
        `*Contest Link:*\n${opp.registration_url}\n\n` +
        `_Approved by Elite Track Mentor (${ENV.MENTOR_NAME})_`
      );
    }
  }

  /**
   * Formats a reminder notification message.
   */
  static formatReminderMessage(opp: OpportunityRecord, reminderType: string): string {
    const isContest = opp.category === 'Contest';
    let timeLabel = '';
    if (reminderType === 'deadline_24h') timeLabel = '24 hours left to register';
    else if (reminderType === 'deadline_6h') timeLabel = 'URGENT: Only 6 hours left to register';
    else if (reminderType === 'contest_24h') timeLabel = 'Contest starts tomorrow (in 24 hours)';
    else if (reminderType === 'contest_1h') timeLabel = 'Contest starting in 1 hour!';

    return (
      `*REMINDER: ${opp.title}*\n\n` +
      `⏰ *${timeLabel}*\n` +
      `*Platform/Company:* ${opp.company || opp.platform}\n\n` +
      `*Link:*\n${opp.registration_url}\n\n` +
      `_Elite Track Automated Reminder_`
    );
  }

  /**
   * Sends an approved opportunity WhatsApp announcement to a single opted-in student.
   */
  static async sendToStudent(
    student: StudentRecordDB,
    messageContent: string,
    opportunityId: string | null,
    notificationType: string,
    idempotencyKey: string
  ): Promise<WhatsAppSendResult> {
    // 1. Strict Consent Check
    if (!student.whatsapp_consent) {
      console.log(`[WhatsApp] Skipped student ${student.name} (${student.id}): No WhatsApp consent`);
      return {
        studentId: student.id,
        phone: student.whatsapp_number,
        success: false,
        error: 'Student opted out of WhatsApp notifications (whatsapp_consent is false)',
      };
    }

    const normPhone = this.normalizePhoneNumber(student.whatsapp_number);
    if (!normPhone || normPhone.length < 10) {
      return {
        studentId: student.id,
        phone: student.whatsapp_number,
        success: false,
        error: `Invalid phone number format: ${student.whatsapp_number}`,
      };
    }

    // 2. Check Idempotency in DB
    const existingLog = queryOne<NotificationLogRecord>(
      'SELECT * FROM notification_logs WHERE idempotency_key = ?',
      [idempotencyKey]
    );

    if (existingLog && existingLog.delivery_status !== 'failed') {
      console.log(`[WhatsApp] Skipped duplicate message with idempotency key: ${idempotencyKey}`);
      return {
        studentId: student.id,
        phone: normPhone,
        success: true,
        messageId: existingLog.provider_message_id || undefined,
      };
    }

    const logId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Insert queued log
    execute(
      `INSERT OR REPLACE INTO notification_logs (
         id, opportunity_id, student_id, channel, notification_type, message_content,
         delivery_status, provider_message_id, failure_reason, idempotency_key, created_at
       ) VALUES (?, ?, ?, 'whatsapp', ?, ?, 'queued', NULL, NULL, ?, ?)`,
      [logId, opportunityId, student.id, notificationType, messageContent, idempotencyKey, nowIso]
    );

    // 3. Dispatch to Meta WhatsApp Business Cloud API
    const accessToken = ENV.WHATSAPP_ACCESS_TOKEN;
    const phoneId = ENV.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneId) {
      const missingConfigReason =
        'Meta WhatsApp Cloud API credentials not configured in environment (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing)';
      console.warn(`[WhatsApp] ${missingConfigReason}. Message logged as failed/pending config.`);

      execute(
        `UPDATE notification_logs SET
           delivery_status = 'failed',
           failure_reason = ?,
           sent_at = ?
         WHERE id = ?`,
        [missingConfigReason, nowIso, logId]
      );

      return {
        studentId: student.id,
        phone: normPhone,
        success: false,
        error: missingConfigReason,
      };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: messageContent,
          },
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status} from Meta WhatsApp API`;
        console.error(`[WhatsApp API Error] To: ${normPhone}, Error: ${errorMsg}`);

        execute(
          `UPDATE notification_logs SET
             delivery_status = 'failed',
             failure_reason = ?,
             sent_at = ?
           WHERE id = ?`,
          [errorMsg, nowIso, logId]
        );

        return {
          studentId: student.id,
          phone: normPhone,
          success: false,
          error: errorMsg,
        };
      }

      const metaMessageId = data.messages?.[0]?.id || `wamid-${Date.now()}`;

      execute(
        `UPDATE notification_logs SET
           delivery_status = 'sent',
           provider_message_id = ?,
           sent_at = ?
         WHERE id = ?`,
        [metaMessageId, nowIso, logId]
      );

      return {
        studentId: student.id,
        phone: normPhone,
        success: true,
        messageId: metaMessageId,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Network error reaching WhatsApp Cloud API';
      execute(
        `UPDATE notification_logs SET
           delivery_status = 'failed',
           failure_reason = ?,
           sent_at = ?
         WHERE id = ?`,
        [errorMsg, nowIso, logId]
      );

      return {
        studentId: student.id,
        phone: normPhone,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Processes incoming Meta WhatsApp Webhook payloads (sent, delivered, read, failed).
   */
  static processWebhookPayload(payload: any): { processedCount: number } {
    let processedCount = 0;
    try {
      const entries = payload?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          const statuses = value?.statuses || [];
          for (const status of statuses) {
            const providerMsgId = status.id;
            const statusStr = status.status; // 'sent', 'delivered', 'read', 'failed'
            const timestamp = status.timestamp ? new Date(parseInt(status.timestamp, 10) * 1000).toISOString() : new Date().toISOString();

            if (statusStr === 'delivered') {
              execute(
                `UPDATE notification_logs SET
                   delivery_status = 'delivered',
                   delivered_at = ?
                 WHERE provider_message_id = ? AND delivery_status != 'read'`,
                [timestamp, providerMsgId]
              );
              processedCount++;
            } else if (statusStr === 'read') {
              execute(
                `UPDATE notification_logs SET
                   delivery_status = 'read',
                   read_at = ?
                 WHERE provider_message_id = ?`,
                [timestamp, providerMsgId]
              );
              processedCount++;
            } else if (statusStr === 'failed') {
              const errorReason = status.errors?.[0]?.message || 'Delivery failed per WhatsApp webhook';
              execute(
                `UPDATE notification_logs SET
                   delivery_status = 'failed',
                   failure_reason = ?
                 WHERE provider_message_id = ?`,
                [errorReason, providerMsgId]
              );
              processedCount++;
            }
          }
        }
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Error parsing webhook payload:', err);
    }
    return { processedCount };
  }
}
