import { ENV } from '../../config/env.js';
import { execute, queryOne } from '../../db/database.js';
import {
  OpportunityApprovalRecord,
  OpportunityRecord,
  PipelineStage,
} from '../../models/types.js';
import { NotificationService } from '../notifications/NotificationService.js';
import { ReminderScheduler } from '../reminders/ReminderScheduler.js';

export interface ApprovalActionPayload {
  opportunityId: string;
  mentorId?: string;
  action: 'Approve' | 'Reject' | 'Verify' | 'MoveToFetched';
  reason?: string;
}

export class ApprovalService {
  /**
   * Updates an opportunity's pipeline stage and enforces strict audit logging and publication triggers.
   */
  static async processStageTransition(payload: ApprovalActionPayload): Promise<{
    opportunity: OpportunityRecord;
    distributionResult?: any;
  }> {
    const { opportunityId, action, reason } = payload;
    const mentorId = payload.mentorId || ENV.MENTOR_DEFAULT_ID;

    const opp = queryOne<OpportunityRecord>(
      'SELECT * FROM opportunities WHERE id = ?',
      [opportunityId]
    );

    if (!opp) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    const previousStatus = opp.approval_status;
    let nextStatus: PipelineStage = previousStatus;

    if (action === 'Approve') {
      nextStatus = 'Approved';
    } else if (action === 'Reject') {
      nextStatus = 'Rejected';
    } else if (action === 'Verify') {
      nextStatus = 'Verified';
    } else if (action === 'MoveToFetched') {
      nextStatus = 'Fetched';
    }

    const nowIso = new Date().toISOString();
    const publishedAt = nextStatus === 'Approved' ? nowIso : opp.published_at;

    // 1. Update opportunity approval status
    execute(
      `UPDATE opportunities SET
         approval_status = ?,
         published_at = ?,
         updated_at = ?
       WHERE id = ?`,
      [nextStatus, publishedAt, nowIso, opp.id]
    );

    // 2. Record audit log in opportunity_approvals
    const auditId = `appr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    execute(
      `INSERT INTO opportunity_approvals (
         id, opportunity_id, mentor_id, action, previous_status, new_status, reason, approved_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [auditId, opp.id, mentorId, action, previousStatus, nextStatus, reason || null, nowIso]
    );

    const updatedOpp = queryOne<OpportunityRecord>(
      'SELECT * FROM opportunities WHERE id = ?',
      [opp.id]
    )!;

    let distributionResult;

    // 3. IF AND ONLY IF action is 'Approve', trigger distribution to students!
    if (nextStatus === 'Approved' && previousStatus !== 'Approved') {
      console.log(`[ApprovalService] Explicit mentor approval granted for "${opp.title}". Distributing to students...`);
      distributionResult = await NotificationService.distributeApprovedOpportunity(updatedOpp);

      // Schedule reminders for students who bookmark or opt into reminders
      await ReminderScheduler.scheduleDefaultRemindersForOpportunity(updatedOpp);
    }

    return {
      opportunity: updatedOpp,
      distributionResult,
    };
  }

  /**
   * Modifies opportunity details. If the event was previously Approved and critical details change,
   * invalidates the previous approval and resets status to 'Verified', requiring mentor reapproval!
   */
  static updateOpportunityDetails(
    opportunityId: string,
    updates: Partial<OpportunityRecord>,
    mentorId: string = ENV.MENTOR_DEFAULT_ID
  ): OpportunityRecord {
    const existing = queryOne<OpportunityRecord>(
      'SELECT * FROM opportunities WHERE id = ?',
      [opportunityId]
    );

    if (!existing) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    // Critical fields that require reapproval if changed
    const isCriticalFieldChanged =
      (updates.registration_deadline && updates.registration_deadline !== existing.registration_deadline) ||
      (updates.event_start && updates.event_start !== existing.event_start) ||
      (updates.registration_url && updates.registration_url !== existing.registration_url) ||
      (updates.eligibility && updates.eligibility !== existing.eligibility);

    let nextApprovalStatus = existing.approval_status;
    const nowIso = new Date().toISOString();

    if (existing.approval_status === 'Approved' && isCriticalFieldChanged) {
      console.warn(`[ApprovalService] Critical details altered on approved opportunity ${opportunityId}. Invalidating approval and requiring reapproval.`);
      nextApprovalStatus = 'Verified';

      // Log the invalidation in opportunity_approvals
      execute(
        `INSERT INTO opportunity_approvals (
           id, opportunity_id, mentor_id, action, previous_status, new_status, reason, approved_at
         ) VALUES (?, ?, ?, 'Reapproval Required', 'Approved', 'Verified', 'Critical details modified (dates/URL/eligibility)', ?)`,
        [`audit-${Date.now()}`, opportunityId, mentorId, nowIso]
      );
    }

    const title = updates.title ?? existing.title;
    const company = updates.company ?? existing.company;
    const organizer = updates.organizer ?? existing.organizer;
    const category = updates.category ?? existing.category;
    const opportunityType = updates.opportunity_type ?? existing.opportunity_type;
    const platform = updates.platform ?? existing.platform;
    const sourceUrl = updates.source_url ?? existing.source_url;
    const registrationUrl = updates.registration_url ?? existing.registration_url;
    const description = updates.description ?? existing.description;
    const eligibility = updates.eligibility ?? existing.eligibility;
    const prizeOrPerk = updates.prize_or_perk ?? existing.prize_or_perk;
    const eventStart = updates.event_start ?? existing.event_start;
    const eventEnd = updates.event_end ?? existing.event_end;
    const registrationDeadline = updates.registration_deadline ?? existing.registration_deadline;
    const eventMode = updates.event_mode ?? existing.event_mode;
    const contestRatingType = updates.contest_rating_type ?? existing.contest_rating_type;
    const tags = updates.tags ? JSON.stringify(updates.tags) : JSON.stringify(existing.tags);

    execute(
      `UPDATE opportunities SET
         title = ?, company = ?, organizer = ?, category = ?, opportunity_type = ?,
         platform = ?, source_url = ?, registration_url = ?, description = ?, eligibility = ?,
         prize_or_perk = ?, event_start = ?, event_end = ?, registration_deadline = ?,
         event_mode = ?, contest_rating_type = ?, tags = ?, approval_status = ?, updated_at = ?
       WHERE id = ?`,
      [
        title,
        company,
        organizer,
        category,
        opportunityType,
        platform,
        sourceUrl,
        registrationUrl,
        description,
        eligibility,
        prizeOrPerk,
        eventStart,
        eventEnd,
        registrationDeadline,
        eventMode,
        contestRatingType,
        tags,
        nextApprovalStatus,
        nowIso,
        opportunityId,
      ]
    );

    return queryOne<OpportunityRecord>('SELECT * FROM opportunities WHERE id = ?', [opportunityId])!;
  }
}
