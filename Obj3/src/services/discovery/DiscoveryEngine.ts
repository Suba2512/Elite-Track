import { execute, queryAll, queryOne } from '../../db/database.js';
import {
  DiscoveryRunRecord,
  NormalizedDiscoveredEvent,
  OpportunityRecord,
  OpportunitySourceRecord,
  PipelineStage,
} from '../../models/types.js';
import { DuplicateDetector } from '../deduplication/DuplicateDetector.js';
import { VerificationEngine } from '../verification/VerificationEngine.js';
import { CodeChefAdapter } from './CodeChefAdapter.js';
import { CodeforcesAdapter } from './CodeforcesAdapter.js';
import { CodeGalattaAdapter } from './CodeGalattaAdapter.js';
import { DevpostAdapter } from './DevpostAdapter.js';
import { LeetCodeAdapter } from './LeetCodeAdapter.js';
import { MyCareernetAdapter } from './MyCareernetAdapter.js';
import { SourceAdapter, SourceFetchResult } from './SourceAdapter.js';

export interface DiscoveryExecutionSummary {
  runId: string;
  totalFound: number;
  totalCreated: number;
  totalUpdated: number;
  duplicatesFound: number;
  resultsBySource: SourceFetchResult[];
  errors: string[];
  durationMs: number;
}

export class DiscoveryEngine {
  private adapters: Map<string, SourceAdapter> = new Map();

  constructor() {
    this.registerAdapter(new DevpostAdapter());
    this.registerAdapter(new MyCareernetAdapter());
    this.registerAdapter(new CodeforcesAdapter());
    this.registerAdapter(new CodeChefAdapter());
    this.registerAdapter(new LeetCodeAdapter());
    this.registerAdapter(new CodeGalattaAdapter());
  }

  registerAdapter(adapter: SourceAdapter): void {
    this.adapters.set(adapter.sourceId, adapter);
  }

  getAdapter(sourceId: string): SourceAdapter | undefined {
    return this.adapters.get(sourceId);
  }

  getAllAdapters(): SourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Runs discovery across all enabled sources or a specific source.
   */
  async runDiscovery(targetSourceId?: string): Promise<DiscoveryExecutionSummary> {
    const startTime = Date.now();
    const runId = `run-${Date.now()}`;
    const errors: string[] = [];
    const resultsBySource: SourceFetchResult[] = [];

    let totalFound = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let duplicatesFound = 0;

    const sources = queryAll<OpportunitySourceRecord>(
      targetSourceId
        ? 'SELECT * FROM opportunity_sources WHERE id = ?'
        : 'SELECT * FROM opportunity_sources WHERE enabled = 1',
      targetSourceId ? [targetSourceId] : []
    );

    const existingOpportunities = queryAll<OpportunityRecord>('SELECT * FROM opportunities');

    for (const source of sources) {
      const adapter = this.adapters.get(source.id);
      if (!adapter) {
        console.warn(`[DiscoveryEngine] No adapter registered for source: ${source.id}`);
        continue;
      }

      const runDbId = `drun-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      // Record discovery run started
      execute(
        `INSERT INTO discovery_runs (id, source_id, status, started_at, events_found, events_created, events_updated)
         VALUES (?, ?, 'running', ?, 0, 0, 0)`,
        [runDbId, source.id, nowIso]
      );

      let fetchResult: SourceFetchResult;
      try {
        fetchResult = await adapter.fetchEvents();
      } catch (err: any) {
        fetchResult = {
          sourceId: source.id,
          platform: adapter.platform,
          status: 'failed',
          events: [],
          error: err.message || 'Unknown adapter execution error',
          durationMs: 0,
        };
      }

      resultsBySource.push(fetchResult);
      totalFound += fetchResult.events.length;

      let sourceCreated = 0;
      let sourceUpdated = 0;

      for (const event of fetchResult.events) {
        try {
          // 1. Deduplication check
          const dupResult = DuplicateDetector.checkDuplicate(event, existingOpportunities);
          if (dupResult.isDuplicate) {
            duplicatesFound++;
          }

          // 2. Verification check
          const verifResult = VerificationEngine.verifyEvent(event);

          // 3. Check if exact external ID already exists in DB
          const existing = queryOne<OpportunityRecord>(
            'SELECT * FROM opportunities WHERE platform = ? AND external_id = ?',
            [event.platform, event.externalId]
          );

          const eventNow = new Date().toISOString();

          if (existing) {
            // Update existing opportunity metadata without overriding mentor approval or rejection!
            execute(
              `UPDATE opportunities SET
                 title = ?,
                 description = ?,
                 eligibility = ?,
                 prize_or_perk = ?,
                 event_start = ?,
                 event_end = ?,
                 registration_deadline = ?,
                 registration_url = ?,
                 source_url = ?,
                 official_event_url = ?,
                 source_listing_url = ?,
                 edition = ?,
                 event_status = ?,
                 registration_open_date = ?,
                 is_registration_url_valid = ?,
                 link_verified_at = ?,
                 verification_status = ?,
                 confidence_score = ?,
                 tags = ?,
                 last_verified_at = ?,
                 updated_at = ?
               WHERE id = ?`,
              [
                event.title,
                event.description,
                event.eligibility,
                event.prizeOrPerk,
                event.eventStart,
                event.eventEnd,
                event.registrationDeadline,
                event.registrationUrl,
                event.sourceUrl,
                event.officialEventUrl || event.sourceUrl,
                event.sourceListingUrl || event.sourceUrl,
                event.edition || existing.edition || null,
                verifResult.eventStatus,
                event.registrationOpenDate || null,
                verifResult.isRegistrationUrlValid ? 1 : 0,
                verifResult.linkVerifiedAt,
                verifResult.status,
                verifResult.confidenceScore,
                JSON.stringify(event.tags),
                eventNow,
                eventNow,
                existing.id,
              ]
            );

            // Record verification audit
            execute(
              `INSERT INTO opportunity_verifications (id, opportunity_id, verification_method, verification_status, evidence, checked_at, error_details)
               VALUES (?, ?, 'automated', ?, ?, ?, ?)`,
              [
                `verif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                existing.id,
                verifResult.status,
                JSON.stringify(verifResult.evidence),
                eventNow,
                verifResult.errorDetails || null,
              ]
            );

            sourceUpdated++;
            totalUpdated++;
          } else {
            // CRITICAL BUSINESS RULE: Newly discovered opportunities start in 'Fetched' approval_status,
            // EXCEPT verified competitive programming contests (Codeforces, LeetCode, CodeChef, CodeGalatta),
            // which are automatically approved upon verification so the Contest Calendar is instantly updated!
            const isAutoApprovedContest = event.category === 'Contest' && verifResult.status === 'VERIFIED';
            const initialApprovalStatus: PipelineStage = isAutoApprovedContest ? 'Approved' : 'Fetched';
            const publishedAt = isAutoApprovedContest ? eventNow : null;

            const newOppId = `opp-${event.platform.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

            execute(
              `INSERT INTO opportunities (
                 id, external_id, title, organizer, company, sponsors, category, opportunity_type,
                 platform, source_url, registration_url, official_event_url, source_listing_url,
                 edition, event_status, registration_open_date, is_registration_url_valid, link_verified_at,
                 description, eligibility, prize_or_perk, event_start, event_end, registration_deadline,
                 timezone, event_mode, contest_rating_type, tags, verification_status, approval_status,
                 duplicate_group_id, is_duplicate_flagged, confidence_score, discovered_at, last_verified_at,
                 published_at, created_at, updated_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                newOppId,
                event.externalId,
                event.title,
                event.organizer,
                event.company,
                JSON.stringify(event.sponsors),
                event.category,
                event.opportunityType,
                event.platform,
                event.sourceUrl,
                event.registrationUrl,
                event.officialEventUrl || event.sourceUrl,
                event.sourceListingUrl || event.sourceUrl,
                event.edition || null,
                verifResult.eventStatus,
                event.registrationOpenDate || null,
                verifResult.isRegistrationUrlValid ? 1 : 0,
                verifResult.linkVerifiedAt,
                event.description,
                event.eligibility,
                event.prizeOrPerk,
                event.eventStart,
                event.eventEnd,
                event.registrationDeadline,
                event.timezone,
                event.eventMode,
                event.contestRatingType,
                JSON.stringify(event.tags),
                verifResult.status,
                initialApprovalStatus,
                dupResult.duplicateGroupId || null,
                dupResult.isDuplicate ? 1 : 0,
                verifResult.confidenceScore,
                eventNow,
                eventNow,
                publishedAt,
                eventNow,
                eventNow,
              ]
            );

            if (dupResult.isDuplicate && dupResult.matchedOpportunityId) {
              DuplicateDetector.retainStudentAssociations(dupResult.matchedOpportunityId, newOppId);
            }

            // Record verification evidence
            execute(
              `INSERT INTO opportunity_verifications (id, opportunity_id, verification_method, verification_status, evidence, checked_at, error_details)
               VALUES (?, ?, 'automated', ?, ?, ?, ?)`,
              [
                `verif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                newOppId,
                verifResult.status,
                JSON.stringify(verifResult.evidence),
                eventNow,
                verifResult.errorDetails || null,
              ]
            );

            // Record provenance in opportunity_sources_map
            execute(
              `INSERT INTO opportunity_sources_map (id, opportunity_id, source_id, external_id, source_url, raw_data, discovered_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                `map-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                newOppId,
                source.id,
                event.externalId,
                event.sourceUrl,
                JSON.stringify(event.rawData || {}),
                eventNow,
              ]
            );

            sourceCreated++;
            totalCreated++;
          }
        } catch (itemErr: any) {
          console.error(`[DiscoveryEngine] Error processing event ${event.title}:`, itemErr);
          errors.push(`Error processing ${event.title}: ${itemErr.message}`);
        }
      }

      // Update discovery run record and source status
      const completedIso = new Date().toISOString();
      execute(
        `UPDATE discovery_runs SET
           status = ?,
           completed_at = ?,
           events_found = ?,
           events_created = ?,
           events_updated = ?,
           errors = ?
         WHERE id = ?`,
        [
          fetchResult.status,
          completedIso,
          fetchResult.events.length,
          sourceCreated,
          sourceUpdated,
          fetchResult.error || null,
          runDbId,
        ]
      );

      execute(
        `UPDATE opportunity_sources SET
           last_successful_fetch = ?,
           last_fetch_error = ?,
           updated_at = ?
         WHERE id = ?`,
        [
          fetchResult.status === 'success' || fetchResult.status === 'partial' ? completedIso : source.last_successful_fetch,
          fetchResult.error || null,
          completedIso,
          source.id,
        ]
      );
    }

    return {
      runId,
      totalFound,
      totalCreated,
      totalUpdated,
      duplicatesFound,
      resultsBySource,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Returns comprehensive statistics for the mentor observability dashboard.
   */
  static getObservabilityStats() {
    const totalDiscovered = queryOne<{ count: number }>('SELECT count(*) as count FROM opportunities')?.count || 0;
    const verified = queryOne<{ count: number }>("SELECT count(*) as count FROM opportunities WHERE verification_status = 'VERIFIED'")?.count || 0;
    const pendingApproval = queryOne<{ count: number }>("SELECT count(*) as count FROM opportunities WHERE approval_status IN ('Fetched', 'Verified')")?.count || 0;
    const approved = queryOne<{ count: number }>("SELECT count(*) as count FROM opportunities WHERE approval_status = 'Approved'")?.count || 0;
    const rejected = queryOne<{ count: number }>("SELECT count(*) as count FROM opportunities WHERE approval_status = 'Rejected'")?.count || 0;

    const upcomingCompanyHackathons = queryOne<{ count: number }>(
      "SELECT count(*) as count FROM opportunities WHERE category IN ('Hackathon', 'Hiring Challenge') AND registration_deadline > datetime('now')"
    )?.count || 0;

    const upcomingRatedContests = queryOne<{ count: number }>(
      "SELECT count(*) as count FROM opportunities WHERE category = 'Contest' AND contest_rating_type = 'Rated' AND registration_deadline > datetime('now')"
    )?.count || 0;

    const expired = queryOne<{ count: number }>(
      "SELECT count(*) as count FROM opportunities WHERE registration_deadline < datetime('now')"
    )?.count || 0;

    const whatsappQueued = queryOne<{ count: number }>(
      "SELECT count(*) as count FROM notification_logs WHERE channel = 'whatsapp' AND delivery_status = 'queued'"
    )?.count || 0;

    const whatsappDelivered = queryOne<{ count: number }>(
      "SELECT count(*) as count FROM notification_logs WHERE channel = 'whatsapp' AND delivery_status IN ('delivered', 'read')"
    )?.count || 0;

    const whatsappFailed = queryOne<{ count: number }>(
      "SELECT count(*) as count FROM notification_logs WHERE channel = 'whatsapp' AND delivery_status = 'failed'"
    )?.count || 0;

    const lastRun = queryOne<DiscoveryRunRecord>(
      'SELECT * FROM discovery_runs ORDER BY started_at DESC LIMIT 1'
    );

    const rawSources = queryAll<OpportunitySourceRecord>('SELECT * FROM opportunity_sources ORDER BY name ASC');

    const FETCHING_METHODS: Record<string, string> = {
      'src-devpost': 'Permitted Public Listing Extraction & RSS / JSON endpoints',
      'src-mycareernet': 'Public Contests Listing Inspection & Corporate Challenge Extraction',
      'src-codeforces': 'Official Codeforces API (https://codeforces.com/api/contest.list)',
      'src-codechef': 'Official Public Contests Page Extraction & Starters Feeds',
      'src-leetcode': 'Official Public Contest Feed Extraction & Mentor Manual Fallback',
      'src-codegalatta': 'Public Collegiate Challenge Listings & Mentor Manual Fallback',
    };

    const SOURCE_PLATFORMS: Record<string, string> = {
      'src-devpost': 'Devpost',
      'src-mycareernet': 'MyCareernet',
      'src-codeforces': 'Codeforces',
      'src-codechef': 'CodeChef',
      'src-leetcode': 'LeetCode',
      'src-codegalatta': 'CodeGalatta',
    };

    const sources = rawSources.map((s) => {
      const srcLastRun = queryOne<DiscoveryRunRecord>(
        'SELECT * FROM discovery_runs WHERE source_id = ? ORDER BY started_at DESC LIMIT 1',
        [s.id]
      );
      const platform = SOURCE_PLATFORMS[s.id] || s.name;
      const stats = queryOne<{
        verified: number;
        expired: number;
        duplicates: number;
        invalid_links: number;
        needs_review: number;
        total: number;
      }>(
        `SELECT 
           SUM(CASE WHEN verification_status = 'VERIFIED' THEN 1 ELSE 0 END) as verified,
           SUM(CASE WHEN event_status = 'Expired' OR registration_deadline < datetime('now') THEN 1 ELSE 0 END) as expired,
           SUM(CASE WHEN is_duplicate_flagged = 1 THEN 1 ELSE 0 END) as duplicates,
           SUM(CASE WHEN is_registration_url_valid = 0 THEN 1 ELSE 0 END) as invalid_links,
           SUM(CASE WHEN verification_status = 'NEEDS_REVIEW' OR event_status = 'Needs Verification' THEN 1 ELSE 0 END) as needs_review,
           count(*) as total
         FROM opportunities WHERE platform = ?`,
        [platform]
      ) || { verified: 0, expired: 0, duplicates: 0, invalid_links: 0, needs_review: 0, total: 0 };

      return {
        id: s.id,
        name: s.name,
        platform,
        source_type: s.source_type,
        base_url: s.base_url,
        fetching_method: FETCHING_METHODS[s.id] || 'Automated Public Adapter Extraction',
        integration_status: s.integration_status,
        last_fetch_attempt: srcLastRun?.started_at || null,
        last_successful_fetch: s.last_successful_fetch,
        records_fetched: stats.total || srcLastRun?.events_found || 0,
        verified_records: stats.verified || 0,
        expired_records: stats.expired || 0,
        duplicate_records: stats.duplicates || 0,
        invalid_links: stats.invalid_links || 0,
        manual_verification_required: stats.needs_review || 0,
        last_error_message: s.last_fetch_error,
        is_operational: Boolean(s.last_successful_fetch && s.integration_status === 'Active'),
      };
    });

    return {
      totalDiscovered,
      verified,
      pendingApproval,
      approved,
      rejected,
      upcomingCompanyHackathons,
      upcomingRatedContests,
      expired,
      whatsappQueued,
      whatsappDelivered,
      whatsappFailed,
      lastDiscoveryExecution: lastRun?.completed_at || lastRun?.started_at || null,
      lastRunStatus: lastRun?.status || 'none',
      sources,
    };
  }
}
