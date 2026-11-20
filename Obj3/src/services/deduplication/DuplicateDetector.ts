import { execute, queryAll, queryOne } from '../../db/database.js';
import { NormalizedDiscoveredEvent, OpportunityRecord } from '../../models/types.js';

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  matchedOpportunityId?: string;
  matchedTitle?: string;
  duplicateGroupId?: string;
  similarityScore: number;
  matchReason?: string;
}

export class DuplicateDetector {
  /**
   * Normalizes a URL by stripping tracking parameters, query strings, fragments, www, and trailing slashes.
   */
  static normalizeUrl(rawUrl: string | undefined | null): string {
    if (!rawUrl) return '';
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
      const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase();
      return `${host}${pathname}`;
    } catch {
      return (rawUrl || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    }
  }

  /**
   * Tokenizes text into lowercase word tokens, removing non-alphanumeric punctuation.
   */
  static tokenize(text: string): Set<string> {
    const cleaned = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter((t) => t.length > 2);
    return new Set(tokens);
  }

  /**
   * Calculates Jaccard similarity index between two string token sets.
   */
  static calculateJaccardSimilarity(textA: string, textB: string): number {
    const tokensA = this.tokenize(textA);
    const tokensB = this.tokenize(textB);
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersectionCount = 0;
    tokensA.forEach((token) => {
      if (tokensB.has(token)) {
        intersectionCount++;
      }
    });

    const unionCount = new Set([...tokensA, ...tokensB]).size;
    return unionCount > 0 ? intersectionCount / unionCount : 0;
  }

  /**
   * Checks if an existing opportunity and a new candidate discovered event are duplicates.
   */
  static areDuplicates(existing: OpportunityRecord, candidate: NormalizedDiscoveredEvent): boolean {
    const res = this.checkDuplicate(candidate, [existing]);
    return res.isDuplicate;
  }

  /**
   * Checks if a new discovered event is a duplicate of any existing opportunities.
   * Considers: canonical URLs, edition/year, normalized name, company, and date proximity.
   */
  static checkDuplicate(
    newEvent: NormalizedDiscoveredEvent,
    existingOpportunities: OpportunityRecord[]
  ): DuplicateMatchResult {
    const newNormSourceUrl = this.normalizeUrl(newEvent.officialEventUrl || newEvent.sourceUrl);
    const newNormRegUrl = this.normalizeUrl(newEvent.registrationUrl);

    for (const opp of existingOpportunities) {
      // 1. Exact canonical URL match
      const oppNormSourceUrl = this.normalizeUrl(opp.official_event_url || opp.source_url);
      const oppNormRegUrl = this.normalizeUrl(opp.registration_url);

      if (
        (newNormRegUrl && (newNormRegUrl === oppNormRegUrl || newNormRegUrl === oppNormSourceUrl)) ||
        (newNormSourceUrl && (newNormSourceUrl === oppNormSourceUrl || newNormSourceUrl === oppNormRegUrl))
      ) {
        return {
          isDuplicate: true,
          matchedOpportunityId: opp.id,
          matchedTitle: opp.title,
          duplicateGroupId: opp.duplicate_group_id || `dup-${opp.id}`,
          similarityScore: 1.0,
          matchReason: 'Exact canonical registration/source URL match',
        };
      }

      // Check edition compatibility: if both specify an edition, and editions differ (e.g. 7.0 vs 8.0), they are different events!
      const newEdition = (newEvent.edition || '').trim().toLowerCase();
      const oppEdition = (opp.edition || '').trim().toLowerCase();
      if (newEdition && oppEdition && newEdition !== oppEdition) {
        continue;
      }

      // 2. High title similarity + same company/organizer
      const titleSimilarity = this.calculateJaccardSimilarity(newEvent.title, opp.title);
      const isSameCompany =
        newEvent.company.toLowerCase() === opp.company.toLowerCase() ||
        newEvent.organizer.toLowerCase() === opp.organizer.toLowerCase();

      // Check date proximity (within 48 hours)
      let isDateProximate = false;
      try {
        const timeDiff = Math.abs(
          new Date(newEvent.registrationDeadline).getTime() - new Date(opp.registration_deadline).getTime()
        );
        isDateProximate = timeDiff < 48 * 3600 * 1000;
      } catch {
        isDateProximate = false;
      }

      if (isSameCompany && titleSimilarity >= 0.55 && isDateProximate) {
        return {
          isDuplicate: true,
          matchedOpportunityId: opp.id,
          matchedTitle: opp.title,
          duplicateGroupId: opp.duplicate_group_id || `dup-${opp.id}`,
          similarityScore: Math.round(titleSimilarity * 100) / 100,
          matchReason: `High title similarity (${Math.round(titleSimilarity * 100)}%) with identical company and matching dates`,
        };
      }

      // 3. Very high title similarity (>= 0.80) even across different platforms
      if (titleSimilarity >= 0.8) {
        return {
          isDuplicate: true,
          matchedOpportunityId: opp.id,
          matchedTitle: opp.title,
          duplicateGroupId: opp.duplicate_group_id || `dup-${opp.id}`,
          similarityScore: Math.round(titleSimilarity * 100) / 100,
          matchReason: `Very high cross-platform title similarity (${Math.round(titleSimilarity * 100)}%)`,
        };
      }
    }

    return {
      isDuplicate: false,
      similarityScore: 0,
    };
  }

  /**
   * Retains student associations (bookmarks, registrations, reminders) when merging or updating duplicates.
   */
  static retainStudentAssociations(primaryOppId: string, duplicateOppId: string): void {
    try {
      // Transfer student opportunity statuses
      const dupStatuses = queryAll<{
        id: string;
        student_id: string;
        saved: number;
        remind_me: number;
        participation_status: string;
      }>('SELECT * FROM student_opportunity_status WHERE opportunity_id = ?', [duplicateOppId]);

      for (const st of dupStatuses) {
        const existingPrimary = queryOne<{
          id: string;
          saved: number;
          remind_me: number;
          participation_status: string;
        }>('SELECT * FROM student_opportunity_status WHERE opportunity_id = ? AND student_id = ?', [
          primaryOppId,
          st.student_id,
        ]);

        if (existingPrimary) {
          // Merge flags
          const mergedSaved = existingPrimary.saved || st.saved ? 1 : 0;
          const mergedRemind = existingPrimary.remind_me || st.remind_me ? 1 : 0;
          const mergedStatus =
            existingPrimary.participation_status !== 'Interested'
              ? existingPrimary.participation_status
              : st.participation_status;

          execute(
            'UPDATE student_opportunity_status SET saved = ?, remind_me = ?, participation_status = ?, updated_at = ? WHERE id = ?',
            [mergedSaved, mergedRemind, mergedStatus, new Date().toISOString(), existingPrimary.id]
          );
        } else {
          execute(
            'UPDATE student_opportunity_status SET opportunity_id = ?, updated_at = ? WHERE id = ?',
            [primaryOppId, new Date().toISOString(), st.id]
          );
        }
      }

      // Transfer reminders
      execute('UPDATE opportunity_reminders SET opportunity_id = ? WHERE opportunity_id = ?', [
        primaryOppId,
        duplicateOppId,
      ]);
    } catch (err) {
      console.warn('[DuplicateDetector] Error retaining student associations:', err);
    }
  }
}
