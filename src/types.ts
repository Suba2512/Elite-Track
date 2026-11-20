export type UserRole = 'student' | 'faculty' | 'super_admin' | 'admin';

export type AuthScreen =
  | 'splash'
  | 'login'
  | 'forgot-password'
  | 'otp-verify'
  | 'reset-success'
  | 'session-expired'
  | 'onboarding'
  | 'authenticated';

export type StudentTab =
  | 'home'
  | 'profile'
  | 'coding-profiles'
  | 'analytics'
  | 'commands'
  | 'opportunities'
  | 'calendar'
  | 'achievements'
  | 'notifications'
  | 'settings';

export type AdminTab =
  | 'dashboard'
  | 'issue-command'
  | 'opportunities-pipeline'
  | 'students'
  | 'student-detail'
  | 'command-tracking'
  | 'announcements'
  | 'analytics'
  | 'leaderboards'
  | 'settings';

export type SystemStateScreen =
  | 'none'
  | 'design-system'
  | '404'
  | '403'
  | '500'
  | 'no-internet'
  | 'maintenance'
  | 'sync-failed'
  | 'whatsapp-denied';

export type ValidationStatus = 'idle' | 'checking' | 'found' | 'not-found' | 'private';

export interface CodingPlatformProfile {
  id: string;
  platform: 'LeetCode' | 'Codeforces' | 'CodeChef' | 'GitHub' | string;
  handle: string;
  url: string;
  solvedCount: number;
  secondaryLabel: string;
  secondaryValue: string;
  verificationType: 'Auto-verified' | 'Self-reported';
  lastSynced: string;
  syncStatus: 'synced' | 'failed-private' | 'failed-not-found' | 'failed-api';
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  streakDays?: number;
}

export type CommandStatus = 'Not started' | 'In progress' | 'Done';

export interface StudentCommandReply {
  studentId: string;
  studentName: string;
  rollNo: string;
  status: CommandStatus;
  comment: string;
  updatedAt: string;
}

export interface MentorCommand {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  assignedBy: string;
  assignedByRole: string;
  targetType: 'all' | 'individual';
  targetStudentId?: string;
  attachments: string[];
  createdAt: string;
  myStatus: CommandStatus;
  myComment: string;
  studentReplies: StudentCommandReply[];
}

export type OpportunityCategory = 'Hackathon' | 'Contest';
export type PipelineStage = 'Fetched' | 'Verified' | 'Approved' | 'Rejected';

export type EventStatus =
  | 'Upcoming'
  | 'Registration Open'
  | 'Registration Closed'
  | 'Ongoing'
  | 'Completed'
  | 'Expired'
  | 'Cancelled'
  | 'Needs Verification';

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  category: OpportunityCategory;
  deadline: string;
  daysLeft: number;
  source: 'Devpost' | 'Unstop' | 'MyCareerNet' | 'Manual' | 'LeetCode' | 'CodeChef' | 'Codeforces' | 'CodeGalatta' | string;
  pipelineStage: PipelineStage;
  edition?: string;
  eventStatus?: EventStatus;
  officialEventUrl?: string;
  sourceListingUrl?: string;
  registrationOpenDate?: string | null;
  isRegistrationUrlValid?: boolean;
  linkVerifiedAt?: string | null;
  eventStart?: string;
  eventEnd?: string | null;
  durationText?: string;
  isDuplicateFlagged?: boolean;
  eligibility: string;
  prizeOrPerk: string;
  dates: string;
  registrationUrl: string;
  description: string;
  saved: boolean;
  remindMe: boolean;
  tags: string[];
  participationStatus?: 'Interested' | 'Registered' | 'Participating' | 'Completed' | 'Not Participating' | string;
  registrationConfirmedAt?: string | null;
  contestRatingType?: 'Rated' | 'Unrated' | 'Rating restricted' | 'Unknown' | string;
  eventMode?: 'online' | 'offline' | 'hybrid' | string;
  confidenceScore?: number;
}

export interface AchievementItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  platform: string;
  category: 'Milestone' | 'Hackathon' | 'Streak' | 'Contest';
  metricText: string;
  reflection: string;
  verifiedByMentor: boolean;
}

export interface ActivityNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  timeBucket: 'today' | 'earlier';
  type: 'command' | 'opportunity' | 'milestone' | 'whatsapp';
  unread: boolean;
  actionTab?: StudentTab;
}

export interface StudentRecord {
  id: string;
  name: string;
  rollNo: string;
  department: string;
  email: string;
  avatarUrl: string;
  careerObjective: string;
  whatsappNumber: string;
  whatsappConsent: boolean;
  inAppNotifications: boolean;
  streakDays: number;
  weeklyTargetSolved: number;
  weeklyCurrentSolved: number;
  totalSolved: number;
  contestsCount: number;
  hackathonsCount: number;
  commandsCompleted: number;
  commandsTotal: number;
  activeStatus: 'Active this week' | 'Needs check-in' | 'On track';
  lastActive: string;
  platforms: CodingPlatformProfile[];
  weeklyActivity: { day: string; problems: number; commits: number }[];
  cumulativeHistory: { month: string; total: number }[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
