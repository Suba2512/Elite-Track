-- ====================================================================
-- ELITE TRACK — COMPLETE SUPABASE DATABASE SCHEMA (v3.3)
-- Placement-Preparation Tracking Ecosystem for 17 Students & 12 Faculty
-- ====================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'faculty', 'super_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE platform_type AS ENUM ('leetcode', 'codeforces', 'codechef', 'github', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE verification_badge AS ENUM ('auto_verified', 'self_reported', 'pending_verification', 'data_unavailable', 'sync_error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE submission_verdict AS ENUM ('accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compilation_error', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sync_job_status AS ENUM ('queued', 'in_progress', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE command_status AS ENUM ('not_started', 'in_progress', 'submitted_for_review', 'needs_revision', 'done');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE opportunity_category AS ENUM ('contest', 'hackathon', 'hiring_challenge', 'workshop');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE opportunity_status AS ENUM ('pending_verification', 'approved', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE participation_status AS ENUM ('registered', 'participated', 'shortlisted', 'winner', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE activity_state AS ENUM ('active', 'inactive', 'unverified', 'sync_pending', 'in_progress');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE leaderboard_type AS ENUM ('overall', 'leetcode', 'codeforces', 'codechef', 'github', 'weekly', 'monthly', 'streak');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABLE DEFINITIONS (EXACTLY 23 TABLES)

-- TABLE 1: APPROVED USERS (ALLOWLIST)
CREATE TABLE IF NOT EXISTS public.approved_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    full_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 2: PROFILES (Extends auth.users, gated by approved_users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    roll_no TEXT UNIQUE,
    department TEXT,
    academic_year TEXT,
    career_objective TEXT,
    phone_number TEXT,
    whatsapp_opt_in BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 3: CODING PROFILES (Per student per platform with partial unique indexes)
CREATE TABLE IF NOT EXISTS public.coding_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    custom_platform_name TEXT,
    handle_or_url TEXT NOT NULL,
    total_solved NUMERIC NULL,
    easy_solved NUMERIC NULL,
    medium_solved NUMERIC NULL,
    hard_solved NUMERIC NULL,
    rating NUMERIC NULL,
    global_rank NUMERIC NULL,
    repos_count NUMERIC NULL,
    contributions_count NUMERIC NULL,
    verification_status verification_badge NOT NULL DEFAULT 'pending_verification',
    last_attempted_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    sync_error_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_coding_profiles_standard 
ON public.coding_profiles(student_id, platform) 
WHERE platform != 'other';

CREATE UNIQUE INDEX IF NOT EXISTS uq_coding_profiles_custom 
ON public.coding_profiles(student_id, LOWER(custom_platform_name)) 
WHERE platform = 'other';

-- TABLE 4: PLATFORM COVERAGE WINDOWS (Multi-segment historical tracking)
CREATE TABLE IF NOT EXISTS public.platform_coverage_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    segment_start_date DATE NOT NULL,
    segment_end_date DATE NOT NULL,
    is_complete BOOLEAN DEFAULT FALSE,
    last_synced_cursor TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coverage_lookup ON public.platform_coverage_windows(student_id, platform, segment_start_date, segment_end_date);

-- TABLE 5: CODING SUBMISSIONS (Normalized single UTC timestamp + stored IST date)
CREATE TABLE IF NOT EXISTS public.coding_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    external_submission_id TEXT NOT NULL,
    external_problem_id TEXT NOT NULL,
    problem_title TEXT NOT NULL,
    problem_url TEXT,
    difficulty TEXT,
    verdict submission_verdict NOT NULL,
    points_awarded INTEGER DEFAULT 0,
    is_first_accepted BOOLEAN DEFAULT TRUE,
    solved_at TIMESTAMPTZ NOT NULL,
    activity_date DATE GENERATED ALWAYS AS ((solved_at AT TIME ZONE 'Asia/Kolkata')::DATE) STORED,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, platform, external_submission_id)
);
CREATE INDEX IF NOT EXISTS idx_coding_sub_student_date ON public.coding_submissions(student_id, activity_date);

-- TABLE 6: PROBLEM EQUIVALENCES (Normalized cross-platform deduplication)
CREATE TABLE IF NOT EXISTS public.problem_equivalences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_problem_id TEXT NOT NULL,
    canonical_title TEXT NOT NULL,
    platform_a platform_type NOT NULL,
    problem_id_a TEXT NOT NULL,
    platform_b platform_type NOT NULL,
    problem_id_b TEXT NOT NULL,
    verification_status verification_badge NOT NULL DEFAULT 'auto_verified',
    verified_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_canonical_order CHECK (
        (platform_a < platform_b) OR (platform_a = platform_b AND problem_id_a < problem_id_b)
    ),
    UNIQUE(platform_a, problem_id_a, platform_b, problem_id_b)
);

-- TABLE 7: DAILY ACTIVITY (Combined IST Heatmap with composite unique key)
CREATE TABLE IF NOT EXISTS public.daily_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL, -- Asia/Kolkata date
    unique_problems_solved INTEGER DEFAULT 0,
    platforms_involved platform_type[] DEFAULT '{}',
    activity_state activity_state NOT NULL DEFAULT 'unverified',
    last_reconciled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, activity_date)
);

-- TABLE 8: STUDENT STREAKS
CREATE TABLE IF NOT EXISTS public.student_streaks (
    student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 9: PLATFORM SYNC JOBS
CREATE TABLE IF NOT EXISTS public.platform_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform platform_type NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL DEFAULT 'incremental',
    status sync_job_status NOT NULL DEFAULT 'queued',
    cursor_position TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    records_synced INTEGER DEFAULT 0,
    error_details TEXT
);

-- TABLE 10: PLATFORM SYNC LOGS
CREATE TABLE IF NOT EXISTS public.platform_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.platform_sync_jobs(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 11: METRIC SNAPSHOTS (Time series history with nullable values)
CREATE TABLE IF NOT EXISTS public.metric_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    metric_key TEXT NOT NULL,
    metric_definition TEXT NOT NULL,
    metric_value NUMERIC NULL,
    source TEXT NOT NULL,
    verification_status verification_badge NOT NULL,
    error_status TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 12: LEADERBOARD SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_type leaderboard_type NOT NULL,
    time_window TEXT NOT NULL,
    scoring_formula TEXT NOT NULL,
    rankings JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 13: COMMANDS
CREATE TABLE IF NOT EXISTS public.commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id),
    target_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'individual', 'selected'
    due_date TIMESTAMPTZ NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 14: COMMAND ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.command_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID NOT NULL REFERENCES public.commands(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status command_status NOT NULL DEFAULT 'not_started',
    student_comment TEXT,
    submission_urls JSONB DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMPTZ,
    faculty_feedback TEXT,
    grade_or_rating TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(command_id, student_id)
);

-- TABLE 15: COMMAND COMMENTS (Threaded discussion per assignment)
CREATE TABLE IF NOT EXISTS public.command_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.command_assignments(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.command_comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 16: OPPORTUNITIES
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company_or_organizer TEXT NOT NULL,
    company_logo_url TEXT,
    description TEXT NOT NULL,
    category opportunity_category NOT NULL,
    eligibility TEXT,
    registration_url TEXT NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    registration_deadline TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    status opportunity_status NOT NULL DEFAULT 'pending_verification',
    duplicate_of_id UUID REFERENCES public.opportunities(id),
    created_by UUID REFERENCES public.profiles(id),
    verified_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 17: SAVED OPPORTUNITIES (Student bookmarks & reminders)
CREATE TABLE IF NOT EXISTS public.saved_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    remind_me BOOLEAN DEFAULT TRUE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, opportunity_id)
);

-- TABLE 18: OPPORTUNITY & CONTEST PARTICIPATIONS
CREATE TABLE IF NOT EXISTS public.opportunity_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    custom_contest_name TEXT,
    participation_type opportunity_category NOT NULL,
    status participation_status NOT NULL DEFAULT 'registered',
    rank_or_score TEXT,
    proof_urls JSONB DEFAULT '[]'::jsonb,
    certificate_url TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 19: ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all',
    channel TEXT NOT NULL DEFAULT 'in_app',
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 20: REPORT EXPORTS (Audit history of generated Excel sheets)
CREATE TABLE IF NOT EXISTS public.report_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exported_by UUID NOT NULL REFERENCES public.profiles(id),
    report_type TEXT NOT NULL,
    target_student_id UUID REFERENCES public.profiles(id),
    filter_criteria JSONB DEFAULT '{}'::jsonb,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 21: NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    channel TEXT DEFAULT 'in_app',
    whatsapp_status TEXT DEFAULT 'not_applicable',
    whatsapp_message_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 22: STUDENT ACTIVITY LOGS (Immutable audit log of student actions)
CREATE TABLE IF NOT EXISTS public.student_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 23: SUPER ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.super_admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SECURITY DEFINER HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_faculty_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('faculty', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. DATABASE PROTECTION TRIGGERS

-- Trigger 1: Protect student profile from role elevation & email mutation
CREATE OR REPLACE FUNCTION public.check_student_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_faculty_or_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access Denied: Students cannot modify their role';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Access Denied: Email is verified and immutable';
    END IF;
    IF OLD.onboarding_completed = TRUE AND (
       NEW.roll_no IS DISTINCT FROM OLD.roll_no OR
       NEW.department IS DISTINCT FROM OLD.department OR
       NEW.academic_year IS DISTINCT FROM OLD.academic_year) THEN
      RAISE EXCEPTION 'Access Denied: Academic identity fields cannot be modified after onboarding';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_student_profile ON public.profiles;
CREATE TRIGGER trg_protect_student_profile
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_student_profile_update();

-- Trigger 2: Protect platform metrics and verification badges
CREATE OR REPLACE FUNCTION public.check_coding_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_faculty_or_admin() THEN
    IF NEW.total_solved IS DISTINCT FROM OLD.total_solved OR
       NEW.easy_solved IS DISTINCT FROM OLD.easy_solved OR
       NEW.medium_solved IS DISTINCT FROM OLD.medium_solved OR
       NEW.hard_solved IS DISTINCT FROM OLD.hard_solved OR
       NEW.rating IS DISTINCT FROM OLD.rating OR
       NEW.global_rank IS DISTINCT FROM OLD.global_rank OR
       NEW.repos_count IS DISTINCT FROM OLD.repos_count OR
       NEW.contributions_count IS DISTINCT FROM OLD.contributions_count OR
       NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      RAISE EXCEPTION 'Access Denied: Metrics and verification status are updated exclusively by server-side workers';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_coding_profile ON public.coding_profiles;
CREATE TRIGGER trg_protect_coding_profile
BEFORE UPDATE ON public.coding_profiles
FOR EACH ROW EXECUTE FUNCTION public.check_coding_profile_update();

-- Trigger 3: Protect faculty feedback on commands
CREATE OR REPLACE FUNCTION public.check_command_assignment_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_faculty_or_admin() THEN
    IF NEW.faculty_feedback IS DISTINCT FROM OLD.faculty_feedback OR
       NEW.grade_or_rating IS DISTINCT FROM OLD.grade_or_rating OR
       NEW.command_id IS DISTINCT FROM OLD.command_id OR
       NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      RAISE EXCEPTION 'Access Denied: Cannot modify faculty feedback or assignment relations';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_command_assignment ON public.command_assignments;
CREATE TRIGGER trg_protect_command_assignment
BEFORE UPDATE ON public.command_assignments
FOR EACH ROW EXECUTE FUNCTION public.check_command_assignment_update();

-- Trigger 4: Protect contest participation verification
CREATE OR REPLACE FUNCTION public.check_participation_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_faculty_or_admin() THEN
    IF NEW.status = 'winner' AND OLD.status != 'winner' THEN
      RAISE EXCEPTION 'Access Denied: Winner status can only be granted by faculty';
    END IF;
    IF NEW.verified_by IS DISTINCT FROM OLD.verified_by OR
       NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
      RAISE EXCEPTION 'Access Denied: Verification timestamps are restricted to faculty';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_participation ON public.opportunity_participations;
CREATE TRIGGER trg_protect_participation
BEFORE UPDATE ON public.opportunity_participations
FOR EACH ROW EXECUTE FUNCTION public.check_participation_verification();

-- Trigger 5: Audit log immutability
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Access Denied: Audit logs are append-only and immutable';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_immutable_super_admin_audit ON public.super_admin_audit_logs;
CREATE TRIGGER trg_immutable_super_admin_audit
BEFORE UPDATE OR DELETE ON public.super_admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_immutable_student_activity ON public.student_activity_logs;
CREATE TRIGGER trg_immutable_student_activity
BEFORE UPDATE OR DELETE ON public.student_activity_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 5. ATOMIC INGESTION, DAILY ACTIVITY & STREAK PROCEDURES

-- Atomic First-Solve Ingestion Trigger
CREATE OR REPLACE FUNCTION public.trg_process_submission_atomic()
RETURNS TRIGGER AS $$
DECLARE
  v_canonical_id TEXT;
  v_already_solved BOOLEAN := FALSE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.student_id::text));

  SELECT canonical_problem_id INTO v_canonical_id
  FROM public.problem_equivalences
  WHERE verification_status = 'auto_verified'
    AND ((platform_a = NEW.platform AND problem_id_a = NEW.external_problem_id)
      OR (platform_b = NEW.platform AND problem_id_b = NEW.external_problem_id))
  LIMIT 1;

  IF NEW.verdict = 'accepted' THEN
    IF v_canonical_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.coding_submissions cs
        WHERE cs.student_id = NEW.student_id
          AND cs.verdict = 'accepted'
          AND cs.is_first_accepted = TRUE
          AND EXISTS (
            SELECT 1 FROM public.problem_equivalences pe
            WHERE pe.canonical_problem_id = v_canonical_id
              AND pe.verification_status = 'auto_verified'
              AND ((pe.platform_a = cs.platform AND pe.problem_id_a = cs.external_problem_id)
                OR (pe.platform_b = cs.platform AND pe.problem_id_b = cs.external_problem_id))
          )
      ) INTO v_already_solved;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM public.coding_submissions cs
        WHERE cs.student_id = NEW.student_id
          AND cs.platform = NEW.platform
          AND cs.external_problem_id = NEW.external_problem_id
          AND cs.verdict = 'accepted'
          AND cs.is_first_accepted = TRUE
      ) INTO v_already_solved;
    END IF;

    IF v_already_solved THEN
      NEW.is_first_accepted := FALSE;
      NEW.points_awarded := 0;
    ELSE
      NEW.is_first_accepted := TRUE;
      NEW.points_awarded := CASE LOWER(COALESCE(NEW.difficulty, 'easy'))
        WHEN 'easy' THEN 1
        WHEN 'medium' THEN 3
        WHEN 'hard' THEN 5
        ELSE 1
      END;
    END IF;
  ELSE
    NEW.is_first_accepted := FALSE;
    NEW.points_awarded := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_submission_atomic_ingest ON public.coding_submissions;
CREATE TRIGGER trg_submission_atomic_ingest
BEFORE INSERT ON public.coding_submissions
FOR EACH ROW EXECUTE FUNCTION public.trg_process_submission_atomic();

-- Daily Activity Resolution
CREATE OR REPLACE FUNCTION public.resolve_daily_activity_for_student(
  p_student_id UUID,
  p_date DATE
)
RETURNS VOID AS $$
DECLARE
  v_unique_count INT;
  v_platforms platform_type[];
  v_is_today BOOLEAN;
  v_has_active_problem BOOLEAN;
  v_all_covered BOOLEAN;
  v_connected_count INT;
  v_covered_count INT;
  v_state activity_state;
BEGIN
  SELECT 
    COUNT(DISTINCT external_problem_id),
    array_agg(DISTINCT platform)
  INTO v_unique_count, v_platforms
  FROM public.coding_submissions
  WHERE student_id = p_student_id
    AND activity_date = p_date
    AND verdict = 'accepted'
    AND platform != 'github';

  v_unique_count := COALESCE(v_unique_count, 0);
  v_has_active_problem := (v_unique_count > 0);
  v_is_today := (p_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE);

  IF v_has_active_problem THEN
    v_state := 'active';
  ELSIF v_is_today THEN
    v_state := 'in_progress';
  ELSE
    SELECT COUNT(*) INTO v_connected_count
    FROM public.coding_profiles
    WHERE student_id = p_student_id AND platform != 'github';

    SELECT COUNT(DISTINCT platform) INTO v_covered_count
    FROM public.platform_coverage_windows
    WHERE student_id = p_student_id
      AND platform != 'github'
      AND segment_start_date <= p_date
      AND segment_end_date >= p_date
      AND is_complete = TRUE;

    v_all_covered := (v_connected_count > 0 AND v_covered_count >= v_connected_count);

    IF v_all_covered THEN
      v_state := 'inactive';
    ELSE
      v_state := 'unverified';
    END IF;
  END IF;

  INSERT INTO public.daily_activity (
    student_id, activity_date, unique_problems_solved, platforms_involved, activity_state, last_reconciled_at
  ) VALUES (
    p_student_id, p_date, v_unique_count, COALESCE(v_platforms, '{}'), v_state, NOW()
  )
  ON CONFLICT (student_id, activity_date) DO UPDATE SET
    unique_problems_solved = EXCLUDED.unique_problems_solved,
    platforms_involved = EXCLUDED.platforms_involved,
    activity_state = EXCLUDED.activity_state,
    last_reconciled_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Recalculate Student Streak
CREATE OR REPLACE FUNCTION public.recalculate_student_streak(p_student_id UUID)
RETURNS VOID AS $$
DECLARE
  r RECORD;
  v_curr_streak INT := 0;
  v_longest_streak INT := 0;
  v_last_active_date DATE := NULL;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
BEGIN
  FOR r IN (
    SELECT activity_date, activity_state
    FROM public.daily_activity
    WHERE student_id = p_student_id
    ORDER BY activity_date ASC
  ) LOOP
    IF r.activity_state = 'active' THEN
      v_curr_streak := v_curr_streak + 1;
      v_last_active_date := r.activity_date;
      IF v_curr_streak > v_longest_streak THEN
        v_longest_streak := v_curr_streak;
      END IF;
    ELSIF r.activity_state = 'inactive' THEN
      IF r.activity_date < v_today THEN
        v_curr_streak := 0;
      END IF;
    ELSIF r.activity_state IN ('unverified', 'sync_pending', 'in_progress') THEN
      NULL;
    END IF;
  END LOOP;

  INSERT INTO public.student_streaks (
    student_id, current_streak, longest_streak, last_active_date, updated_at
  ) VALUES (
    p_student_id, v_curr_streak, v_longest_streak, v_last_active_date, NOW()
  )
  ON CONFLICT (student_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = GREATEST(public.student_streaks.longest_streak, EXCLUDED.longest_streak),
    last_active_date = EXCLUDED.last_active_date,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Transactional Command Creation Stored Procedure
CREATE OR REPLACE FUNCTION public.create_command_transactional(
  p_title TEXT,
  p_description TEXT,
  p_target_type TEXT,
  p_target_student_ids UUID[],
  p_due_date TIMESTAMPTZ,
  p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_command_id UUID;
  v_student_id UUID;
  v_invalid_count INT;
BEGIN
  IF NOT public.is_faculty_or_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only faculty can issue commands';
  END IF;

  IF p_target_type IN ('individual', 'selected') THEN
    IF p_target_student_ids IS NULL OR array_length(p_target_student_ids, 1) = 0 THEN
      RAISE EXCEPTION 'Validation Failed: Target student array cannot be empty for % targeting', p_target_type;
    END IF;

    SELECT COUNT(*) INTO v_invalid_count
    FROM unnest(p_target_student_ids) AS tid
    LEFT JOIN public.profiles p ON p.id = tid AND p.role = 'student'
    WHERE p.id IS NULL;

    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'Validation Failed: % target IDs do not belong to approved students', v_invalid_count;
    END IF;
  END IF;

  INSERT INTO public.commands (title, description, assigned_by, target_type, due_date, attachments)
  VALUES (p_title, p_description, auth.uid(), p_target_type, p_due_date, p_attachments)
  RETURNING id INTO v_command_id;

  IF p_target_type = 'all' THEN
    INSERT INTO public.command_assignments (command_id, student_id)
    SELECT v_command_id, id FROM public.profiles WHERE role = 'student';
  ELSIF p_target_type IN ('individual', 'selected') THEN
    FOREACH v_student_id IN ARRAY p_target_student_ids LOOP
      INSERT INTO public.command_assignments (command_id, student_id)
      VALUES (v_command_id, v_student_id);
    END LOOP;
  END IF;

  RETURN v_command_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.create_command_transactional FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_command_transactional TO authenticated, service_role;

-- 6. INITIAL SUPER ADMIN BOOTSTRAP
CREATE OR REPLACE FUNCTION public.bootstrap_initial_super_admin(
  p_email TEXT,
  p_full_name TEXT DEFAULT 'Initial Super Admin'
)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.approved_users WHERE role = 'super_admin') THEN
    RAISE EXCEPTION 'Bootstrap Aborted: A Super Admin is already provisioned';
  END IF;

  INSERT INTO public.approved_users (email, role, full_name, notes)
  VALUES (p_email, 'super_admin', p_full_name, 'Root administrative provisioning');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.bootstrap_initial_super_admin FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_super_admin TO service_role;

-- 7. PRE-SEED APPROVED ROSTER (Super Admin & Faculty)
INSERT INTO public.approved_users (email, role, full_name, notes) VALUES
  ('smslgr2512@gmail.com', 'super_admin', 'Suba', 'Lead Developer & Super Admin'),
  ('ganesh@uniqshift.com', 'faculty', 'Prof. Ganesh Sir', 'Lead Placement Mentor'),
  ('principal@nec.edu.in', 'faculty', 'Dr. K. Kalidasa Murugavel', 'Principal'),
  ('deanrd@nec.edu.in', 'faculty', 'Dr. Shenbagavalli', 'Dean R&D'),
  ('hodcse@nec.edu.in', 'faculty', 'Dr. V. Gomathi', 'HOD - CSE'),
  ('hodai@nec.edu.in', 'faculty', 'Dr. L. Jerart Julus', 'HOD - AI&DS'),
  ('hodit@nec.edu.in', 'faculty', 'Dr. D. Manimegalai', 'HOD - IT'),
  ('bsp@nec.edu.in', 'faculty', 'Dr. B. Shanmuga Priya', 'Associate Professor - IT'),
  ('anithait@nec.edu.in', 'faculty', 'Prof. Anitha', 'Senior Faculty - IT'),
  ('rampriya-aids@nec.edu.in', 'faculty', 'Prof. Rampriya', 'Senior Faculty - AI&DS'),
  ('naskat@nec.edu.in', 'faculty', 'Dr. J. Naskath', 'Associate Professor - AI&DS')
ON CONFLICT (email) DO NOTHING;

-- 8. ROW LEVEL SECURITY POLICIES ACROSS ALL 23 TABLES
ALTER TABLE public.approved_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_coverage_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_equivalences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. approved_users
CREATE POLICY "Super admin manage approved users" ON public.approved_users FOR ALL USING (public.is_super_admin());

-- 2. profiles
CREATE POLICY "Profiles read" ON public.profiles FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = id);
CREATE POLICY "Profiles insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());

-- 3. coding_profiles
CREATE POLICY "Coding profiles read" ON public.coding_profiles FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);
CREATE POLICY "Coding profiles insert" ON public.coding_profiles FOR INSERT WITH CHECK (auth.uid() = student_id OR public.is_faculty_or_admin());
CREATE POLICY "Coding profiles update" ON public.coding_profiles FOR UPDATE USING (auth.uid() = student_id OR public.is_faculty_or_admin());
CREATE POLICY "Coding profiles delete" ON public.coding_profiles FOR DELETE USING (auth.uid() = student_id OR public.is_faculty_or_admin());

-- 4. platform_coverage_windows
CREATE POLICY "Coverage windows read" ON public.platform_coverage_windows FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);

-- 5. coding_submissions
CREATE POLICY "Submissions read" ON public.coding_submissions FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);

-- 6. problem_equivalences
CREATE POLICY "Equivalences read" ON public.problem_equivalences FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Equivalences faculty write" ON public.problem_equivalences FOR ALL USING (public.is_faculty_or_admin());

-- 7. daily_activity
CREATE POLICY "Daily activity read" ON public.daily_activity FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);

-- 8. student_streaks
CREATE POLICY "Streaks read" ON public.student_streaks FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);

-- 9. platform_sync_jobs & 10. platform_sync_logs
CREATE POLICY "Sync jobs read" ON public.platform_sync_jobs FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);
CREATE POLICY "Sync logs read" ON public.platform_sync_logs FOR SELECT USING (public.is_faculty_or_admin());

-- 11. metric_snapshots
CREATE POLICY "Metric snapshots read" ON public.metric_snapshots FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);

-- 12. leaderboard_snapshots
CREATE POLICY "Leaderboards read" ON public.leaderboard_snapshots FOR SELECT USING (auth.uid() IS NOT NULL);

-- 13. commands
CREATE POLICY "Commands read" ON public.commands FOR SELECT USING (
  public.is_faculty_or_admin() OR target_type = 'all' OR 
  EXISTS (SELECT 1 FROM public.command_assignments WHERE command_id = commands.id AND student_id = auth.uid())
);
CREATE POLICY "Commands faculty write" ON public.commands FOR ALL USING (public.is_faculty_or_admin());

-- 14. command_assignments
CREATE POLICY "Assignments read" ON public.command_assignments FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);
CREATE POLICY "Assignments student update" ON public.command_assignments FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Assignments faculty write" ON public.command_assignments FOR ALL USING (public.is_faculty_or_admin());

-- 15. command_comments
CREATE POLICY "Comments read" ON public.command_comments FOR SELECT USING (
  public.is_faculty_or_admin() OR 
  EXISTS (SELECT 1 FROM public.command_assignments WHERE id = assignment_id AND student_id = auth.uid())
);
CREATE POLICY "Comments insert" ON public.command_comments FOR INSERT WITH CHECK (
  author_id = auth.uid() AND (
    public.is_faculty_or_admin() OR 
    EXISTS (SELECT 1 FROM public.command_assignments WHERE id = assignment_id AND student_id = auth.uid())
  )
);

-- 16. opportunities
CREATE POLICY "Opportunities read" ON public.opportunities FOR SELECT USING (public.is_faculty_or_admin() OR status = 'approved');
CREATE POLICY "Opportunities faculty write" ON public.opportunities FOR ALL USING (public.is_faculty_or_admin());

-- 17. saved_opportunities
CREATE POLICY "Saved opps student manage" ON public.saved_opportunities FOR ALL USING (auth.uid() = student_id);

-- 18. opportunity_participations
CREATE POLICY "Participations read" ON public.opportunity_participations FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);
CREATE POLICY "Participations student insert" ON public.opportunity_participations FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Participations student update" ON public.opportunity_participations FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Participations faculty manage" ON public.opportunity_participations FOR ALL USING (public.is_faculty_or_admin());

-- 19. announcements
CREATE POLICY "Announcements read" ON public.announcements FOR SELECT USING (
  public.is_faculty_or_admin() OR 
  (target_audience IN ('all', 'students') AND (scheduled_for IS NULL OR scheduled_for <= NOW()))
);
CREATE POLICY "Announcements faculty write" ON public.announcements FOR ALL USING (public.is_faculty_or_admin());

-- 20. report_exports
CREATE POLICY "Report exports faculty manage" ON public.report_exports FOR ALL USING (public.is_faculty_or_admin());

-- 21. notifications
CREATE POLICY "Notifications read" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Notifications update read status" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- 22. student_activity_logs
CREATE POLICY "Student activity logs read" ON public.student_activity_logs FOR SELECT USING (public.is_faculty_or_admin() OR auth.uid() = student_id);
CREATE POLICY "Student activity logs insert" ON public.student_activity_logs FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 23. super_admin_audit_logs
CREATE POLICY "Super admin audit logs read" ON public.super_admin_audit_logs FOR SELECT USING (public.is_super_admin());
