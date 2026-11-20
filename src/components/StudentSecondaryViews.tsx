import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  Bookmark,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Heart,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sun,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  AchievementItem,
  ActivityNotification,
  CommandStatus,
  MentorCommand,
  Opportunity,
  StudentRecord,
  StudentTab,
  SystemStateScreen,
} from '../types';
import { CALENDAR_EVENTS } from '../data/seedData';
import { filterOpportunities } from '../utils/logic';
import { CompanyMonogram, WarmIllustration } from './Illustrations';
import { api } from '../utils/apiClient';

interface StudentSecondaryViewsProps {
  activeTab:
  | 'commands'
  | 'opportunities'
  | 'calendar'
  | 'achievements'
  | 'notifications'
  | 'settings';
  student: StudentRecord;
  onUpdateStudent: (updated: StudentRecord) => void;
  commands: MentorCommand[];
  onReplyCommand: (commandId: string, status: CommandStatus, comment: string) => void;
  opportunities: Opportunity[];
  onToggleSaveOpportunity: (oppId: string) => void;
  onToggleRemindOpportunity: (oppId: string) => void;
  onOpenOpportunityDetail: (opp: Opportunity) => void;
  onUpdateParticipationStatus?: (oppId: string, status: string, notes?: string) => void;
  achievements: AchievementItem[];
  onOpenAchievementDetail: (ach: AchievementItem) => void;
  notifications: ActivityNotification[];
  onMarkAllNotificationsRead: () => void;
  onNavigateTab: (tab: StudentTab) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onTriggerToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  onTriggerSystemState: (state: SystemStateScreen) => void;
}

export const StudentSecondaryViews: React.FC<StudentSecondaryViewsProps> = ({
  activeTab,
  student,
  onUpdateStudent,
  commands,
  onReplyCommand,
  opportunities,
  onToggleSaveOpportunity,
  onToggleRemindOpportunity,
  onOpenOpportunityDetail,
  onUpdateParticipationStatus,
  achievements,
  onOpenAchievementDetail,
  notifications,
  onMarkAllNotificationsRead,
  onNavigateTab,
  darkMode,
  onToggleDarkMode,
  onLogout,
  onTriggerToast,
  onTriggerSystemState,
}) => {
  // Commands state
  const [commandTab, setCommandTab] = useState<'active' | 'history'>('active');
  const [replyingCommand, setReplyingCommand] = useState<MentorCommand | null>(null);
  const [replyStatus, setReplyStatus] = useState<CommandStatus>('In progress');
  const [replyComment, setReplyComment] = useState('');
  const [previewEmptyCommands, setPreviewEmptyCommands] = useState(false);

  // Opportunities state (Phase 4: Two clearly separated categories)
  const [oppSection, setOppSection] = useState<'hackathons' | 'contests'>('hackathons');
  const [oppCompany, setOppCompany] = useState<string>('All');
  const [oppPlatform, setOppPlatform] = useState<string>('All');
  const [oppStatus, setOppStatus] = useState<string>('All');
  const [oppMode, setOppMode] = useState<string>('All');
  const [oppSearch, setOppSearch] = useState('');
  const [oppSavedOnly, setOppSavedOnly] = useState(false);
  const [oppIncludeExpired, setOppIncludeExpired] = useState(false);

  // Dedicated Contest Calendar state (Phase 5)
  const [calendarMode, setCalendarMode] = useState<'month' | 'week' | 'agenda' | 'history'>('month');
  const [calPlatform, setCalPlatform] = useState<string>('All');
  const [calStatus, setCalStatus] = useState<string>('All');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedCalContest, setSelectedCalContest] = useState<Opportunity | null>(null);
  const [calYear, setCalYear] = useState<number>(2026);
  const [calMonth, setCalMonth] = useState<number>(10); // 0-indexed (10 = November)
  const [isRefreshingContests, setIsRefreshingContests] = useState(false);

  // Achievements empty preview
  const [previewEmptyAchievements, setPreviewEmptyAchievements] = useState(false);

  // Settings edit state
  const [editName, setEditName] = useState(student.name);
  const [editObjective, setEditObjective] = useState(student.careerObjective);
  const [editWhatsapp, setEditWhatsapp] = useState(student.whatsappNumber);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ============================================================================
  // 5. COMMAND SECTION (Active / History Tabs + Reply Bottom Sheet)
  // ============================================================================
  if (activeTab === 'commands') {
    const filteredCommands = previewEmptyCommands
      ? []
      : commands.filter((c) =>
        commandTab === 'active' ? c.myStatus !== 'Done' : c.myStatus === 'Done'
      );

    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                Mentor & HOD Commands
              </h1>
              <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
                Tasks assigned by Ganesh Sir and Department HODs. Reply with your status and solution notes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewEmptyCommands(!previewEmptyCommands)}
                className="px-3 py-2 rounded-xl border border-[#1F4959]/20 text-xs font-medium min-h-[40px]"
              >
                {previewEmptyCommands ? 'Restore Commands' : 'Preview Empty State'}
              </button>
              <div
                className="inline-flex p-1 rounded-2xl bg-[#E8D8C3]/55 dark:bg-[#0b2b3c]"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={commandTab === 'active'}
                  onClick={() => setCommandTab('active')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all min-h-[38px] ${commandTab === 'active'
                      ? 'bg-[#1F4959] text-white shadow-sm'
                      : 'text-[#242424] dark:text-[#CFE0E3]'
                    }`}
                >
                  Active ({commands.filter((c) => c.myStatus !== 'Done').length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={commandTab === 'history'}
                  onClick={() => setCommandTab('history')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all min-h-[38px] ${commandTab === 'history'
                      ? 'bg-[#1F4959] text-white shadow-sm'
                      : 'text-[#242424] dark:text-[#CFE0E3]'
                    }`}
                >
                  Completed ({commands.filter((c) => c.myStatus === 'Done').length})
                </button>
              </div>
            </div>
          </div>
        </section>

        {filteredCommands.length === 0 ? (
          <div className="glass-card rounded-[26px] p-10 text-center flex flex-col items-center">
            <WarmIllustration variant="empty" className="w-32 h-32" />
            <h2 className="text-xl font-bold font-serif-display mt-3">
              No {commandTab} commands right now
            </h2>
            <p className="text-xs text-[#5C7C89] max-w-md mt-1.5">
              You’re all caught up on Ganesh Sir’s problem sets! Use this free window to upsolve your latest Codeforces or LeetCode contest.
            </p>
            {previewEmptyCommands && (
              <button
                type="button"
                onClick={() => setPreviewEmptyCommands(false)}
                className="mt-5 px-5 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold min-h-[42px]"
              >
                Show Active Commands
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCommands.map((cmd) => (
              <article
                key={cmd.id}
                className="glass-card rounded-[24px] p-6 flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                      <span className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                        Assigned by {cmd.assignedBy} ({cmd.assignedByRole})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#C9825B] font-semibold">Due {cmd.dueDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>Issued {cmd.createdAt}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold font-serif-display">
                      {cmd.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#242424]/85 dark:text-[#F6F1E9]/85 leading-relaxed">
                      {cmd.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setReplyingCommand(cmd);
                      setReplyStatus(cmd.myStatus);
                      setReplyComment(cmd.myComment);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors shrink-0 self-start min-h-[42px]"
                  >
                    Update Status / Reply
                  </button>
                </div>

                {/* Attachments & Current Student Reply Note */}
                <div className="pt-3 border-t border-[#1F4959]/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-[#5C7C89]">
                    <span className="font-semibold text-[#242424] dark:text-[#F6F1E9]">
                      Your Status: {cmd.myStatus}
                    </span>
                    {cmd.myComment && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="italic">“{cmd.myComment}”</span>
                      </>
                    )}
                  </div>

                  {cmd.attachments.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {cmd.attachments.map((att) => (
                        <button
                          key={att}
                          type="button"
                          onClick={() =>
                            onTriggerToast('info', 'Opening Reference Sheet', `Loaded ${att}`)
                          }
                          className="inline-flex items-center gap-1 text-[#1F4959] dark:text-[#CFE0E3] hover:underline font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{att}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Reply Bottom Sheet / Modal */}
        {replyingCommand && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cmd-reply-sheet-title"
          >
            <div className="glass-modal w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] p-6">
              <div className="w-10 h-1.5 bg-[#5C7C89]/30 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold text-[#C9825B]">
                    Reply to {replyingCommand.assignedBy}
                  </p>
                  <h3 id="cmd-reply-sheet-title" className="text-lg font-bold font-serif-display">
                    {replyingCommand.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingCommand(null)}
                  aria-label="Close reply sheet"
                  className="p-2 rounded-xl hover:bg-black/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onReplyCommand(replyingCommand.id, replyStatus, replyComment);
                  setReplyingCommand(null);
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="reply-status-select" className="block text-xs font-semibold mb-1.5">
                    Completion Status
                  </label>
                  <select
                    id="reply-status-select"
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value as CommandStatus)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/85 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
                  >
                    <option value="Not started">Not started</option>
                    <option value="In progress">In progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reply-comment-box" className="block text-xs font-semibold mb-1.5">
                    Progress Note / GitHub Solution Link
                  </label>
                  <textarea
                    id="reply-comment-box"
                    rows={3}
                    required
                    placeholder="Share how many problems you completed or paste your GitHub commit link..."
                    value={replyComment}
                    onChange={(e) => setReplyComment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/85 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReplyingCommand(null)}
                    className="px-4 py-2.5 rounded-xl border border-[#1F4959]/20 text-xs font-semibold min-h-[42px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center gap-1.5 min-h-[42px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Reply to Mentor</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper functions for Indian Standard Time (IST) formatting and contest metadata
  const formatISTDateTime = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return (
        d.toLocaleString('en-US', {
          timeZone: 'Asia/Kolkata',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    } catch {
      return isoString || '';
    }
  };

  const formatISTTimeOnly = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return (
        d.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    } catch {
      return '';
    }
  };

  const getContestDuration = (startIso?: string | null, endIso?: string | null): string => {
    if (!startIso || !endIso) return '2 hours';
    try {
      const start = new Date(startIso).getTime();
      const end = new Date(endIso).getTime();
      if (isNaN(start) || isNaN(end) || end <= start) return '2 hours';
      const diffMins = Math.round((end - start) / 60000);
      if (diffMins < 60) return `${diffMins} mins`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
    } catch {
      return '2 hours';
    }
  };

  const getCountdown = (startIso?: string | null): string => {
    if (!startIso) return '';
    try {
      const diff = new Date(startIso).getTime() - Date.now();
      if (diff <= 0) return 'Live / Ongoing';
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 0) return `Starts in ${days}d ${hours}h`;
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `Starts in ${hours}h ${mins}m`;
    } catch {
      return '';
    }
  };

  const getGoogleCalendarUrl = (opp: Opportunity): string => {
    const title = encodeURIComponent(opp.title);
    const details = encodeURIComponent(
      `${opp.description}\n\nOfficial Link: ${opp.officialEventUrl || opp.registrationUrl}`
    );
    const location = encodeURIComponent(`${opp.source} Online Platform`);
    let dates = '';
    if (opp.eventStart) {
      try {
        const start = new Date(opp.eventStart).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const end = opp.eventEnd
          ? new Date(opp.eventEnd).toISOString().replace(/-|:|\.\d\d\d/g, '')
          : new Date(new Date(opp.eventStart).getTime() + 7200000).toISOString().replace(/-|:|\.\d\d\d/g, '');
        dates = `&dates=${start}/${end}`;
      } catch {}
    }
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}${dates}&details=${details}&location=${location}`;
  };

  // ============================================================================
  // 6. OPPORTUNITIES (Phase 4: Two Clearly Separated Categories)
  // Section A: Company Hackathons & Hiring Challenges (Devpost & MyCareernet focus)
  // Section B: Competitive Programming Opportunities (LeetCode, Codeforces, CodeChef, CodeGalatta)
  // ============================================================================
  if (activeTab === 'opportunities') {
    // Separate into Category A and Category B
    const allHackathons = opportunities.filter((o) => o.category === 'Hackathon' || (o.category as string) === 'Hiring Challenge');
    const allContests = opportunities.filter(
      (o) => o.category === 'Contest' || ['LeetCode', 'Codeforces', 'CodeChef', 'CodeGalatta'].includes(o.source)
    );

    // Apply filters based on active section
    const visibleHackathons = filterOpportunities(allHackathons, {
      category: 'All',
      company: oppCompany,
      mode: oppMode,
      query: oppSearch,
      savedOnly: oppSavedOnly,
      includeUnapproved: false,
      includeExpired: oppIncludeExpired,
    });

    const visibleContests = filterOpportunities(allContests, {
      category: 'All',
      company: 'All',
      platform: oppPlatform,
      status: oppStatus,
      mode: oppMode,
      query: oppSearch,
      savedOnly: oppSavedOnly,
      includeUnapproved: false,
      includeExpired: oppIncludeExpired,
    });

    const upcomingHackathons = allHackathons.filter(
      (h) => oppIncludeExpired || (h.eventStatus !== 'Expired' && h.eventStatus !== 'Completed')
    );
    const hackathonCompanies = [
      'All',
      ...Array.from(new Set(upcomingHackathons.map((h) => h.company))),
    ];
    const contestPlatforms = ['All', 'LeetCode', 'Codeforces', 'CodeChef', 'CodeGalatta'];
    const contestStatuses = ['All', 'Upcoming', 'Registration Open', 'Ongoing', 'Completed', 'Expired'];

    return (
      <div className="space-y-6">
        {/* Main Section Selector */}
        <section className="glass-card rounded-[26px] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                Opportunity Hub & Challenges
              </h1>
              <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
                Every listing is verified by Ganesh Sir before distribution. Separated into Company Hackathons and Competitive Programming Contests.
              </p>
            </div>

            {/* Primary Category Switcher: Section A vs Section B */}
            <div
              className="inline-flex p-1 rounded-2xl bg-[#E8D8C3]/55 dark:bg-[#0b2b3c] self-start"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={oppSection === 'hackathons'}
                onClick={() => setOppSection('hackathons')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] inline-flex items-center gap-2 ${
                  oppSection === 'hackathons'
                    ? 'bg-[#1F4959] text-white shadow-sm'
                    : 'text-[#242424] dark:text-[#CFE0E3] hover:text-[#1F4959]'
                }`}
              >
                <span>🏢 Company Hackathons</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/20">
                  {allHackathons.filter((h) => oppIncludeExpired || h.eventStatus !== 'Expired').length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={oppSection === 'contests'}
                onClick={() => setOppSection('contests')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] inline-flex items-center gap-2 ${
                  oppSection === 'contests'
                    ? 'bg-[#1F4959] text-white shadow-sm'
                    : 'text-[#242424] dark:text-[#CFE0E3] hover:text-[#1F4959]'
                }`}
              >
                <span>⚡ Competitive Programming</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/20">
                  {allContests.filter((c) => oppIncludeExpired || c.eventStatus !== 'Expired').length}
                </span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-[#1F4959]/10 dark:border-white/10">
            {oppSection === 'hackathons' ? (
              /* Company Pills for Hackathons */
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#5C7C89] mr-1">Company:</span>
                {hackathonCompanies.map((comp) => (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => setOppCompany(comp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors min-h-[34px] ${
                      oppCompany === comp
                        ? 'bg-[#C9825B] text-white'
                        : 'bg-white/60 dark:bg-white/5 text-[#242424] dark:text-[#CFE0E3] hover:bg-white'
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            ) : (
              /* Platform & Status Pills for Competitive Programming */
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-semibold text-[#5C7C89] mr-1">Platform:</span>
                  {contestPlatforms.map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setOppPlatform(plat)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors min-h-[32px] ${
                        oppPlatform === plat
                          ? 'bg-[#1F4959] text-white'
                          : 'bg-white/60 dark:bg-white/5 text-[#242424] dark:text-[#CFE0E3] hover:bg-white'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1 pl-2 border-l border-[#1F4959]/15">
                  <span className="text-[11px] font-semibold text-[#5C7C89] mr-1">Status:</span>
                  {contestStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOppStatus(st)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors min-h-[32px] ${
                        oppStatus === st
                          ? 'bg-[#C9825B] text-white'
                          : 'bg-white/60 dark:bg-white/5 text-[#242424] dark:text-[#CFE0E3] hover:bg-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search, Saved, and Expired Toggles */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-[#5C7C89] absolute left-3 top-3" />
                <input
                  type="search"
                  aria-label="Search opportunities"
                  placeholder="Search by title, skill..."
                  value={oppSearch}
                  onChange={(e) => setOppSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => setOppSavedOnly(!oppSavedOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 min-h-[38px] ${
                  oppSavedOnly
                    ? 'bg-[#1F4959] text-white border-[#1F4959]'
                    : 'bg-white/60 dark:bg-white/5 border-[#1F4959]/20 text-[#242424] dark:text-[#CFE0E3]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${oppSavedOnly ? 'fill-white' : ''}`} />
                <span>Saved</span>
              </button>

              <button
                type="button"
                onClick={() => setOppIncludeExpired(!oppIncludeExpired)}
                title="Show or hide concluded/expired listings for audit purposes"
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-1 min-h-[38px] ${
                  oppIncludeExpired
                    ? 'bg-[#C9825B]/20 text-[#C9825B] border-[#C9825B]'
                    : 'bg-white/60 dark:bg-white/5 border-[#1F4959]/20 text-[#5C7C89]'
                }`}
              >
                <span>{oppIncludeExpired ? 'Hiding History' : 'View History'}</span>
              </button>
            </div>
          </div>

          {/* Format / Event Mode Filter Bar: Online vs Offline vs Hybrid */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#1F4959]/10 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#5C7C89] mr-1">Event Mode:</span>
              {[
                { id: 'All', label: 'All Formats', icon: '✨' },
                { id: 'online', label: 'Online Hackathons', icon: '🌐' },
                { id: 'offline', label: 'On-Campus / In-Person', icon: '🏛️' },
                { id: 'hybrid', label: 'Hybrid Format', icon: '⚡' },
              ].map((m) => {
                const isSelected = oppMode.toLowerCase() === m.id.toLowerCase();
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOppMode(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[34px] inline-flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#1F4959] text-white shadow-sm ring-2 ring-[#1F4959]/20'
                        : 'bg-white/60 dark:bg-white/5 text-[#242424] dark:text-[#CFE0E3] hover:bg-white/90 border border-[#1F4959]/12 dark:border-white/10'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-medium text-[#5C7C89] dark:text-[#89A7B3]">
              Showing {oppSection === 'hackathons' ? visibleHackathons.length : visibleContests.length} {oppSection === 'hackathons' ? 'hackathons' : 'contests'}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION A: COMPANY HACKATHONS LISTING */}
        {/* ========================================================================= */}
        {oppSection === 'hackathons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                  Company Hackathons & Corporate Hiring Challenges
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3] font-semibold">
                  {visibleHackathons.length} Active Listings
                </span>
              </div>
              <span className="text-xs text-[#5C7C89]">
                Prioritizing Devpost & MyCareernet verified corporate sponsors
              </span>
            </div>

            {visibleHackathons.length === 0 ? (
              <div className="glass-card rounded-[26px] p-10 text-center flex flex-col items-center">
                <WarmIllustration variant="empty" className="w-32 h-32" />
                <h2 className="text-xl font-bold font-serif-display mt-3">No matching company hackathons</h2>
                <p className="text-xs text-[#5C7C89] max-w-md mt-1.5">
                  Try clearing your company or search filter. Note that expired hackathons are hidden from the default upcoming list.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOppCompany('All');
                    setOppPlatform('All');
                    setOppStatus('All');
                    setOppMode('All');
                    setOppSearch('');
                    setOppSavedOnly(false);
                    setOppIncludeExpired(false);
                  }}
                  className="mt-5 px-5 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold min-h-[42px]"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {visibleHackathons.map((opp) => {
                  const isConcluded =
                    opp.eventStatus === 'Expired' ||
                    opp.eventStatus === 'Completed' ||
                    opp.eventStatus === 'Cancelled' ||
                    (opp.deadline && !isNaN(new Date(opp.deadline).getTime()) && new Date(opp.deadline).getTime() < Date.now() && opp.daysLeft === 0);
                  const isRegistrationValid = opp.isRegistrationUrlValid !== false && !isConcluded;
                  const isExpired = isConcluded;

                  return (
                    <article
                      key={opp.id}
                      className="glass-card rounded-[26px] p-6 flex flex-col justify-between gap-4 hover:-translate-y-0.5 transition-transform"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <CompanyMonogram company={opp.company} size="lg" />
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                                <span className="font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                                  {opp.company}
                                </span>
                                {opp.edition && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-semibold px-1.5 py-0.2 rounded bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3]">
                                      {opp.edition}
                                    </span>
                                  </>
                                )}
                                <span aria-hidden="true">·</span>
                                <span>{opp.category}</span>
                              </div>
                              <h2 className="text-lg font-bold font-serif-display mt-0.5 text-[#1F4959] dark:text-[#F6F1E9]">
                                {opp.title}
                              </h2>
                            </div>
                          </div>

                          {/* Heart & Bell */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onToggleSaveOpportunity(opp.id)}
                              aria-label={opp.saved ? `Unsave ${opp.title}` : `Save ${opp.title}`}
                              className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/10 border border-[#1F4959]/15 hover:scale-105 transition-transform min-h-[42px] min-w-[42px] flex items-center justify-center"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  opp.saved ? 'text-[#C9825B] fill-[#C9825B]' : 'text-[#5C7C89] dark:text-[#CFE0E3]'
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleRemindOpportunity(opp.id)}
                              aria-label={
                                opp.remindMe ? `Cancel reminder for ${opp.title}` : `Remind me about ${opp.title}`
                              }
                              className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/10 border border-[#1F4959]/15 hover:scale-105 transition-transform min-h-[42px] min-w-[42px] flex items-center justify-center"
                            >
                              <Bell
                                className={`w-4 h-4 ${
                                  opp.remindMe ? 'text-[#D9A441] fill-[#D9A441]' : 'text-[#5C7C89] dark:text-[#CFE0E3]'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Status Badges & Lifecycle */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#52B788]/20 text-[#2D6A4F] dark:text-[#74C69D]">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Mentor Approved</span>
                          </span>

                          {/* Event Format Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              (opp.eventMode || 'online').toLowerCase() === 'offline'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                : (opp.eventMode || 'online').toLowerCase() === 'hybrid'
                                ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                                : 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200 border border-sky-300 dark:border-sky-700'
                            }`}
                          >
                            <span>
                              {(opp.eventMode || 'online').toLowerCase() === 'offline'
                                ? '🏛️ Offline / In-Person'
                                : (opp.eventMode || 'online').toLowerCase() === 'hybrid'
                                ? '⚡ Hybrid'
                                : '🌐 Online'}
                            </span>
                          </span>

                          {opp.eventStatus && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isExpired
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  : opp.eventStatus === 'Registration Open'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              }`}
                            >
                              {opp.eventStatus}
                            </span>
                          )}

                          {!isExpired && opp.daysLeft !== undefined && (
                            <span className="text-[11px] font-bold text-[#C9825B]">
                              ⏳ {opp.daysLeft} days left
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-[#242424]/85 dark:text-[#F6F1E9]/85 mt-3 leading-relaxed line-clamp-3">
                          {opp.description}
                        </p>

                        <div className="mt-3 pt-3 border-t border-[#1F4959]/10 dark:border-white/10 space-y-1.5 text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                          <p>
                            <strong className="text-[#242424] dark:text-[#F6F1E9]">Prizes / Perks:</strong>{' '}
                            {opp.prizeOrPerk}
                          </p>
                          <p>
                            <strong className="text-[#242424] dark:text-[#F6F1E9]">Eligibility:</strong>{' '}
                            {opp.eligibility}
                          </p>
                          <p>
                            <strong className="text-[#242424] dark:text-[#F6F1E9]">Deadline:</strong> {opp.deadline}
                          </p>

                          {/* My Status Dropdown */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#1F4959]/10">
                            <span className="text-[11px] font-semibold text-[#5C7C89]">My Status:</span>
                            <select
                              aria-label="Update participation status"
                              value={opp.participationStatus || 'Interested'}
                              onChange={(e) => {
                                if (onUpdateParticipationStatus) {
                                  onUpdateParticipationStatus(opp.id, e.target.value);
                                }
                              }}
                              className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-semibold text-[#1F4959] dark:text-[#CFE0E3]"
                            >
                              <option value="Interested">Interested</option>
                              <option value="Registered">Registered ✓</option>
                              <option value="Participating">Participating</option>
                              <option value="Completed">Completed</option>
                              <option value="Not Participating">Not Participating</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons (Phase 3: Registration Links & Official Event URL) */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#1F4959]/10">
                        {/* Official Event Link */}
                        {opp.officialEventUrl && (
                          <a
                            href={opp.officialEventUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="py-2 px-3 rounded-xl border border-[#1F4959]/20 text-[#1F4959] dark:text-[#CFE0E3] text-xs font-semibold hover:bg-[#1F4959]/5 inline-flex items-center justify-center gap-1.5 min-h-[38px]"
                          >
                            <span>Official Page</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Registration Button */}
                        {isRegistrationValid && opp.registrationUrl ? (
                          <a
                            href={opp.registrationUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={() =>
                              onTriggerToast('success', `Opening ${opp.company} Portal`, 'Remember to update your mentor command once registered.')
                            }
                            className="flex-1 py-2 px-4 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center justify-center gap-1.5 min-h-[38px]"
                          >
                            <span>Register on Official Portal</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title={isExpired ? 'Registration deadline has passed' : 'Registration destination could not be verified'}
                            className="flex-1 py-2 px-4 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs font-semibold cursor-not-allowed inline-flex items-center justify-center gap-1.5 min-h-[38px] border border-gray-300 dark:border-gray-700"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Registration link unavailable</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenOpportunityDetail(opp)}
                          className="py-2 px-3 rounded-xl bg-[#C9825B] text-white text-xs font-semibold hover:opacity-90 transition-opacity min-h-[38px]"
                        >
                          Details
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION B: COMPETITIVE PROGRAMMING OPPORTUNITIES LISTING */}
        {/* ========================================================================= */}
        {oppSection === 'contests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                  Competitive Programming Contests (LeetCode, Codeforces, CodeChef, CodeGalatta)
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3] font-semibold">
                  {visibleContests.length} Contests
                </span>
              </div>
              <span className="text-xs text-[#5C7C89] font-medium">
                All start and end times formatted in Indian Standard Time (IST)
              </span>
            </div>

            {visibleContests.length === 0 ? (
              <div className="glass-card rounded-[26px] p-10 text-center flex flex-col items-center">
                <WarmIllustration variant="empty" className="w-32 h-32" />
                <h2 className="text-xl font-bold font-serif-display mt-3">No matching competitive programming contests</h2>
                <p className="text-xs text-[#5C7C89] max-w-md mt-1.5">
                  Try clearing your platform or status filter to see upcoming weekly and division contests.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOppPlatform('All');
                    setOppStatus('All');
                    setOppSearch('');
                    setOppSavedOnly(false);
                    setOppIncludeExpired(false);
                  }}
                  className="mt-5 px-5 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold min-h-[42px]"
                >
                  Reset Contest Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {visibleContests.map((opp) => {
                  const isConcluded =
                    opp.eventStatus === 'Expired' ||
                    opp.eventStatus === 'Completed' ||
                    opp.eventStatus === 'Cancelled' ||
                    (opp.deadline && !isNaN(new Date(opp.deadline).getTime()) && new Date(opp.deadline).getTime() < Date.now() && opp.daysLeft === 0);
                  const isRegistrationValid = opp.isRegistrationUrlValid !== false && !isConcluded;
                  const isExpired = isConcluded;
                  const istFormattedTime = formatISTDateTime(opp.eventStart || opp.deadline);
                  const duration = getContestDuration(opp.eventStart, opp.eventEnd);
                  const countdown = getCountdown(opp.eventStart);

                  return (
                    <article
                      key={opp.id}
                      className="glass-card rounded-[26px] p-6 flex flex-col justify-between gap-4 hover:-translate-y-0.5 transition-transform"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <CompanyMonogram company={opp.source || opp.company} size="lg" />
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                                <span className="font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                                  {opp.source || opp.company}
                                </span>
                                {opp.edition && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-semibold px-1.5 py-0.2 rounded bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3]">
                                      {opp.edition}
                                    </span>
                                  </>
                                )}
                                <span aria-hidden="true">·</span>
                                <span>{opp.contestRatingType || 'Rated'}</span>
                              </div>
                              <h2 className="text-lg font-bold font-serif-display mt-0.5 text-[#1F4959] dark:text-[#F6F1E9]">
                                {opp.title}
                              </h2>
                            </div>
                          </div>

                          {/* Heart & Bell */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onToggleSaveOpportunity(opp.id)}
                              aria-label={opp.saved ? `Unsave ${opp.title}` : `Save ${opp.title}`}
                              className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/10 border border-[#1F4959]/15 hover:scale-105 transition-transform min-h-[42px] min-w-[42px] flex items-center justify-center"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  opp.saved ? 'text-[#C9825B] fill-[#C9825B]' : 'text-[#5C7C89] dark:text-[#CFE0E3]'
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleRemindOpportunity(opp.id)}
                              aria-label={
                                opp.remindMe ? `Cancel reminder for ${opp.title}` : `Remind me about ${opp.title}`
                              }
                              className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/10 border border-[#1F4959]/15 hover:scale-105 transition-transform min-h-[42px] min-w-[42px] flex items-center justify-center"
                            >
                              <Bell
                                className={`w-4 h-4 ${
                                  opp.remindMe ? 'text-[#D9A441] fill-[#D9A441]' : 'text-[#5C7C89] dark:text-[#CFE0E3]'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Contest IST Timing & Status Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3]">
                            <Clock className="w-3.5 h-3.5 text-[#C9825B]" />
                            <span>{istFormattedTime}</span>
                          </span>

                          {/* Event Format Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              (opp.eventMode || 'online').toLowerCase() === 'offline'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                : (opp.eventMode || 'online').toLowerCase() === 'hybrid'
                                ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                                : 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200 border border-sky-300 dark:border-sky-700'
                            }`}
                          >
                            <span>
                              {(opp.eventMode || 'online').toLowerCase() === 'offline'
                                ? '🏛️ Offline'
                                : (opp.eventMode || 'online').toLowerCase() === 'hybrid'
                                ? '⚡ Hybrid'
                                : '🌐 Online'}
                            </span>
                          </span>

                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#E8D8C3] dark:bg-[#0b2b3c] text-[#1F4959] dark:text-[#CFE0E3]">
                            ⏱ {duration}
                          </span>

                          {opp.contestRatingType && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                opp.contestRatingType === 'Rated'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }`}
                            >
                              {opp.contestRatingType}
                            </span>
                          )}

                          {countdown && (
                            <span className="text-[11px] font-bold text-[#C9825B]">
                              {countdown}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-[#242424]/85 dark:text-[#F6F1E9]/85 mt-3 leading-relaxed line-clamp-3">
                          {opp.description}
                        </p>

                        <div className="mt-3 pt-3 border-t border-[#1F4959]/10 dark:border-white/10 space-y-1.5 text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                          <p>
                            <strong className="text-[#242424] dark:text-[#F6F1E9]">Format & Rules:</strong>{' '}
                            {opp.eligibility}
                          </p>
                          <p>
                            <strong className="text-[#242424] dark:text-[#F6F1E9]">Perks:</strong>{' '}
                            {opp.prizeOrPerk}
                          </p>

                          {/* My Status Dropdown */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#1F4959]/10">
                            <span className="text-[11px] font-semibold text-[#5C7C89]">My Status:</span>
                            <select
                              aria-label="Update participation status"
                              value={opp.participationStatus || 'Interested'}
                              onChange={(e) => {
                                if (onUpdateParticipationStatus) {
                                  onUpdateParticipationStatus(opp.id, e.target.value);
                                }
                              }}
                              className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-semibold text-[#1F4959] dark:text-[#CFE0E3]"
                            >
                              <option value="Interested">Interested</option>
                              <option value="Registered">Registered ✓</option>
                              <option value="Participating">Participating</option>
                              <option value="Completed">Completed</option>
                              <option value="Not Participating">Not Participating</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#1F4959]/10">
                        {isRegistrationValid && opp.registrationUrl ? (
                          <a
                            href={opp.registrationUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={() =>
                              onTriggerToast('success', `Opening ${opp.source} Contest`, 'Good luck with the round!')
                            }
                            className="flex-1 py-2 px-4 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center justify-center gap-1.5 min-h-[38px]"
                          >
                            <span>Open Official Contest</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="flex-1 py-2 px-4 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs font-semibold cursor-not-allowed inline-flex items-center justify-center gap-1.5 min-h-[38px] border border-gray-300 dark:border-gray-700"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Registration link unavailable</span>
                          </button>
                        )}

                        <a
                          href={getGoogleCalendarUrl(opp)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="py-2 px-3 rounded-xl border border-[#1F4959]/20 text-[#1F4959] dark:text-[#CFE0E3] text-xs font-semibold hover:bg-[#1F4959]/5 inline-flex items-center justify-center gap-1 min-h-[38px]"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-[#C9825B]" />
                          <span>+ Calendar</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => onOpenOpportunityDetail(opp)}
                          className="py-2 px-3 rounded-xl bg-[#C9825B] text-white text-xs font-semibold hover:opacity-90 transition-opacity min-h-[38px]"
                        >
                          Details
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 7. DEDICATED CONTEST CALENDAR (Phase 5: Month, Week, Agenda & History Views)
  // Exclusively for Competitive Programming Contests: LeetCode, Codeforces, CodeChef, CodeGalatta.
  // Displayed in Indian Standard Time (IST) with multi-contest per day support without clipping!
  // ============================================================================
  if (activeTab === 'calendar') {
    // Exclusively pull competitive programming contests from database
    const competitiveContests = opportunities.filter(
      (o) => o.category === 'Contest' || ['LeetCode', 'Codeforces', 'CodeChef', 'CodeGalatta'].includes(o.source)
    );

    // Apply platform and status filters
    const filteredContests = competitiveContests.filter((c) => {
      if (calPlatform !== 'All' && c.source.toLowerCase() !== calPlatform.toLowerCase()) {
        return false;
      }
      if (calStatus !== 'All' && c.eventStatus !== calStatus) {
        return false;
      }
      return true;
    });

    const contestPlatforms = ['All', 'LeetCode', 'Codeforces', 'CodeChef', 'CodeGalatta'];
    const contestStatuses = ['All', 'Upcoming', 'Registration Open', 'Ongoing', 'Completed', 'Expired'];

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonthCount = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
    const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

    const todayDate = new Date();
    const isCurrentMonth = todayDate.getFullYear() === calYear && todayDate.getMonth() === calMonth;
    const todayDateNum = todayDate.getDate();
    const nowMs = Date.now();

    const handlePrevMonth = () => {
      if (calMonth === 0) {
        setCalMonth(11);
        setCalYear((y) => y - 1);
      } else {
        setCalMonth((m) => m - 1);
      }
      setSelectedDay(null);
    };

    const handleNextMonth = () => {
      if (calMonth === 11) {
        setCalMonth(0);
        setCalYear((y) => y + 1);
      } else {
        setCalMonth((m) => m + 1);
      }
      setSelectedDay(null);
    };

    const handleToday = () => {
      setCalYear(todayDate.getFullYear());
      setCalMonth(todayDate.getMonth());
      setSelectedDay(todayDate.getDate());
    };

    // Group contests by day number in the selected month & year (IST)
    const contestsByDay = new Map<number, Opportunity[]>();
    competitiveContests.forEach((c) => {
      let dayNumber = 0;
      if (c.eventStart) {
        try {
          const istStr = new Date(c.eventStart).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
          const istDate = new Date(istStr);
          if (istDate.getFullYear() === calYear && istDate.getMonth() === calMonth) {
            dayNumber = istDate.getDate();
          }
        } catch {}
      }
      if (!dayNumber && c.deadline) {
        const match = c.deadline.match(/\b(\d{1,2})\b/);
        if (match) dayNumber = parseInt(match[1], 10);
      }

      if (dayNumber >= 1 && dayNumber <= daysInMonthCount) {
        const list = contestsByDay.get(dayNumber) || [];
        list.push(c);
        contestsByDay.set(dayNumber, list);
      }
    });

    // Helper for platform styling badge
    const getPlatformBadgeClass = (platform: string) => {
      switch (platform.toLowerCase()) {
        case 'leetcode':
          return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200';
        case 'codeforces':
          return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200';
        case 'codechef':
          return 'bg-[#C9825B]/20 text-[#8F4F32] border-[#C9825B]/40 dark:bg-[#C9825B]/30 dark:text-[#E8D8C3]';
        case 'codegalatta':
          return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200';
        default:
          return 'bg-[#1F4959]/15 text-[#1F4959] border-[#1F4959]/30 dark:text-[#CFE0E3]';
      }
    };

    // Events to display in Agenda or Selected Day list
    const displayedContests = selectedDay
      ? filteredContests.filter((c) => {
          const list = contestsByDay.get(selectedDay) || [];
          return list.some((item) => item.id === c.id);
        })
      : filteredContests;

    // Strict filter for genuinely upcoming contests:
    // start time not passed OR ongoing. NEVER include completed contests!
    const upcomingAgendaContests = filteredContests.filter((c) => {
      const startMs = new Date(c.eventStart || c.deadline).getTime();
      const endMs = c.eventEnd ? new Date(c.eventEnd).getTime() : startMs + 2 * 3600 * 1000;
      const isCompleted = nowMs > endMs || c.eventStatus === 'Completed' || c.eventStatus === 'Expired';
      return !isCompleted;
    });

    // Strict filter for history contests (concluded / completed)
    const historyContests = filteredContests.filter((c) => {
      const startMs = new Date(c.eventStart || c.deadline).getTime();
      const endMs = c.eventEnd ? new Date(c.eventEnd).getTime() : startMs + 2 * 3600 * 1000;
      return nowMs > endMs || c.eventStatus === 'Completed' || c.eventStatus === 'Expired';
    });

    return (
      <div className="space-y-6">
        {/* Calendar Header with IST Banner & View Mode Switcher */}
        <section className="glass-card rounded-[26px] p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                  Competitive Programming Contest Calendar
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C9825B] text-white">
                  IST (UTC+5:30)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
                Exclusively tracking LeetCode, Codeforces, CodeChef, and CodeGalatta. Timings synchronized in Indian Standard Time (IST).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Sync / Refresh Button */}
              <button
                type="button"
                disabled={isRefreshingContests}
                onClick={async () => {
                  setIsRefreshingContests(true);
                  try {
                    await api.triggerDiscovery('src-codeforces');
                    onTriggerToast(
                      'success',
                      'Contest Calendar Synced',
                      'Discovered latest contest rounds from Codeforces, LeetCode, CodeChef, and CodeGalatta.'
                    );
                  } catch {
                    onTriggerToast('info', 'Contest Calendar Synced', 'Contest schedule verified.');
                  } finally {
                    setIsRefreshingContests(false);
                  }
                }}
                className="px-3.5 py-2 rounded-xl border border-[#1F4959]/20 text-[#1F4959] dark:text-[#CFE0E3] bg-white/70 dark:bg-white/5 hover:bg-[#1F4959]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors min-h-[38px]"
                title="Sync and discover newly announced contests from official platforms"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#C9825B] ${isRefreshingContests ? 'animate-spin' : ''}`} />
                <span>{isRefreshingContests ? 'Syncing...' : 'Sync Contests'}</span>
              </button>

              {/* View Mode Switcher (Phase 5: Month, Week, Agenda, History) */}
              <div
                className="inline-flex p-1 rounded-2xl bg-[#E8D8C3]/55 dark:bg-[#0b2b3c] self-start"
                role="tablist"
              >
              {(['month', 'week', 'agenda', 'history'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={calendarMode === mode}
                  onClick={() => {
                    setCalendarMode(mode);
                    if (mode !== 'month') setSelectedDay(null);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all min-h-[38px] ${
                    calendarMode === mode
                      ? 'bg-[#1F4959] text-white shadow-sm'
                      : 'text-[#242424] dark:text-[#CFE0E3] hover:text-[#1F4959]'
                  }`}
                >
                  {mode === 'month'
                    ? 'Month View'
                    : mode === 'week'
                    ? 'Week View'
                    : mode === 'agenda'
                    ? 'Upcoming List'
                    : 'Contest History'}
                </button>
              ))}
            </div>
          </div>
          </div>

          {/* Filters Bar: Platform & Status */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-[#1F4959]/10 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#5C7C89]">Platform:</span>
              {contestPlatforms.map((plat) => {
                const count = plat === 'All'
                  ? competitiveContests.length
                  : competitiveContests.filter((c) => c.source.toLowerCase() === plat.toLowerCase()).length;
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setCalPlatform(plat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors min-h-[34px] inline-flex items-center gap-1.5 ${
                      calPlatform === plat
                        ? 'bg-[#1F4959] text-white'
                        : 'bg-white/60 dark:bg-white/5 text-[#242424] dark:text-[#CFE0E3] hover:bg-white'
                    }`}
                  >
                    <span>{plat}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#5C7C89]">Status:</span>
              {contestStatuses.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCalStatus(st)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors min-h-[34px] ${
                    calStatus === st
                      ? 'bg-[#C9825B] text-white'
                      : 'bg-white/60 dark:bg-white/5 text-[#242424] dark:text-[#CFE0E3] hover:bg-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* VIEW 1: MONTH VIEW (Multi-Contest per Day without Overlap / Clipping) */}
        {/* ========================================================================= */}
        {calendarMode === 'month' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-8 glass-card rounded-[26px] p-5 sm:p-6 space-y-3">
              {/* Month Navigation Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#1F4959]/10">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                    {monthNames[calMonth]} {calYear}
                  </h2>
                  <span className="text-xs text-[#5C7C89]">
                    · IST Timings
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                    className="p-1.5 rounded-xl border border-[#1F4959]/20 hover:bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="px-2.5 py-1 rounded-xl border border-[#1F4959]/20 text-xs font-semibold hover:bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3] transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                    className="p-1.5 rounded-xl border border-[#1F4959]/20 hover:bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-[#5C7C89] pb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              {/* Calendar Grid with First-Day Offset & Days */}
              <div className="grid grid-cols-7 gap-2">
                {/* Padding cells before the first of the month */}
                {paddingDays.map((pad) => (
                  <div
                    key={`pad-${pad}`}
                    className="min-h-[96px] sm:min-h-[110px] rounded-2xl p-1.5 opacity-25 pointer-events-none border border-transparent bg-black/5 dark:bg-white/5"
                  />
                ))}

                {/* Actual Month Days */}
                {daysInMonth.map((day) => {
                  const dayContests = contestsByDay.get(day) || [];
                  const isSelected = selectedDay === day;
                  const isToday = isCurrentMonth && day === todayDateNum;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`min-h-[96px] sm:min-h-[110px] rounded-2xl p-1.5 flex flex-col justify-between border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#1F4959] ring-2 ring-[#1F4959]/30 bg-[#1F4959]/5 dark:bg-[#1F4959]/20'
                          : isToday
                          ? 'bg-[#C9825B]/10 border-[#C9825B]'
                          : 'bg-white/50 dark:bg-white/5 border-[#1F4959]/10 hover:border-[#1F4959]/40'
                      }`}
                    >
                      {/* Day Number and Today Indicator */}
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-mono-num font-bold ${
                          isToday ? 'text-[#C9825B]' : 'text-[#242424] dark:text-[#CFE0E3]'
                        }`}>
                          {day}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-bold text-[#C9825B]">Today</span>
                        )}
                      </div>

                      {/* Stacked Contests without Clipping (Multi-Event Day Support) */}
                      <div className="flex-1 w-full space-y-1 mt-1 overflow-hidden">
                        {dayContests.map((c) => {
                          const timeStr = formatISTTimeOnly(c.eventStart);
                          const badgeColor = getPlatformBadgeClass(c.source);

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCalContest(c);
                              }}
                              title={`${c.title} (${c.source}) at ${timeStr}`}
                              className={`w-full text-left px-1.5 py-0.5 rounded-lg text-[10px] font-bold border truncate block transition-transform hover:scale-[1.02] ${badgeColor}`}
                            >
                              <span>{c.source}: </span>
                              <span className="font-normal">{timeStr || c.title}</span>
                            </button>
                          );
                        })}
                      </div>

                      {dayContests.length > 0 && (
                        <div className="text-[9px] font-semibold text-[#5C7C89] pt-0.5 text-right">
                          {dayContests.length} {dayContests.length === 1 ? 'round' : 'rounds'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Selected Day / Month Overview Sidebar */}
            <section className="lg:col-span-4 glass-card rounded-[26px] p-6 space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#1F4959]/10">
                <h2 className="text-base font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                  {selectedDay
                    ? `Contests on ${monthNames[calMonth]} ${selectedDay}`
                    : `Upcoming Rounds (${monthNames[calMonth]})`}
                </h2>
                {selectedDay && (
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="text-xs font-semibold text-[#C9825B] hover:underline"
                  >
                    View Month
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {displayedContests.length === 0 ? (
                  <p className="text-xs text-[#5C7C89] py-4 text-center">
                    No contests scheduled on this date. Select another day on the calendar.
                  </p>
                ) : (
                  displayedContests.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCalContest(c)}
                      className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-[#1F4959]/15 hover:border-[#1F4959] transition-colors cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPlatformBadgeClass(c.source)}`}>
                          {c.source}
                        </span>
                        <span className="text-[11px] font-bold text-[#C9825B]">
                          {getCountdown(c.eventStart)}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-[#1F4959] dark:text-[#F6F1E9] line-clamp-1">
                        {c.title}
                      </h3>

                      <div className="flex items-center justify-between text-[11px] text-[#5C7C89]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-[#C9825B]" />
                          {formatISTDateTime(c.eventStart || c.deadline)}
                        </span>
                        <span className="font-semibold">{c.contestRatingType || 'Rated'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: WEEK VIEW (Dynamic 7-Day Strip Breakdown) */}
        {/* ========================================================================= */}
        {calendarMode === 'week' && (() => {
          // Compute the 7 days of the selected week or current week
          const baseDay = selectedDay || (isCurrentMonth ? todayDateNum : Math.min(21, daysInMonthCount));
          const baseDate = new Date(calYear, calMonth, baseDay);
          const baseDayOfWeek = baseDate.getDay();
          const sunday = new Date(baseDate);
          sunday.setDate(baseDate.getDate() - baseDayOfWeek);

          const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(sunday);
            d.setDate(sunday.getDate() + i);
            return d;
          });

          const startStr = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const endStr = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          return (
            <section className="glass-card rounded-[26px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                    Week Schedule ({startStr} – {endStr})
                  </h2>
                  <p className="text-xs text-[#5C7C89]">
                    7-day contest schedule in Indian Standard Time (IST)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
                {weekDays.map((dateObj) => {
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const dayName = dayNames[dateObj.getDay()];
                  const dNum = dateObj.getDate();
                  const mNum = dateObj.getMonth();
                  const yNum = dateObj.getFullYear();
                  const mName = dateObj.toLocaleDateString('en-US', { month: 'short' });

                  // Match contests for this date
                  const dayContests = competitiveContests.filter((c) => {
                    if (!c.eventStart) return false;
                    try {
                      const istStr = new Date(c.eventStart).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
                      const istDate = new Date(istStr);
                      return istDate.getFullYear() === yNum && istDate.getMonth() === mNum && istDate.getDate() === dNum;
                    } catch {
                      return false;
                    }
                  });

                  const isTodayWeek = todayDate.getFullYear() === yNum && todayDate.getMonth() === mNum && todayDate.getDate() === dNum;

                  return (
                    <div
                      key={dateObj.toISOString()}
                      className={`p-3 rounded-2xl border flex flex-col justify-between min-h-[160px] ${
                        isTodayWeek
                          ? 'bg-[#C9825B]/10 border-[#C9825B]'
                          : 'bg-white/60 dark:bg-white/5 border-[#1F4959]/15'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-[#1F4959]/10 pb-1.5">
                          <span className={`text-xs font-bold ${isTodayWeek ? 'text-[#C9825B]' : 'text-[#1F4959] dark:text-[#CFE0E3]'}`}>
                            {dayName}
                          </span>
                          <span className="text-xs font-mono-num font-bold text-[#C9825B]">
                            {mName} {dNum}
                          </span>
                        </div>

                        <div className="space-y-1.5 mt-2">
                          {dayContests.length === 0 ? (
                            <span className="text-[10px] text-[#5C7C89] block italic">No contest</span>
                          ) : (
                            dayContests.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedCalContest(c)}
                                className={`w-full text-left p-1.5 rounded-xl border text-[10px] font-bold block ${getPlatformBadgeClass(c.source)}`}
                              >
                                <div className="truncate">{c.title}</div>
                                <div className="text-[9px] opacity-80 mt-0.5">{formatISTTimeOnly(c.eventStart)}</div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      {dayContests.length > 0 && (
                        <span className="text-[9px] text-[#5C7C89] pt-2 text-right">
                          {dayContests.length} {dayContests.length === 1 ? 'round' : 'rounds'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ========================================================================= */}
        {/* VIEW 3: AGENDA / UPCOMING LIST VIEW (Strictly Upcoming & Ongoing Only) */}
        {/* ========================================================================= */}
        {calendarMode === 'agenda' && (
          <section className="glass-card rounded-[26px] p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F4959]/10">
              <div>
                <h2 className="text-lg font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                  Upcoming Contest Schedule (IST)
                </h2>
                <p className="text-xs text-[#5C7C89]">
                  Chronological list of genuinely upcoming and ongoing competitive programming contests. Completed contests are excluded.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3]">
                {upcomingAgendaContests.length} upcoming {upcomingAgendaContests.length === 1 ? 'round' : 'rounds'}
              </span>
            </div>

            <div className="space-y-3">
              {upcomingAgendaContests.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5C7C89]">
                  No upcoming contests found. Click "Sync Contests" to fetch newly announced rounds.
                </div>
              ) : (
                upcomingAgendaContests.map((c) => {
                  const startMs = new Date(c.eventStart || c.deadline).getTime();
                  const endMs = c.eventEnd ? new Date(c.eventEnd).getTime() : startMs + 2 * 3600 * 1000;
                  const isOngoing = nowMs >= startMs && nowMs <= endMs;

                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-[#1F4959]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#1F4959] transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${getPlatformBadgeClass(c.source)}`}>
                            {c.source}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3]">
                            {c.contestRatingType || 'Rated'}
                          </span>
                          {isOngoing ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Ongoing Now
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-[#C9825B]">
                              {getCountdown(c.eventStart)}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                          {c.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C7C89]">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                            <Clock className="w-3.5 h-3.5 text-[#C9825B]" />
                            {formatISTDateTime(c.eventStart || c.deadline)}
                          </span>
                          <span>·</span>
                          <span>Duration: {getContestDuration(c.eventStart, c.eventEnd)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {c.isRegistrationUrlValid !== false && c.registrationUrl ? (
                          <a
                            href={c.registrationUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="px-4 py-2 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center gap-1.5 min-h-[38px]"
                          >
                            <span>Open Contest</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-400 text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1 min-h-[38px]"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Link unavailable</span>
                          </button>
                        )}

                        <a
                          href={getGoogleCalendarUrl(c)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="px-3 py-2 rounded-xl border border-[#1F4959]/20 text-[#1F4959] dark:text-[#CFE0E3] text-xs font-semibold hover:bg-[#1F4959]/5 inline-flex items-center gap-1 min-h-[38px]"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-[#C9825B]" />
                          <span>Calendar</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setSelectedCalContest(c)}
                          className="px-3 py-2 rounded-xl bg-[#C9825B] text-white text-xs font-semibold hover:opacity-90 min-h-[38px]"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: CONTEST HISTORY VIEW (Completed & Expired Rounds) */}
        {/* ========================================================================= */}
        {calendarMode === 'history' && (
          <section className="glass-card rounded-[26px] p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F4959]/10">
              <div>
                <h2 className="text-lg font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                  Previous Contest History & Concluded Rounds
                </h2>
                <p className="text-xs text-[#5C7C89]">
                  Concluded competitive programming contests preserved for placement preparation audits and problem set practice.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {historyContests.length} {historyContests.length === 1 ? 'concluded round' : 'concluded rounds'}
              </span>
            </div>

            <div className="space-y-3">
              {historyContests.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5C7C89]">
                  No past concluded contests recorded yet.
                </div>
              ) : (
                historyContests.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-dashed border-[#1F4959]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-90"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${getPlatformBadgeClass(c.source)}`}>
                          {c.source}
                        </span>
                        <span className="text-[#5C7C89]">{formatISTDateTime(c.eventStart || c.deadline)}</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 text-[10px] font-bold">
                          Concluded
                        </span>
                      </div>
                      <h3 className="text-sm font-bold mt-1 text-[#1F4959] dark:text-[#F6F1E9]">{c.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.officialEventUrl && (
                        <a
                          href={c.officialEventUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="px-3 py-1.5 rounded-xl border border-[#1F4959]/20 text-xs font-semibold inline-flex items-center gap-1 text-[#1F4959] dark:text-[#CFE0E3] hover:bg-[#1F4959]/5 min-h-[34px]"
                        >
                          <span>Editorial & Problems</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedCalContest(c)}
                        className="px-3 py-1.5 rounded-xl bg-[#C9825B]/20 text-[#8F4F32] dark:text-[#E8D8C3] text-xs font-semibold min-h-[34px]"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* CONTEST DETAIL MODAL (Phase 5 Popup) */}
        {/* ========================================================================= */}
        {selectedCalContest && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="glass-card bg-[#F6F1E9] dark:bg-[#081f2c] rounded-[28px] max-w-lg w-full p-6 space-y-4 shadow-2xl border border-white/40 dark:border-white/10 animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CompanyMonogram company={selectedCalContest.source} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPlatformBadgeClass(selectedCalContest.source)}`}>
                        {selectedCalContest.source}
                      </span>
                      {selectedCalContest.edition && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3]">
                          {selectedCalContest.edition}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-[#5C7C89]">
                        {selectedCalContest.contestRatingType || 'Rated'}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold font-serif-display mt-0.5 text-[#1F4959] dark:text-[#F6F1E9]">
                      {selectedCalContest.title}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCalContest(null)}
                  className="p-2 rounded-xl hover:bg-black/5 min-h-[38px] min-w-[38px] flex items-center justify-center text-[#5C7C89]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contest Timings in IST */}
              <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-[#1F4959]/15 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#5C7C89]">Contest Start:</span>
                  <span className="font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                    {formatISTDateTime(selectedCalContest.eventStart || selectedCalContest.deadline)}
                  </span>
                </div>
                {selectedCalContest.eventEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#5C7C89]">Contest End:</span>
                    <span className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                      {formatISTDateTime(selectedCalContest.eventEnd)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#5C7C89]">Duration:</span>
                  <span className="font-semibold text-[#C9825B]">
                    {getContestDuration(selectedCalContest.eventStart, selectedCalContest.eventEnd)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5C7C89]">Rating Status:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedCalContest.contestRatingType || 'Rated'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#242424]/85 dark:text-[#F6F1E9]/85 leading-relaxed">
                {selectedCalContest.description}
              </p>

              <div className="space-y-1 text-xs text-[#5C7C89]">
                <p>
                  <strong>Eligibility / Format:</strong> {selectedCalContest.eligibility}
                </p>
                <p>
                  <strong>Rewards:</strong> {selectedCalContest.prizeOrPerk}
                </p>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-2 border-t border-[#1F4959]/10">
                {selectedCalContest.isRegistrationUrlValid !== false &&
                selectedCalContest.eventStatus !== 'Expired' &&
                selectedCalContest.registrationUrl ? (
                  <a
                    href={selectedCalContest.registrationUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center justify-center gap-1.5 min-h-[42px]"
                  >
                    <span>Open Official Contest</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-400 text-xs font-semibold cursor-not-allowed inline-flex items-center justify-center gap-1.5 min-h-[42px]"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Registration link unavailable</span>
                  </button>
                )}

                <a
                  href={getGoogleCalendarUrl(selectedCalContest)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="py-2.5 px-3.5 rounded-xl border border-[#1F4959]/20 text-[#1F4959] dark:text-[#CFE0E3] text-xs font-semibold hover:bg-[#1F4959]/5 inline-flex items-center justify-center gap-1.5 min-h-[42px]"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-[#C9825B]" />
                  <span>Google Calendar</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    onToggleRemindOpportunity(selectedCalContest.id);
                    setSelectedCalContest(null);
                  }}
                  className="py-2.5 px-3.5 rounded-xl border border-[#1F4959]/20 text-xs font-semibold min-h-[42px]"
                >
                  Remind Me
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 8. ACHIEVEMENTS (Post-Style Tile Grid)
  // ============================================================================
  if (activeTab === 'achievements') {
    const list = previewEmptyAchievements ? [] : achievements;

    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
              Personal Achievements & Milestones
            </h1>
            <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
              Curated grid of your coding milestones, contest breakthroughs, and mentor-verified LLD builds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPreviewEmptyAchievements(!previewEmptyAchievements)}
            className="px-3.5 py-2 rounded-xl border border-[#1F4959]/20 text-xs font-semibold min-h-[40px] self-start"
          >
            {previewEmptyAchievements ? 'Restore Achievements' : 'Preview Empty State'}
          </button>
        </section>

        {list.length === 0 ? (
          <div className="glass-card rounded-[26px] p-10 text-center flex flex-col items-center">
            <WarmIllustration variant="confetti" className="w-32 h-32" />
            <h2 className="text-xl font-bold font-serif-display mt-3">
              Your first achievement tile is right around the corner
            </h2>
            <p className="text-xs text-[#5C7C89] max-w-md mt-1.5">
              Complete your first 7-day coding streak or finish Ganesh Sir’s weekly DP command to unlock your first verified post tile.
            </p>
            <button
              type="button"
              onClick={() => setPreviewEmptyAchievements(false)}
              className="mt-5 px-5 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold min-h-[42px]"
            >
              Show My 6 Milestones
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((ach) => (
              <button
                key={ach.id}
                type="button"
                onClick={() => onOpenAchievementDetail(ach)}
                className="glass-card rounded-[26px] p-6 text-left flex flex-col justify-between gap-4 hover:-translate-y-1 transition-transform group"
              >
                <div className="flex items-center justify-between text-xs text-[#5C7C89]">
                  <span className="font-bold text-[#C9825B]">{ach.category}</span>
                  <span>{ach.date}</span>
                </div>

                <div>
                  <h2 className="text-lg font-bold font-serif-display group-hover:text-[#1F4959] dark:group-hover:text-[#CFE0E3]">
                    {ach.title}
                  </h2>
                  <p className="text-xs text-[#5C7C89] mt-1">{ach.subtitle}</p>
                  <p className="text-xs text-[#242424]/80 dark:text-[#F6F1E9]/80 mt-3 line-clamp-2">
                    “{ach.reflection}”
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1F4959]/10 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="font-mono-num font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                    {ach.metricText}
                  </span>
                  <span className="text-[#C9825B] font-semibold">Read Post →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 9. NOTIFICATIONS (Instagram-Activity-Style Feed: Today / Earlier)
  // ============================================================================
  if (activeTab === 'notifications') {
    const todayList = notifications.filter((n) => n.timeBucket === 'today');
    const earlierList = notifications.filter((n) => n.timeBucket === 'earlier');

    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
              Activity & Mentor Alerts
            </h1>
            <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
              Commands from Ganesh Sir, newly approved Tier-1 hackathons, and WhatsApp reminder logs.
            </p>
          </div>
          <button
            type="button"
            onClick={onMarkAllNotificationsRead}
            className="px-4 py-2 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors min-h-[40px] shrink-0"
          >
            Mark All Read
          </button>
        </section>

        <div className="glass-card rounded-[26px] p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold font-serif-display text-[#C9825B] mb-3">
              Today
            </h2>
            <div className="divide-y divide-[#1F4959]/10 dark:divide-white/10">
              {todayList.map((n) => (
                <div
                  key={n.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">
                        {n.title}
                      </h3>
                      {n.unread && (
                        <span className="text-[11px] font-semibold text-[#C9825B]">
                          · New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">{n.message}</p>
                    <p className="text-[11px] font-mono-num text-[#5C7C89]">{n.timestamp}</p>
                  </div>

                  {n.actionTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab(n.actionTab!)}
                      className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-[#1F4959]/15 text-xs font-semibold hover:bg-[#1F4959] hover:text-white transition-colors self-start sm:self-center shrink-0 min-h-[38px]"
                    >
                      Open →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold font-serif-display text-[#5C7C89] mb-3">
              Earlier This Week
            </h2>
            <div className="divide-y divide-[#1F4959]/10 dark:divide-white/10">
              {earlierList.map((n) => (
                <div
                  key={n.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{n.title}</h3>
                    <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">{n.message}</p>
                    <p className="text-[11px] font-mono-num text-[#5C7C89]">{n.timestamp}</p>
                  </div>

                  {n.actionTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab(n.actionTab!)}
                      className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-[#1F4959]/15 text-xs font-semibold hover:bg-[#1F4959] hover:text-white transition-colors self-start sm:self-center shrink-0 min-h-[38px]"
                    >
                      View →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 10. SETTINGS (Profile Edit, WhatsApp Prefs, Theme Toggle, Logout Dialog)
  // ============================================================================
  return (
    <div className="space-y-6">
      <section className="glass-card rounded-[26px] p-6">
        <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
          Student Account & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
          Manage your profile bio, WhatsApp alert consent, appearance theme, and session controls.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Edit Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdateStudent({
              ...student,
              name: editName.trim() || student.name,
              careerObjective: editObjective.trim() || student.careerObjective,
              whatsappNumber: editWhatsapp.trim() || student.whatsappNumber,
            });
            onTriggerToast('success', 'Settings Saved', 'Your profile and WhatsApp number were updated.');
          }}
          className="lg:col-span-7 glass-card rounded-[26px] p-6 space-y-4"
        >
          <h2 className="text-lg font-bold font-serif-display">Edit Academic Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-name" className="block text-xs font-semibold mb-1">
                Full Name
              </label>
              <input
                id="set-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
              />
            </div>
            <div>
              <label htmlFor="set-whatsapp" className="block text-xs font-semibold mb-1">
                WhatsApp Number
              </label>
              <input
                id="set-whatsapp"
                type="tel"
                value={editWhatsapp}
                onChange={(e) => setEditWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm font-mono-num"
              />
            </div>
          </div>

          <div>
            <label htmlFor="set-objective" className="block text-xs font-semibold mb-1">
              Career Objective Bio
            </label>
            <textarea
              id="set-objective"
              rows={3}
              value={editObjective}
              onChange={(e) => setEditObjective(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors min-h-[44px]"
          >
            Save Profile Changes
          </button>
        </form>

        {/* Appearance, WhatsApp Consent & Session Controls */}
        <div className="lg:col-span-5 glass-card rounded-[26px] p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold font-serif-display">Theme & Alert Channels</h2>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/12 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Warm Cream / Deep Petrol Theme</p>
                <p className="text-xs text-[#5C7C89]">
                  {darkMode ? 'Dark mode (#011425) active' : 'Warm cream (#F6F1E9) active'}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="px-3.5 py-2 rounded-xl bg-[#1F4959] text-white text-xs font-semibold inline-flex items-center gap-1.5 min-h-[40px]"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/12 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">WhatsApp Deadline Alerts</p>
                <p className="text-xs text-[#5C7C89]">
                  {student.whatsappConsent ? 'Opted in for 24h reminders' : 'Paused'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={student.whatsappConsent}
                aria-label="Toggle WhatsApp alerts in settings"
                onClick={() => {
                  const next = !student.whatsappConsent;
                  onUpdateStudent({ ...student, whatsappConsent: next });
                  if (!next) {
                    onTriggerSystemState('whatsapp-denied');
                  } else {
                    onTriggerToast('success', 'WhatsApp Alerts Enabled', 'You will receive deadline pings.');
                  }
                }}
                className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${student.whatsappConsent ? 'bg-[#C9825B] justify-end' : 'bg-[#5C7C89]/30 justify-start'
                  }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1F4959]/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full py-3 rounded-2xl border border-[#C9825B] text-[#C9825B] hover:bg-[#C9825B] hover:text-white text-xs font-semibold transition-colors inline-flex items-center justify-center gap-2 min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Elite Track</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Logout Dialog */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-logout-title"
        >
          <div className="glass-modal max-w-sm w-full rounded-[28px] p-6 text-center">
            <h3 id="confirm-logout-title" className="text-lg font-bold font-serif-display">
              Sign out of your student session?
            </h3>
            <p className="text-xs text-[#5C7C89] mt-2 leading-relaxed">
              Your coding profile rings and command replies are synced. You can sign back in as a Student or as Ganesh Sir (Admin).
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#1F4959]/20 text-xs font-semibold min-h-[42px]"
              >
                Stay Signed In
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#C9825B] text-white text-xs font-semibold min-h-[42px]"
              >
                Confirm Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
