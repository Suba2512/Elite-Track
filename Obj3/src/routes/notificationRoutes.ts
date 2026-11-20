import { Router, Response } from 'express';
import { queryAll, queryOne } from '../db/database.js';
import { AuthenticatedRequest, requireMentor } from '../middleware/authMiddleware.js';
import { OpportunityRecord, StudentRecordDB } from '../models/types.js';
import { NotificationService } from '../services/notifications/NotificationService.js';
import { WhatsAppService } from '../services/notifications/WhatsAppService.js';

export const notificationRouter = Router();

/**
 * Preview WhatsApp announcement text for any opportunity before approving/publishing.
 */
notificationRouter.post('/preview', requireMentor, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { opportunityId, customData } = req.body;
    let opp: OpportunityRecord | undefined;

    if (opportunityId) {
      opp = queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', [opportunityId]);
    } else if (customData) {
      opp = customData as OpportunityRecord;
    }

    if (!opp) {
      res.status(400).json({ error: 'Please provide opportunityId or customData for preview' });
      return;
    }

    const messagePreview = WhatsAppService.formatOpportunityMessage(opp);
    const optedInCount = queryOne<{ count: number }>(
      'SELECT count(*) as count FROM students WHERE whatsapp_consent = 1'
    )?.count || 0;

    res.json({
      previewText: messagePreview,
      targetAudience: `All 17 batch students (In-App) + ${optedInCount} opted-in students (WhatsApp)`,
      templateName: opp.category === 'Contest' ? 'upcoming_coding_contest_v1' : 'new_company_hackathon_v1',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Audit log of all outgoing notifications (WhatsApp and In-App).
 */
notificationRouter.get('/logs', requireMentor, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, channel, status, limit } = req.query;
    const logs = NotificationService.getLogs({
      studentId: studentId as string,
      channel: channel as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Retry an eligible failed notification.
 */
notificationRouter.post('/:id/retry', requireMentor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await NotificationService.retryFailedNotification(req.params.id);
    res.json({ success, message: success ? 'Notification retried' : 'Retry failed or not eligible' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Send custom batch announcement.
 */
notificationRouter.post('/announce', requireMentor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, message, viaWhatsapp } = req.body;
    if (!title || !message) {
      res.status(400).json({ error: 'Missing title or message' });
      return;
    }

    const students = queryAll<StudentRecordDB>('SELECT * FROM students');
    const nowIso = new Date().toISOString();
    let sentCount = 0;

    for (const st of students) {
      const inAppKey = `inapp-ann-${Date.now()}-${st.id}`;
      // In-app log
      const { execute } = await import('../db/database.js');
      execute(
        `INSERT INTO notification_logs (
           id, opportunity_id, student_id, channel, notification_type, message_content,
           delivery_status, idempotency_key, sent_at, delivered_at, created_at
         ) VALUES (?, NULL, ?, 'in_app', 'announcement', ?, 'delivered', ?, ?, ?, ?)`,
        [`notif-${Date.now()}-${st.id}`, st.id, `${title}: ${message}`, inAppKey, nowIso, nowIso, nowIso]
      );
      sentCount++;

      // WhatsApp broadcast if enabled and consented
      if (viaWhatsapp && st.whatsapp_consent) {
        const waKey = `wa-ann-${Date.now()}-${st.id}`;
        const waText = `*ELITE TRACK ANNOUNCEMENT*\n\n*${title}*\n\n${message}\n\n_Dr. R. Ganesh, Lead Mentor_`;
        await WhatsAppService.sendToStudent(st, waText, null, 'announcement', waKey);
      }
    }

    res.json({ success: true, recipientsCount: sentCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
