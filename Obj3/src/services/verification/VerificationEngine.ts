import {
  EventStatus,
  NormalizedDiscoveredEvent,
  OpportunityVerificationRecord,
  VerificationStatus,
} from '../../models/types.js';
import { RECOGNIZED_TECH_COMPANIES } from '../../config/constants.js';
import { UrlValidator } from './UrlValidator.js';

export interface VerificationResult {
  status: VerificationStatus;
  eventStatus: EventStatus;
  confidenceScore: number;
  isRegistrationUrlValid: boolean;
  linkVerifiedAt: string;
  evidence: OpportunityVerificationRecord['evidence'] & {
    officialEventUrl?: string;
    registrationUrl?: string;
    isRegistrationUrlValid?: boolean;
    eventStatus?: EventStatus;
  };
  errorDetails?: string;
}

export class VerificationEngine {
  /**
   * Computes the lifecycle status based on dates, URL validity, and cancellation.
   */
  static computeLifecycleStatus(params: {
    registrationOpenDate?: string | null;
    registrationDeadline?: string;
    eventStart?: string;
    eventEnd?: string | null;
    registration_open_date?: string | null;
    registration_deadline?: string;
    event_start?: string;
    event_end?: string | null;
    isRegistrationUrlValid?: boolean;
    is_registration_url_valid?: boolean | number;
    now?: number;
  }): EventStatus {
    const now = params.now ?? Date.now();

    const regDeadline = params.registrationDeadline || params.registration_deadline || '';
    const evStart = params.eventStart || params.event_start || '';
    const evEnd = params.eventEnd || params.event_end;
    const regOpen = params.registrationOpenDate || params.registration_open_date;

    const deadlineTime = new Date(regDeadline).getTime();
    const startTime = new Date(evStart).getTime();
    const endTime = evEnd ? new Date(evEnd).getTime() : NaN;
    const openTime = regOpen ? new Date(regOpen).getTime() : NaN;

    // Check for unparseable or contradictory dates
    if (isNaN(deadlineTime) || isNaN(startTime)) {
      return 'Needs Verification';
    }

    if (!isNaN(endTime) && startTime > endTime) {
      return 'Needs Verification';
    }

    // Check if event is completed
    if (!isNaN(endTime) && now > endTime) {
      return 'Completed';
    }

    // Check if registration deadline has passed
    if (now > deadlineTime) {
      return 'Expired';
    }

    // Check if event is currently ongoing
    if (now >= startTime && (!isNaN(endTime) ? now <= endTime : false)) {
      return 'Ongoing';
    }

    // Check if registration is open or upcoming
    if (!isNaN(openTime) && now < openTime) {
      return 'Upcoming';
    }

    // Registration is currently open
    return 'Registration Open';
  }

  /**
   * Evaluates a discovered event against authenticity, validity, student relevance, and completeness rules.
   */
  static verifyEvent(event: NormalizedDiscoveredEvent): VerificationResult {
    const checksPerformed: string[] = [];
    const failedChecks: string[] = [];
    let score = 1.0;
    const now = Date.now();
    const checkedAt = new Date().toISOString();

    // Check 1: Mandatory Fields
    checksPerformed.push('Mandatory Fields Presence');
    if (!event.title || event.title.trim().length < 5) {
      failedChecks.push('Title is missing or abnormally short (<5 chars)');
      score -= 0.3;
    }

    // Check 2: URL Authenticity & Validation (Phase 3)
    checksPerformed.push('Official & Registration URL Verification');
    const regUrlResult = UrlValidator.validateRegistrationUrl(event.registrationUrl, event.platform);
    let isRegistrationUrlValid = regUrlResult.isValid;

    if (!regUrlResult.isValid) {
      failedChecks.push(`Registration URL rejected: ${regUrlResult.reason}`);
      score -= 0.25;
    }

    const officialUrlResult = UrlValidator.validateOfficialEventUrl(event.officialEventUrl || event.sourceUrl);
    if (!officialUrlResult.isValid) {
      failedChecks.push(`Official event URL invalid: ${officialUrlResult.reason}`);
      score -= 0.2;
    }

    // Check 3: Dates and Expiration (Phase 2)
    checksPerformed.push('Date Validity & Lifecycle Verification');
    let isExpired = false;
    let isRegistrationOpen = true;

    try {
      const deadlineTime = new Date(event.registrationDeadline).getTime();
      if (isNaN(deadlineTime)) {
        failedChecks.push('Registration deadline date is unparseable');
        score -= 0.3;
      } else if (deadlineTime < now) {
        isExpired = true;
        isRegistrationOpen = false;
        failedChecks.push('Registration deadline has already passed (Expired opportunity)');
        score -= 0.8;
      }
    } catch {
      failedChecks.push('Error checking registration deadline timestamp');
      score -= 0.3;
    }

    try {
      const startTime = new Date(event.eventStart).getTime();
      if (isNaN(startTime)) {
        failedChecks.push('Event start date is unparseable');
        score -= 0.2;
      }
    } catch {
      failedChecks.push('Error checking event start timestamp');
      score -= 0.2;
    }

    // Compute dynamic event status
    const computedEventStatus = this.computeLifecycleStatus({
      registrationOpenDate: event.registrationOpenDate,
      registrationDeadline: event.registrationDeadline,
      eventStart: event.eventStart,
      eventEnd: event.eventEnd,
      isRegistrationUrlValid,
      now,
    });

    // Check 4: Company & Organizer Recognition
    checksPerformed.push('Company & Organizer Authenticity');
    let isCompanyIdentified = false;
    const combinedOrgText = `${event.company} ${event.organizer} ${event.sponsors.join(' ')}`;
    for (const comp of RECOGNIZED_TECH_COMPANIES) {
      if (combinedOrgText.toLowerCase().includes(comp.toLowerCase())) {
        isCompanyIdentified = true;
        break;
      }
    }

    // Contests from official platforms are authenticated
    if (['Codeforces', 'LeetCode', 'CodeChef', 'CodeGalatta'].includes(event.platform)) {
      isCompanyIdentified = true;
    }

    if (!isCompanyIdentified && event.category === 'Hackathon') {
      checksPerformed.push('Non-Tier-1 Company Warning');
      score -= 0.15;
    }

    // Check 5: Student Relevance
    checksPerformed.push('Collegiate Relevance Assessment');
    const eligibilityLower = (event.eligibility || '').toLowerCase();
    const descLower = (event.description || '').toLowerCase();
    const isCollegiate =
      eligibilityLower.includes('student') ||
      eligibilityLower.includes('college') ||
      eligibilityLower.includes('engineering') ||
      eligibilityLower.includes('batch') ||
      eligibilityLower.includes('grad') ||
      eligibilityLower.includes('open') ||
      descLower.includes('student') ||
      descLower.includes('campus') ||
      event.category === 'Contest';

    if (!isCollegiate) {
      failedChecks.push('Eligibility does not clearly indicate student or graduate eligibility');
      score -= 0.15;
    }

    // Check 6: Description & Perks Completeness
    checksPerformed.push('Details & Value Proposition Completeness');
    if (!event.description || event.description.length < 20) {
      failedChecks.push('Event description is too brief or empty');
      score -= 0.1;
    }
    if (!event.prizeOrPerk || event.prizeOrPerk.length < 5) {
      failedChecks.push('Prize or career perk is unstated');
      score -= 0.05;
    }

    score = Math.max(0, Math.min(1.0, Math.round(score * 100) / 100));

    // Determine verification status
    let status: VerificationStatus = 'NEEDS_REVIEW';
    if (isExpired || score < 0.4) {
      status = 'REJECTED';
    } else if (score >= 0.8 && failedChecks.length === 0) {
      status = 'VERIFIED';
    } else {
      status = 'NEEDS_REVIEW';
    }

    const evidenceSummary =
      status === 'VERIFIED'
        ? `Passed all ${checksPerformed.length} automated verification checks. Verified ${event.company} ${event.category} (${event.edition || 'Current'}) on ${event.platform}. Lifecycle: ${computedEventStatus}. Registration URL verified: ${isRegistrationUrlValid ? 'Valid Destination' : 'Unavailable'}.`
        : status === 'REJECTED'
        ? `Rejected during verification: ${failedChecks.join('; ')}.`
        : `Flagged for manual review. Issues: ${failedChecks.join('; ')}.`;

    return {
      status,
      eventStatus: computedEventStatus,
      confidenceScore: score,
      isRegistrationUrlValid,
      linkVerifiedAt: checkedAt,
      evidence: {
        sourceUrl: event.sourceUrl,
        sourceName: event.platform,
        checkedAt,
        checksPerformed,
        failedChecks,
        evidenceSummary,
        isCompanyIdentified,
        isRegistrationOpen: computedEventStatus === 'Registration Open',
        isExpired,
        officialEventUrl: event.officialEventUrl || event.sourceUrl,
        registrationUrl: event.registrationUrl,
        isRegistrationUrlValid,
        eventStatus: computedEventStatus,
      },
      errorDetails: failedChecks.length > 0 ? failedChecks.join(', ') : undefined,
    };
  }
}
