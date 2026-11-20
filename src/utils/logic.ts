import {
  CodingPlatformProfile,
  CommandStatus,
  MentorCommand,
  Opportunity,
  StudentRecord,
  ValidationStatus,
} from '../types';

/**
 * Validates a coding profile URL or handle deterministically.
 * Supports simulated states for testing edge cases:
 * - contains "private" -> 'private'
 * - contains "404" or "notfound" -> 'not-found'
 * - non-empty valid platform handle/url -> 'found'
 */
export function validateProfileInput(platform: string, rawInput: string): {
  status: ValidationStatus;
  handle: string;
  message: string;
  suggestedCount: number;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      status: 'idle',
      handle: '',
      message: `Paste your ${platform} profile URL or username`,
      suggestedCount: 0,
    };
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('private') || lower.includes('locked')) {
    return {
      status: 'private',
      handle: extractHandle(trimmed),
      message: 'Profile is private — make it public or enter stats manually.',
      suggestedCount: 0,
    };
  }

  if (lower.includes('notfound') || lower.includes('404') || lower.includes('invalid')) {
    return {
      status: 'not-found',
      handle: extractHandle(trimmed),
      message: 'Handle not found on platform. Check spelling or use manual entry.',
      suggestedCount: 0,
    };
  }

  const handle = extractHandle(trimmed);
  const baseCounts: Record<string, number> = {
    LeetCode: 248,
    Codeforces: 112,
    CodeChef: 94,
    GitHub: 42,
  };

  return {
    status: 'found',
    handle,
    message: `Auto-verified @${handle} · ${baseCounts[platform] ?? 50} entries synced`,
    suggestedCount: baseCounts[platform] ?? 50,
  };
}

export function extractHandle(input: string): string {
  const cleaned = input.trim().replace(/\/+$/, '');
  const parts = cleaned.split('/');
  const last = parts[parts.length - 1] || cleaned;
  return last.replace(/^@/, '') || 'student_coder';
}

/**
 * Computes personal goal ring percentage capped cleanly between 0 and 100.
 */
export function calculateProgressPercentage(current: number, target: number): number {
  if (target <= 0) return 0;
  const pct = Math.round((current / target) * 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Calculates total solved problems across all linked platforms for a student.
 */
export function calculateTotalSolvedAcrossPlatforms(platforms: CodingPlatformProfile[]): number {
  return platforms.reduce((sum, p) => sum + (Number.isFinite(p.solvedCount) ? p.solvedCount : 0), 0);
}

/**
 * Updates a command's status and comment for the current student and synchronizes the batch reply list.
 */
export function updateCommandReply(
  commands: MentorCommand[],
  commandId: string,
  studentId: string,
  studentName: string,
  rollNo: string,
  newStatus: CommandStatus,
  newComment: string,
  timestamp = 'Just now'
): MentorCommand[] {
  return commands.map((cmd) => {
    if (cmd.id !== commandId) return cmd;
    const hasExisting = cmd.studentReplies.some((r) => r.studentId === studentId);
    const updatedReplies = hasExisting
      ? cmd.studentReplies.map((r) =>
          r.studentId === studentId
            ? { ...r, status: newStatus, comment: newComment.trim() || r.comment, updatedAt: timestamp }
            : r
        )
      : [
          ...cmd.studentReplies,
          {
            studentId,
            studentName,
            rollNo,
            status: newStatus,
            comment: newComment.trim(),
            updatedAt: timestamp,
          },
        ];

    return {
      ...cmd,
      myStatus: newStatus,
      myComment: newComment.trim() || cmd.myComment,
      studentReplies: updatedReplies,
    };
  });
}

/**
 * Filters opportunities by category, company, and search query.
 * Only 'Approved' opportunities are shown in the student feed unless includePipeline is true.
 * Excludes 'Expired' opportunities by default to preserve freshness.
 */
export function filterOpportunities(
  opportunities: Opportunity[],
  options: {
    category?: 'All' | 'Hackathon' | 'Contest';
    company?: string;
    platform?: string;
    status?: string;
    mode?: string; // 'All' | 'online' | 'offline' | 'hybrid'
    query?: string;
    savedOnly?: boolean;
    includeUnapproved?: boolean;
    includeExpired?: boolean;
  }
): Opportunity[] {
  const {
    category = 'All',
    company = 'All',
    platform = 'All',
    status = 'All',
    mode = 'All',
    query = '',
    savedOnly = false,
    includeUnapproved = false,
    includeExpired = false,
  } = options;

  const q = query.trim().toLowerCase();
  const now = Date.now();

  return opportunities.filter((opp) => {
    if (!includeUnapproved && opp.pipelineStage !== 'Approved') {
      return false;
    }
    // Strict upcoming enforcement: Exclude expired, completed, or cancelled opportunities from default feed
    const isPastDeadline =
      opp.deadline &&
      !isNaN(new Date(opp.deadline).getTime()) &&
      new Date(opp.deadline).getTime() < now &&
      opp.daysLeft === 0;
    const isConcluded =
      opp.eventStatus === 'Expired' ||
      opp.eventStatus === 'Completed' ||
      opp.eventStatus === 'Cancelled' ||
      isPastDeadline;

    if (!includeExpired && status !== 'Expired' && status !== 'Completed') {
      if (isConcluded) return false;
    }
    if (status !== 'All' && opp.eventStatus !== status) {
      return false;
    }
    if (mode !== 'All') {
      const eventMode = (opp.eventMode || 'online').toLowerCase();
      if (eventMode !== mode.toLowerCase()) {
        return false;
      }
    }
    if (category !== 'All' && opp.category !== category) {
      return false;
    }
    if (company !== 'All' && opp.company.toLowerCase() !== company.toLowerCase()) {
      return false;
    }
    if (platform !== 'All' && opp.source.toLowerCase() !== platform.toLowerCase()) {
      return false;
    }
    if (savedOnly && !opp.saved) {
      return false;
    }
    if (q) {
      const matchesTitle = opp.title.toLowerCase().includes(q);
      const matchesCompany = opp.company.toLowerCase().includes(q);
      const matchesTags = (opp.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchesTitle && !matchesCompany && !matchesTags) return false;
    }
    return true;
  });
}

/**
 * Computes non-comparative batch summary stats for the 17 students.
 * Explicitly avoids any ranking or sorting by score.
 */
export function computeBatchOverview(students: StudentRecord[]) {
  const totalStudents = students.length;
  const activeThisWeek = students.filter((s) => s.weeklyCurrentSolved > 0).length;
  const totalProblemsThisWeek = students.reduce((acc, s) => acc + s.weeklyCurrentSolved, 0);
  const commandsDoneCount = students.reduce((acc, s) => acc + s.commandsCompleted, 0);
  const commandsAssignedTotal = students.reduce((acc, s) => acc + s.commandsTotal, 0);
  const completionRate =
    commandsAssignedTotal > 0 ? Math.round((commandsDoneCount / commandsAssignedTotal) * 100) : 0;

  return {
    totalStudents,
    activeThisWeek,
    totalProblemsThisWeek,
    completionRate,
  };
}
