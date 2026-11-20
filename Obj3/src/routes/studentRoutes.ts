import { Router, Response } from 'express';
import { execute, queryAll, queryOne } from '../db/database.js';
import { AuthenticatedRequest, requireStudent } from '../middleware/authMiddleware.js';
import {
  EventStatus,
  OpportunityRecord,
  StudentRecordDB,
  StudentOpportunityStatusRecord,
} from '../models/types.js';
import { ReminderScheduler } from '../services/reminders/ReminderScheduler.js';

export const studentRouter = Router();

/**
 * Student Opportunity Feed (ONLY Approved & Published opportunities).
 * Excludes Expired opportunities by default.
 * Merges student's saved, remind_me, and participation status.
 */
studentRouter.get('/opportunities', requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.userId!;
    const { category, search, savedOnly, status, platform, includeExpired, mode } = req.query;

    const nowIso = new Date().toISOString();
    // Phase 2 Rule: Automatically expire opportunities whose registration deadline has passed
    execute(
      `UPDATE opportunities
       SET event_status = 'Expired', updated_at = ?
       WHERE datetime(registration_deadline) < datetime(?)
         AND event_status NOT IN ('Expired', 'Completed', 'Cancelled')`,
      [nowIso, nowIso]
    );

    let sql = "SELECT * FROM opportunities WHERE approval_status = 'Approved'";
    const params: (string | number)[] = [];

    // Filter by mode (online, offline, hybrid)
    if (mode && mode !== 'All') {
      sql += ' AND LOWER(event_mode) = ?';
      params.push((mode as string).toLowerCase());
    }

    // Filter by category
    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category as string);
    }

    // Filter by platform
    if (platform && platform !== 'All') {
      sql += ' AND platform = ?';
      params.push(platform as string);
    }

    // Filter by event_status (if status requested, e.g. 'Expired', or default to excluding Expired)
    if (status && status !== 'All') {
      sql += ' AND event_status = ?';
      params.push(status as string);
    } else if (includeExpired !== 'true' && includeExpired !== '1') {
      sql += " AND event_status NOT IN ('Expired', 'Completed', 'Cancelled') AND datetime(registration_deadline) >= datetime(?)";
      params.push(nowIso);
    }

    if (search) {
      sql += ' AND (title LIKE ? OR company LIKE ? OR tags LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY registration_deadline ASC';

    const rawOpps = queryAll<OpportunityRecord>(sql, params);

    // Fetch student's specific saved and participation statuses
    const statuses = queryAll<StudentOpportunityStatusRecord>(
      'SELECT * FROM student_opportunity_status WHERE student_id = ?',
      [studentId]
    );
    const statusMap = new Map<string, StudentOpportunityStatusRecord>();
    statuses.forEach((s) => statusMap.set(s.opportunity_id, s));

    const now = Date.now();

    const opportunities = rawOpps
      .map((o) => {
        const studentStatus = statusMap.get(o.id);
        const deadlineTime = new Date(o.registration_deadline).getTime();
        const daysLeft = Math.max(0, Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24)));

        // Format deadline display string like "Nov 28, 2026"
        let deadlineDisplay = o.registration_deadline;
        try {
          deadlineDisplay = new Date(o.registration_deadline).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        } catch {
          deadlineDisplay = o.registration_deadline;
        }

        // Format dates display string
        let datesDisplay = o.event_start;
        try {
          const startStr = new Date(o.event_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const endStr = o.event_end
            ? new Date(o.event_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';
          datesDisplay = endStr ? `${startStr} – ${endStr}` : startStr;
        } catch {
          datesDisplay = o.event_start;
        }

        return {
          id: o.id,
          externalId: o.external_id,
          title: o.title,
          edition: o.edition || undefined,
          eventStatus: o.event_status,
          company: o.company,
          category: o.category,
          deadline: deadlineDisplay,
          daysLeft,
          source: o.platform,
          pipelineStage: o.approval_status,
          eligibility: o.eligibility,
          prizeOrPerk: o.prize_or_perk,
          dates: datesDisplay,
          eventStart: o.event_start,
          eventEnd: o.event_end,
          registrationUrl: o.registration_url,
          officialEventUrl: o.official_event_url || o.source_url,
          sourceListingUrl: o.source_listing_url || o.source_url,
          isRegistrationUrlValid: Boolean(o.is_registration_url_valid),
          linkVerifiedAt: o.link_verified_at,
          description: o.description,
          saved: Boolean(studentStatus?.saved),
          remindMe: Boolean(studentStatus?.remind_me),
          participationStatus: studentStatus?.participation_status || 'Interested',
          registrationConfirmedAt: studentStatus?.registration_confirmed_at || null,
          studentNotes: studentStatus?.notes || '',
          tags: typeof o.tags === 'string' ? JSON.parse(o.tags) : o.tags,
          isDuplicateFlagged: Boolean(o.is_duplicate_flagged),
          contestRatingType: o.contest_rating_type,
          eventMode: o.event_mode,
        };
      })
      .filter((o) => {
        if (savedOnly === 'true' || savedOnly === '1') {
          return o.saved;
        }
        return true;
      });

    res.json({ opportunities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Dedicated Contest Feed for Competitive Programming Contests.
 * Pulls from the same database records (category = 'Contest') for LeetCode, Codeforces, CodeChef, CodeGalatta.
 * Dynamically computes and enforces:
 * - Upcoming: startTimeUtc > nowUtc
 * - Ongoing: startTimeUtc <= nowUtc <= endTimeUtc
 * - Completed: nowUtc > endTimeUtc
 * Completed contests are NEVER shown in the Upcoming view.
 * Completed contests are preserved in the History view.
 */
studentRouter.get('/contests', requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.userId!;
    const { platform, status, view } = req.query;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    // Dynamically update statuses for contests in DB
    // Contests whose end time has passed are Completed
    execute(
      `UPDATE opportunities
       SET event_status = 'Completed', updated_at = ?
       WHERE category = 'Contest'
         AND event_end IS NOT NULL
         AND datetime(event_end) < datetime(?)
         AND event_status NOT IN ('Completed', 'Cancelled')`,
      [nowIso, nowIso]
    );

    // Contests whose start time + 2h has passed without explicit end time are Completed
    execute(
      `UPDATE opportunities
       SET event_status = 'Completed', updated_at = ?
       WHERE category = 'Contest'
         AND event_end IS NULL
         AND datetime(event_start, '+2 hours') < datetime(?)
         AND event_status NOT IN ('Completed', 'Cancelled')`,
      [nowIso, nowIso]
    );

    let sql = `SELECT * FROM opportunities 
               WHERE category = 'Contest' 
                 AND (approval_status = 'Approved' OR verification_status = 'VERIFIED')
                 AND approval_status != 'Rejected'`;
    const params: (string | number)[] = [];

    if (platform && platform !== 'All') {
      sql += ' AND platform = ?';
      params.push(platform as string);
    }

    if (status && status !== 'All') {
      sql += ' AND event_status = ?';
      params.push(status as string);
    }

    sql += ' ORDER BY event_start ASC';

    const rawContests = queryAll<OpportunityRecord>(sql, params);

    const statuses = queryAll<StudentOpportunityStatusRecord>(
      'SELECT * FROM student_opportunity_status WHERE student_id = ?',
      [studentId]
    );
    const statusMap = new Map<string, StudentOpportunityStatusRecord>();
    statuses.forEach((s) => statusMap.set(s.opportunity_id, s));

    const contests = rawContests.map((c) => {
      const studentStatus = statusMap.get(c.id);
      const startTime = new Date(c.event_start).getTime();
      const endTime = c.event_end
        ? new Date(c.event_end).getTime()
        : startTime + 2 * 3600 * 1000;

      // Dynamic real-time lifecycle calculation
      let dynamicStatus: EventStatus = c.event_status;
      if (now > endTime) {
        dynamicStatus = 'Completed';
      } else if (now >= startTime && now <= endTime) {
        dynamicStatus = 'Ongoing';
      } else {
        dynamicStatus = c.event_status === 'Registration Open' ? 'Registration Open' : 'Upcoming';
      }

      return {
        id: c.id,
        externalId: c.external_id,
        title: c.title,
        edition: c.edition || undefined,
        eventStatus: dynamicStatus,
        company: c.company,
        platform: c.platform,
        category: c.category,
        source: c.platform,
        eventStart: c.event_start,
        eventEnd: c.event_end,
        registrationDeadline: c.registration_deadline,
        registrationUrl: c.registration_url,
        officialEventUrl: c.official_event_url || c.source_url,
        sourceListingUrl: c.source_listing_url || c.source_url,
        isRegistrationUrlValid: Boolean(c.is_registration_url_valid),
        linkVerifiedAt: c.link_verified_at,
        contestRatingType: c.contest_rating_type,
        description: c.description,
        eligibility: c.eligibility,
        prizeOrPerk: c.prize_or_perk,
        saved: Boolean(studentStatus?.saved),
        remindMe: Boolean(studentStatus?.remind_me),
        participationStatus: studentStatus?.participation_status || 'Interested',
      };
    });

    // Filter by view mode if requested
    let filteredContests = contests;
    if (view === 'upcoming') {
      filteredContests = contests.filter((c) => c.eventStatus !== 'Completed' && (c.eventStatus as string) !== 'Expired');
    } else if (view === 'history') {
      filteredContests = contests.filter((c) => c.eventStatus === 'Completed' || (c.eventStatus as string) === 'Expired');
    } else if (view === 'ongoing') {
      filteredContests = contests.filter((c) => c.eventStatus === 'Ongoing');
    }

    res.json({ contests: filteredContests });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Toggle Save / Bookmark for an opportunity.
 */
studentRouter.post('/opportunities/:id/save', requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.userId!;
    const opportunityId = req.params.id;
    const nowIso = new Date().toISOString();

    const existing = queryOne<StudentOpportunityStatusRecord>(
      'SELECT * FROM student_opportunity_status WHERE student_id = ? AND opportunity_id = ?',
      [studentId, opportunityId]
    );

    let nextSaved = true;
    if (existing) {
      nextSaved = !existing.saved;
      execute(
        'UPDATE student_opportunity_status SET saved = ?, updated_at = ? WHERE id = ?',
        [nextSaved ? 1 : 0, nowIso, existing.id]
      );
    } else {
      execute(
        `INSERT INTO student_opportunity_status (id, student_id, opportunity_id, saved, remind_me, participation_status, updated_at)
         VALUES (?, ?, ?, 1, 0, 'Interested', ?)`,
        [`sos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, studentId, opportunityId, nowIso]
      );
    }

    res.json({ opportunityId, saved: nextSaved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Toggle Remind Me (and schedules/cancels reminders).
 */
studentRouter.post('/opportunities/:id/remind', requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.userId!;
    const opportunityId = req.params.id;
    const nowIso = new Date().toISOString();

    const opp = queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', [opportunityId]);
    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }

    const existing = queryOne<StudentOpportunityStatusRecord>(
      'SELECT * FROM student_opportunity_status WHERE student_id = ? AND opportunity_id = ?',
      [studentId, opportunityId]
    );

    let nextRemindMe = true;
    if (existing) {
      nextRemindMe = !existing.remind_me;
      execute(
        'UPDATE student_opportunity_status SET remind_me = ?, updated_at = ? WHERE id = ?',
        [nextRemindMe ? 1 : 0, nowIso, existing.id]
      );
    } else {
      execute(
        `INSERT INTO student_opportunity_status (id, student_id, opportunity_id, saved, remind_me, participation_status, updated_at)
         VALUES (?, ?, ?, 0, 1, 'Interested', ?)`,
        [`sos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, studentId, opportunityId, nowIso]
      );
    }

    if (nextRemindMe) {
      await ReminderScheduler.scheduleDefaultRemindersForOpportunity(opp);
    } else {
      // Cancel pending reminders for this student & opportunity
      execute(
        "UPDATE opportunity_reminders SET status = 'cancelled' WHERE student_id = ? AND opportunity_id = ? AND status = 'pending'",
        [studentId, opportunityId]
      );
    }

    res.json({ opportunityId, remindMe: nextRemindMe });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update student participation status ('Interested', 'Registered', 'Participating', 'Completed', 'Not Participating').
 */
studentRouter.patch('/opportunities/:id/status', requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.userId!;
    const opportunityId = req.params.id;
    const { status, notes } = req.body;

    const validStatuses = ['Interested', 'Registered', 'Participating', 'Completed', 'Not Participating'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid participation status. Allowed: ${validStatuses.join(', ')}` });
      return;
    }

    const nowIso = new Date().toISOString();
    const regConfirmedAt = status === 'Registered' ? nowIso : null;

    const existing = queryOne<StudentOpportunityStatusRecord>(
      'SELECT * FROM student_opportunity_status WHERE student_id = ? AND opportunity_id = ?',
      [studentId, opportunityId]
    );

    if (existing) {
      execute(
        `UPDATE student_opportunity_status SET
           participation_status = ?,
           registration_confirmed_at = COALESCE(?, registration_confirmed_at),
           notes = COALESCE(?, notes),
           updated_at = ?
         WHERE id = ?`,
        [status, regConfirmedAt, notes || null, nowIso, existing.id]
      );
    } else {
      execute(
        `INSERT INTO student_opportunity_status (
           id, student_id, opportunity_id, saved, remind_me, participation_status, registration_confirmed_at, notes, updated_at
         ) VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?)`,
        [`sos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, studentId, opportunityId, status, regConfirmedAt, notes || null, nowIso]
      );
    }

    res.json({
      opportunityId,
      participationStatus: status,
      registrationConfirmedAt: regConfirmedAt,
      notes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Student in-app notifications feed.
 */
studentRouter.get('/notifications', requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.userId!;
    const notifs = queryAll<any>(
      `SELECT n.*, o.title as opp_title, o.company as opp_company
       FROM notification_logs n
       LEFT JOIN opportunities o ON n.opportunity_id = o.id
       WHERE n.student_id = ? AND n.channel = 'in_app'
       ORDER BY n.created_at DESC LIMIT 50`,
      [studentId]
    );

    const formatted = notifs.map((n) => {
      const createdDate = new Date(n.created_at);
      const isToday = (Date.now() - createdDate.getTime()) < 86400000;
      return {
        id: n.id,
        title: n.opp_title ? `${n.opp_company}: ${n.opp_title}` : 'Elite Track Notice',
        message: n.message_content,
        timestamp: createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timeBucket: isToday ? 'today' : 'earlier',
        type: n.notification_type === 'new_opportunity' ? 'opportunity' : 'command',
        unread: n.delivery_status !== 'read',
        actionTab: 'opportunities',
      };
    });

    res.json({ notifications: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Student profile & preferences.
 */
studentRouter.get('/me', requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const student = queryOne<StudentRecordDB>('SELECT * FROM students WHERE id = ?', [req.userId!]);
    if (!student) {
      res.status(404).json({ error: 'Student record not found' });
      return;
    }
    res.json({ student });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update student preferences (whatsapp_consent, in_app_notifications).
 */
studentRouter.patch('/preferences', requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = req.userId!;
    const { whatsappConsent, inAppNotifications } = req.body;

    const existing = queryOne<StudentRecordDB>('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!existing) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const waConsent = typeof whatsappConsent === 'boolean' ? (whatsappConsent ? 1 : 0) : existing.whatsapp_consent;
    const inApp = typeof inAppNotifications === 'boolean' ? (inAppNotifications ? 1 : 0) : existing.in_app_notifications;

    execute(
      'UPDATE students SET whatsapp_consent = ?, in_app_notifications = ? WHERE id = ?',
      [waConsent, inApp, studentId]
    );

    res.json({
      message: 'Preferences updated successfully',
      whatsappConsent: Boolean(waConsent),
      inAppNotifications: Boolean(inApp),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
