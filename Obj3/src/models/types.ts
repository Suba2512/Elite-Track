export type OpportunityCategory =
  | 'Hackathon'
  | 'Hiring Challenge'
  | 'Contest'
  | 'Technical Competition';

export type OpportunityType =
  | 'Company Sponsored'
  | 'Company Organized'
  | 'Community Organized'
  | 'Competitive Programming';

export type PlatformType =
  | 'Devpost'
  | 'MyCareernet'
  | 'LeetCode'
  | 'CodeChef'
  | 'Codeforces'
  | 'CodeGalatta'
  | 'Manual';

export type ContestRatingType =
  | 'Rated'
  | 'Unrated'
  | 'Rating restricted'
  | 'Unknown';

export type EventStatus =
  | 'Upcoming'
  | 'Registration Open'
  | 'Registration Closed'
  | 'Ongoing'
  | 'Completed'
  | 'Expired'
  | 'Cancelled'
  | 'Needs Verification';

export type VerificationStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';

export type PipelineStage = 'Fetched' | 'Verified' | 'Approved' | 'Rejected';

export type IntegrationStatus =
  | 'Active'
  | 'Temporarily unavailable'
  | 'Configuration required'
  | 'Unsupported';

export type ParticipationStatus =
  | 'Interested'
  | 'Registered'
  | 'Participating'
  | 'Completed'
  | 'Not Participating';

export type NotificationChannel = 'whatsapp' | 'in_app';

export type NotificationType =
  | 'new_opportunity'
  | 'deadline_reminder'
  | 'contest_start'
  | 'event_update'
  | 'cancellation'
  | 'announcement';

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export type ReminderType =
  | 'deadline_24h'
  | 'deadline_6h'
  | 'contest_24h'
  | 'contest_1h';

export interface OpportunitySourceRecord {
  id: string;
  name: string;
  source_type: 'hackathon' | 'contest';
  base_url: string;
  enabled: boolean;
  integration_status: IntegrationStatus;
  last_successful_fetch: string | null;
  last_fetch_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityRecord {
  id: string;
  external_id: string;
  title: string;
  organizer: string;
  company: string;
  sponsors: string[];
  category: OpportunityCategory;
  opportunity_type: OpportunityType;
  platform: PlatformType;
  source_url: string;
  registration_url: string;
  official_event_url?: string;
  source_listing_url?: string;
  edition?: string | null;
  event_status: EventStatus;
  registration_open_date?: string | null;
  is_registration_url_valid: boolean;
  link_verified_at?: string | null;
  description: string;
  eligibility: string;
  prize_or_perk: string;
  event_start: string;
  event_end: string | null;
  registration_deadline: string;
  timezone: string;
  event_mode: 'online' | 'offline' | 'hybrid';
  contest_rating_type: ContestRatingType;
  tags: string[];
  verification_status: VerificationStatus;
  approval_status: PipelineStage;
  duplicate_group_id: string | null;
  is_duplicate_flagged: boolean;
  confidence_score: number;
  discovered_at: string;
  last_verified_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityVerificationRecord {
  id: string;
  opportunity_id: string;
  verification_method: 'automated' | 'ai_assisted' | 'manual';
  verification_status: VerificationStatus;
  evidence: {
    sourceUrl: string;
    sourceName: string;
    checkedAt: string;
    checksPerformed: string[];
    failedChecks: string[];
    evidenceSummary: string;
    isCompanyIdentified: boolean;
    isRegistrationOpen: boolean;
    isExpired: boolean;
  };
  checked_at: string;
  error_details: string | null;
}

export interface OpportunityApprovalRecord {
  id: string;
  opportunity_id: string;
  mentor_id: string;
  action: 'Approved' | 'Rejected' | 'Verified' | 'Reapproval Required';
  previous_status: PipelineStage;
  new_status: PipelineStage;
  reason: string | null;
  approved_at: string;
}

export interface StudentOpportunityStatusRecord {
  id: string;
  student_id: string;
  opportunity_id: string;
  saved: boolean;
  remind_me: boolean;
  participation_status: ParticipationStatus;
  registration_confirmed_at: string | null;
  notes: string | null;
  updated_at: string;
}

export interface NotificationLogRecord {
  id: string;
  opportunity_id: string | null;
  student_id: string;
  channel: NotificationChannel;
  notification_type: NotificationType;
  message_content: string;
  delivery_status: DeliveryStatus;
  provider_message_id: string | null;
  failure_reason: string | null;
  idempotency_key: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface DiscoveryRunRecord {
  id: string;
  source_id: string;
  status: 'running' | 'success' | 'partial' | 'failed';
  started_at: string;
  completed_at: string | null;
  events_found: number;
  events_created: number;
  events_updated: number;
  errors: string | null;
}

export interface OpportunityReminderRecord {
  id: string;
  student_id: string;
  opportunity_id: string;
  reminder_type: ReminderType;
  scheduled_at: string;
  status: 'pending' | 'sent' | 'cancelled';
  sent_at: string | null;
  created_at: string;
}

export interface StudentRecordDB {
  id: string;
  name: string;
  roll_no: string;
  department: string;
  email: string;
  avatar_url: string;
  whatsapp_number: string;
  whatsapp_consent: boolean;
  in_app_notifications: boolean;
  active_status: string;
  created_at: string;
}

export interface MentorRecordDB {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string;
}

// Normalized event object returned by all source adapters
export interface NormalizedDiscoveredEvent {
  externalId: string;
  title: string;
  organizer: string;
  company: string;
  sponsors: string[];
  category: OpportunityCategory;
  opportunityType: OpportunityType;
  platform: PlatformType;
  sourceUrl: string;
  registrationUrl: string;
  officialEventUrl?: string;
  sourceListingUrl?: string;
  edition?: string;
  eventStatus?: EventStatus;
  registrationOpenDate?: string | null;
  isRegistrationUrlValid?: boolean;
  linkVerifiedAt?: string | null;
  description: string;
  eligibility: string;
  prizeOrPerk: string;
  eventStart: string; // ISO UTC
  eventEnd: string | null; // ISO UTC
  registrationDeadline: string; // ISO UTC
  timezone: string;
  eventMode: 'online' | 'offline' | 'hybrid';
  contestRatingType: ContestRatingType;
  tags: string[];
  rawData?: Record<string, unknown>;
}
