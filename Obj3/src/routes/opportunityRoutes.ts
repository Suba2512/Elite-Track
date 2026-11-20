import { Router, Response } from 'express';
import { execute, queryAll, queryOne } from '../db/database.js';
import { AuthenticatedRequest, requireMentor } from '../middleware/authMiddleware.js';
import {
  OpportunityApprovalRecord,
  OpportunityRecord,
  OpportunityVerificationRecord,
} from '../models/types.js';
import { ApprovalService } from '../services/approval/ApprovalService.js';
import { VerificationEngine } from '../services/verification/VerificationEngine.js';

export const opportunityRouter = Router();

/**
 * List opportunities with filters.
 */
opportunityRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stage, category, search } = req.query;
    let sql = 'SELECT * FROM opportunities WHERE 1=1';
    const params: (string | number)[] = [];

    // Students only ever see Approved opportunities
    if (req.userRole !== 'admin') {
      sql += " AND approval_status = 'Approved'";
    } else if (stage && stage !== 'All') {
      sql += ' AND approval_status = ?';
      params.push(stage as string);
    }

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category as string);
    }

    if (search) {
      sql += ' AND (title LIKE ? OR company LIKE ? OR tags LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY created_at DESC';

    const rawOpps = queryAll<any>(sql, params);

    // Parse JSON tags and sponsors
    const opportunities = rawOpps.map((o) => ({
      ...o,
      sponsors: typeof o.sponsors === 'string' ? JSON.parse(o.sponsors) : o.sponsors,
      tags: typeof o.tags === 'string' ? JSON.parse(o.tags) : o.tags,
      is_duplicate_flagged: Boolean(o.is_duplicate_flagged),
      is_registration_url_valid: Boolean(o.is_registration_url_valid),
      edition: o.edition || undefined,
      eventStatus: o.event_status,
      officialEventUrl: o.official_event_url || o.source_url,
      registrationUrl: o.registration_url,
      sourceListingUrl: o.source_listing_url || o.source_url,
      isRegistrationUrlValid: Boolean(o.is_registration_url_valid),
      linkVerifiedAt: o.link_verified_at,
      pipelineStage: o.approval_status,
      deadline: o.registration_deadline,
      saved: false,
      remindMe: false,
    }));

    res.json({ opportunities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get opportunity details by ID with verification evidence & approvals audit history.
 */
opportunityRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const opp = queryOne<any>('SELECT * FROM opportunities WHERE id = ?', [req.params.id]);
    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }

    if (req.userRole !== 'admin' && opp.approval_status !== 'Approved') {
      res.status(403).json({ error: 'Opportunity pending mentor approval' });
      return;
    }

    const verifications = queryAll<OpportunityVerificationRecord>(
      'SELECT * FROM opportunity_verifications WHERE opportunity_id = ? ORDER BY checked_at DESC',
      [opp.id]
    ).map((v) => ({
      ...v,
      evidence: typeof v.evidence === 'string' ? JSON.parse(v.evidence) : v.evidence,
    }));

    const approvals = queryAll<OpportunityApprovalRecord>(
      'SELECT * FROM opportunity_approvals WHERE opportunity_id = ? ORDER BY approved_at DESC',
      [opp.id]
    );

    res.json({
      opportunity: {
        ...opp,
        sponsors: typeof opp.sponsors === 'string' ? JSON.parse(opp.sponsors) : opp.sponsors,
        tags: typeof opp.tags === 'string' ? JSON.parse(opp.tags) : opp.tags,
        is_duplicate_flagged: Boolean(opp.is_duplicate_flagged),
      },
      verifications,
      approvals,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Manual opportunity creation by mentor.
 */
opportunityRouter.post('/', requireMentor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = req.body;
    if (!b.title || !b.company || !b.registrationUrl) {
      res.status(400).json({ error: 'Missing required fields: title, company, registrationUrl' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newId = `opp-manual-${Date.now()}`;

    const normalizedEvent = {
      externalId: newId,
      title: b.title,
      organizer: b.organizer || b.company,
      company: b.company,
      sponsors: Array.isArray(b.sponsors) ? b.sponsors : [b.company],
      category: b.category || 'Hackathon',
      opportunityType: b.opportunityType || 'Company Organized',
      platform: 'Manual' as const,
      sourceUrl: b.registrationUrl,
      registrationUrl: b.registrationUrl,
      description: b.description || `${b.company} opportunity added manually by mentor.`,
      eligibility: b.eligibility || 'College Students',
      prizeOrPerk: b.prizeOrPerk || 'Perks & Recruiter Interview Fast-Track',
      eventStart: b.eventStart || nowIso,
      eventEnd: b.eventEnd || null,
      registrationDeadline: b.deadline || new Date(Date.now() + 14 * 86400000).toISOString(),
      timezone: 'Asia/Kolkata',
      eventMode: b.eventMode || 'online',
      contestRatingType: b.contestRatingType || 'Unknown',
      tags: Array.isArray(b.tags) ? b.tags : [b.company, 'Verified'],
    };

    // Run verification on manual opportunity
    const verif = VerificationEngine.verifyEvent(normalizedEvent);
    const platformToSave = b.platform || (b.category === 'Contest' ? 'Codeforces' : 'Manual');
    const editionToSave = b.edition || null;
    const officialEventUrlToSave = b.officialEventUrl || b.registrationUrl;
    const sourceListingUrlToSave = b.sourceListingUrl || b.officialEventUrl || b.registrationUrl;
    const isUrlValid = verif.isRegistrationUrlValid ? 1 : 0;
    const eventStatusToSave = verif.eventStatus || 'Upcoming';

    execute(
      `INSERT INTO opportunities (
         id, external_id, title, edition, organizer, company, sponsors, category, opportunity_type,
         platform, source_url, registration_url, official_event_url, source_listing_url,
         registration_open_date, is_registration_url_valid, link_verified_at,
         description, eligibility, prize_or_perk,
         event_start, event_end, registration_deadline, timezone, event_mode, contest_rating_type,
         tags, verification_status, approval_status, event_status, duplicate_group_id, is_duplicate_flagged,
         confidence_score, discovered_at, last_verified_at, published_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?, NULL, 0, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        newId,
        normalizedEvent.title,
        editionToSave,
        normalizedEvent.organizer,
        normalizedEvent.company,
        JSON.stringify(normalizedEvent.sponsors),
        normalizedEvent.category,
        normalizedEvent.opportunityType,
        platformToSave,
        normalizedEvent.sourceUrl,
        normalizedEvent.registrationUrl,
        officialEventUrlToSave,
        sourceListingUrlToSave,
        nowIso,
        isUrlValid,
        nowIso,
        normalizedEvent.description,
        normalizedEvent.eligibility,
        normalizedEvent.prizeOrPerk,
        normalizedEvent.eventStart,
        normalizedEvent.eventEnd,
        normalizedEvent.registrationDeadline,
        normalizedEvent.timezone,
        normalizedEvent.eventMode,
        normalizedEvent.contestRatingType,
        JSON.stringify(normalizedEvent.tags),
        verif.status,
        eventStatusToSave,
        verif.confidenceScore,
        nowIso,
        nowIso,
        nowIso, // published immediately when mentor manually adds
        nowIso,
        nowIso,
      ]
    );

    // Record verification evidence
    execute(
      `INSERT INTO opportunity_verifications (id, opportunity_id, verification_method, verification_status, evidence, checked_at)
       VALUES (?, ?, 'manual', ?, ?, ?)`,
      [`verif-${Date.now()}`, newId, verif.status, JSON.stringify(verif.evidence), nowIso]
    );

    // Record approval audit
    execute(
      `INSERT INTO opportunity_approvals (id, opportunity_id, mentor_id, action, previous_status, new_status, reason, approved_at)
       VALUES (?, ?, ?, 'Approve', 'Fetched', 'Approved', 'Manually created and approved by mentor', ?)`,
      [`appr-${Date.now()}`, newId, req.userId || 'mentor-ganesh', nowIso]
    );

    const createdOpp = queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', [newId])!;

    // Distribute to students if approved
    const { NotificationService } = await import('../services/notifications/NotificationService.js');
    const distResult = await NotificationService.distributeApprovedOpportunity(createdOpp);

    res.status(201).json({
      opportunity: createdOpp,
      distribution: distResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Patch / edit opportunity details (with reapproval invalidation).
 */
opportunityRouter.patch('/:id', requireMentor, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = ApprovalService.updateOpportunityDetails(req.params.id, req.body, req.userId);
    res.json({ opportunity: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verify opportunity (Step 1).
 */
opportunityRouter.post('/:id/verify', requireMentor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await ApprovalService.processStageTransition({
      opportunityId: req.params.id,
      mentorId: req.userId,
      action: 'Verify',
      reason: req.body?.reason || 'Verified eligibility and event authenticity',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Approve opportunity & publish to students (Step 2).
 */
opportunityRouter.post('/:id/approve', requireMentor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await ApprovalService.processStageTransition({
      opportunityId: req.params.id,
      mentorId: req.userId,
      action: 'Approve',
      reason: req.body?.reason || 'Mentor approved for batch placement preparation',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Reject opportunity.
 */
opportunityRouter.post('/:id/reject', requireMentor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await ApprovalService.processStageTransition({
      opportunityId: req.params.id,
      mentorId: req.userId,
      action: 'Reject',
      reason: req.body?.reason || 'Not applicable or expired',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
