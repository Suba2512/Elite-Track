-- ============================================================================
-- ELITE TRACK DATABASE SCHEMA (DDL)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Opportunity Sources
CREATE TABLE IF NOT EXISTS opportunity_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('hackathon', 'contest')),
  base_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  integration_status TEXT NOT NULL DEFAULT 'Active' CHECK(integration_status IN ('Active', 'Temporarily unavailable', 'Configuration required', 'Unsupported')),
  last_successful_fetch TEXT,
  last_fetch_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  organizer TEXT NOT NULL,
  company TEXT NOT NULL,
  sponsors TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  category TEXT NOT NULL CHECK(category IN ('Hackathon', 'Hiring Challenge', 'Contest', 'Technical Competition')),
  opportunity_type TEXT NOT NULL CHECK(opportunity_type IN ('Company Sponsored', 'Company Organized', 'Community Organized', 'Competitive Programming')),
  platform TEXT NOT NULL CHECK(platform IN ('Devpost', 'MyCareernet', 'LeetCode', 'CodeChef', 'Codeforces', 'CodeGalatta', 'Manual')),
  source_url TEXT NOT NULL,
  registration_url TEXT NOT NULL,
  official_event_url TEXT,
  source_listing_url TEXT,
  edition TEXT,
  event_status TEXT NOT NULL DEFAULT 'Upcoming' CHECK(event_status IN ('Upcoming', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed', 'Expired', 'Cancelled', 'Needs Verification')),
  registration_open_date TEXT,
  is_registration_url_valid INTEGER NOT NULL DEFAULT 1,
  link_verified_at TEXT,
  description TEXT NOT NULL,
  eligibility TEXT NOT NULL,
  prize_or_perk TEXT NOT NULL,
  event_start TEXT NOT NULL,
  event_end TEXT,
  registration_deadline TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  event_mode TEXT NOT NULL DEFAULT 'online' CHECK(event_mode IN ('online', 'offline', 'hybrid')),
  contest_rating_type TEXT NOT NULL DEFAULT 'Unknown' CHECK(contest_rating_type IN ('Rated', 'Unrated', 'Rating restricted', 'Unknown')),
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  verification_status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK(verification_status IN ('VERIFIED', 'NEEDS_REVIEW', 'REJECTED')),
  approval_status TEXT NOT NULL DEFAULT 'Fetched' CHECK(approval_status IN ('Fetched', 'Verified', 'Approved', 'Rejected')),
  duplicate_group_id TEXT,
  is_duplicate_flagged INTEGER NOT NULL DEFAULT 0,
  confidence_score REAL NOT NULL DEFAULT 0.5,
  discovered_at TEXT NOT NULL,
  last_verified_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opp_approval_status ON opportunities(approval_status);
CREATE INDEX IF NOT EXISTS idx_opp_event_status ON opportunities(event_status);
CREATE INDEX IF NOT EXISTS idx_opp_category ON opportunities(category);
CREATE INDEX IF NOT EXISTS idx_opp_platform ON opportunities(platform);
CREATE INDEX IF NOT EXISTS idx_opp_deadline ON opportunities(registration_deadline);
CREATE INDEX IF NOT EXISTS idx_opp_dup_group ON opportunities(duplicate_group_id);
CREATE INDEX IF NOT EXISTS idx_opp_external_id ON opportunities(platform, external_id);

-- 3. Opportunity Sources Map (many-to-one / source provenance)
CREATE TABLE IF NOT EXISTS opportunity_sources_map (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES opportunity_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  raw_data TEXT NOT NULL DEFAULT '{}',
  discovered_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sources_map_opp ON opportunity_sources_map(opportunity_id);

-- 4. Opportunity Verifications
CREATE TABLE IF NOT EXISTS opportunity_verifications (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  verification_method TEXT NOT NULL CHECK(verification_method IN ('automated', 'ai_assisted', 'manual')),
  verification_status TEXT NOT NULL CHECK(verification_status IN ('VERIFIED', 'NEEDS_REVIEW', 'REJECTED')),
  evidence TEXT NOT NULL, -- JSON formatted evidence payload
  checked_at TEXT NOT NULL,
  error_details TEXT
);

CREATE INDEX IF NOT EXISTS idx_verif_opp ON opportunity_verifications(opportunity_id);

-- 5. Opportunity Approvals (Audit Trail)
CREATE TABLE IF NOT EXISTS opportunity_approvals (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  mentor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT,
  approved_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_opp ON opportunity_approvals(opportunity_id);

-- 6. Students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  roll_no TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  whatsapp_consent INTEGER NOT NULL DEFAULT 1,
  in_app_notifications INTEGER NOT NULL DEFAULT 1,
  active_status TEXT NOT NULL DEFAULT 'Active this week',
  created_at TEXT NOT NULL
);

-- 7. Mentors
CREATE TABLE IF NOT EXISTS mentors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Lead Mentor & Head of Placement Prep',
  avatar_url TEXT NOT NULL
);

-- 8. Student Opportunity Status (saved, registered, participating, completed)
CREATE TABLE IF NOT EXISTS student_opportunity_status (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  saved INTEGER NOT NULL DEFAULT 0,
  remind_me INTEGER NOT NULL DEFAULT 0,
  participation_status TEXT NOT NULL DEFAULT 'Interested' CHECK(participation_status IN ('Interested', 'Registered', 'Participating', 'Completed', 'Not Participating')),
  registration_confirmed_at TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_student_opp_status ON student_opportunity_status(student_id, opportunity_id);

-- 9. Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE SET NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK(channel IN ('whatsapp', 'in_app')),
  notification_type TEXT NOT NULL CHECK(notification_type IN ('new_opportunity', 'deadline_reminder', 'contest_start', 'event_update', 'cancellation', 'announcement')),
  message_content TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK(delivery_status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id TEXT,
  failure_reason TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_student ON notification_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_notif_status ON notification_logs(delivery_status);

-- 10. Discovery Runs
CREATE TABLE IF NOT EXISTS discovery_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES opportunity_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('running', 'success', 'partial', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  events_found INTEGER NOT NULL DEFAULT 0,
  events_created INTEGER NOT NULL DEFAULT 0,
  events_updated INTEGER NOT NULL DEFAULT 0,
  errors TEXT
);

-- 11. Opportunity Reminders
CREATE TABLE IF NOT EXISTS opportunity_reminders (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('deadline_24h', 'deadline_6h', 'contest_24h', 'contest_1h')),
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'cancelled')),
  sent_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(student_id, opportunity_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_reminder_pending ON opportunity_reminders(status, scheduled_at);
