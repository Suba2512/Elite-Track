import React, { useState } from 'react';
import {
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  Code2,
  Edit3,
  ExternalLink,
  Flame,
  GitBranch,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Terminal,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  AchievementItem,
  CodingPlatformProfile,
  MentorCommand,
  Opportunity,
  StudentRecord,
  StudentTab,
  SystemStateScreen,
} from '../types';
import {
  calculateProgressPercentage,
  calculateTotalSolvedAcrossPlatforms,
} from '../utils/logic';
import { CompanyMonogram, WarmIllustration } from './Illustrations';

interface StudentPrimaryViewsProps {
  activeTab: 'home' | 'profile' | 'coding-profiles' | 'analytics';
  student: StudentRecord;
  onUpdateStudent: (updated: StudentRecord) => void;
  commands: MentorCommand[];
  opportunities: Opportunity[];
  achievements: AchievementItem[];
  onNavigateTab: (tab: StudentTab) => void;
  onOpenCommandReply: (cmd: MentorCommand) => void;
  onOpenOpportunityDetail: (opp: Opportunity) => void;
  onOpenAchievementDetail: (ach: AchievementItem) => void;
  onTriggerToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  onTriggerSystemState: (state: SystemStateScreen) => void;
  isSkeletonMode: boolean;
}

export const StudentPrimaryViews: React.FC<StudentPrimaryViewsProps> = ({
  activeTab,
  student,
  onUpdateStudent,
  commands,
  opportunities,
  achievements,
  onNavigateTab,
  onOpenCommandReply,
  onOpenOpportunityDetail,
  onOpenAchievementDetail,
  onTriggerToast,
  onTriggerSystemState,
  isSkeletonMode,
}) => {
  // Story modal state when tapping a platform story ring
  const [activeStoryPlatform, setActiveStoryPlatform] = useState<CodingPlatformProfile | null>(
    null
  );

  // Add Other Platform Bottom Sheet state
  const [showAddPlatformSheet, setShowAddPlatformSheet] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformHandle, setNewPlatformHandle] = useState('');
  const [newPlatformCount, setNewPlatformCount] = useState('');

  // Edit Platform URL inline state
  const [editingPlatformId, setEditingPlatformId] = useState<string | null>(null);
  const [editingUrlValue, setEditingUrlValue] = useState('');
  const [syncingPlatformId, setSyncingPlatformId] = useState<string | null>(null);

  // Analytics date range state
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '6m'>('7d');

  // Empty state preview toggle for Coding Profiles
  const [previewEmptyProfiles, setPreviewEmptyProfiles] = useState(false);

  const weeklyPct = calculateProgressPercentage(
    student.weeklyCurrentSolved,
    student.weeklyTargetSolved
  );
  const totalSolved = calculateTotalSolvedAcrossPlatforms(student.platforms);
  const nowMs = Date.now();
  const approvedOpportunities = opportunities.filter((o) => {
    if (o.pipelineStage !== 'Approved') return false;
    if (o.eventStatus === 'Expired' || o.eventStatus === 'Completed' || o.eventStatus === 'Cancelled') return false;
    if (o.daysLeft !== undefined && o.daysLeft <= 0 && o.eventStatus !== 'Ongoing') return false;
    if (o.deadline && !isNaN(new Date(o.deadline).getTime()) && new Date(o.deadline).getTime() < nowMs && o.daysLeft === 0) return false;
    return true;
  });
  const activeCommands = commands.filter((c) => c.myStatus !== 'Done');

  if (isSkeletonMode) {
    return (
      <div className="space-y-6" aria-label="Loading dashboard skeleton">
        <div className="glass-card rounded-[24px] p-6 space-y-4">
          <div className="h-7 w-64 rounded-xl skeleton-shimmer" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="w-20 h-24 rounded-2xl skeleton-shimmer shrink-0" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-[24px] skeleton-shimmer" />
          <div className="h-64 rounded-[24px] skeleton-shimmer lg:col-span-2" />
        </div>
      </div>
    );
  }

  const handleRefreshPlatform = (plat: CodingPlatformProfile) => {
    setSyncingPlatformId(plat.id);
    setTimeout(() => {
      const updatedPlatforms = student.platforms.map((p) =>
        p.id === plat.id
          ? { ...p, solvedCount: p.solvedCount + 1, lastSynced: 'Just now' }
          : p
      );
      onUpdateStudent({
        ...student,
        platforms: updatedPlatforms,
        totalSolved: calculateTotalSolvedAcrossPlatforms(updatedPlatforms),
      });
      setSyncingPlatformId(null);
      onTriggerToast(
        'success',
        `${plat.platform} Synced`,
        `Fetched latest count (${plat.solvedCount + 1} solved).`
      );
    }, 300);
  };

  const handleAddOtherPlatformSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(newPlatformCount, 10);
    if (!newPlatformName.trim() || Number.isNaN(count) || count < 0) {
      onTriggerToast('error', 'Missing Fields', 'Enter platform name and valid solved count.');
      return;
    }
    const created: CodingPlatformProfile = {
      id: `plat-${Date.now()}`,
      platform: newPlatformName.trim(),
      handle: newPlatformHandle.trim() || student.rollNo.toLowerCase(),
      url: `https://${newPlatformName.trim().toLowerCase().replace(/\s+/g, '')}.com`,
      solvedCount: count,
      secondaryLabel: 'Manual Track',
      secondaryValue: `${count} Problems`,
      verificationType: 'Self-reported',
      lastSynced: 'Just now',
      syncStatus: 'synced',
    };
    const nextPlatforms = [...student.platforms, created];
    onUpdateStudent({
      ...student,
      platforms: nextPlatforms,
      totalSolved: calculateTotalSolvedAcrossPlatforms(nextPlatforms),
    });
    setNewPlatformName('');
    setNewPlatformHandle('');
    setNewPlatformCount('');
    setShowAddPlatformSheet(false);
    onTriggerToast(
      'success',
      `Added ${created.platform}`,
      'Saved as a self-reported coding platform.'
    );
  };

  // ============================================================================
  // 1. STUDENT HOME DASHBOARD
  // ============================================================================
  if (activeTab === 'home') {
    const ringRadius = 46;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (weeklyPct / 100) * ringCircumference;

    return (
      <div className="space-y-6">
        {/* Top Greeting & Instagram Story-Rings Strip */}
        <section className="glass-card rounded-[26px] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1F4959]/10 dark:border-white/10">
            <div>
              <p className="text-xs font-medium text-[#C9825B]">
                Batch of 2026 · Personal Placement Track · {student.rollNo}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9] mt-0.5">
                Good evening, {student.name.split(' ')[0]}
              </h1>
              <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-1">
                Nice, {student.weeklyCurrentSolved} problems solved this week! Your {student.streakDays}-day consistency streak is active.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center">
              <button
                type="button"
                onClick={() => onNavigateTab('coding-profiles')}
                className="px-3.5 py-2 rounded-2xl bg-white/65 dark:bg-white/10 border border-[#1F4959]/15 text-xs font-semibold text-[#1F4959] dark:text-[#CFE0E3] hover:bg-[#1F4959] hover:text-white transition-colors min-h-[42px]"
              >
                Sync All Profiles
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('commands')}
                className="px-4 py-2 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors min-h-[42px]"
              >
                Mentor Commands ({activeCommands.length})
              </button>
            </div>
          </div>

          {/* Instagram-style Coding Platform Story Rings */}
          <div className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#5C7C89] dark:text-[#89A7B3]">
                Coding Profile Story Rings (Tap any ring for snapshot)
              </span>
              <span className="text-xs font-mono-num text-[#1F4959] dark:text-[#CFE0E3] font-semibold">
                {totalSolved} Total Solved
              </span>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-2">
              {student.platforms.map((plat) => (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => setActiveStoryPlatform(plat)}
                  className="group flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
                >
                  <div className="p-[3px] rounded-full story-ring-active group-hover:scale-105 transition-transform">
                    <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-[#F6F1E9] dark:bg-[#011425] p-1 flex flex-col items-center justify-center">
                      <span className="text-sm sm:text-base font-mono-num font-bold text-[#1F4959] dark:text-[#F6F1E9]">
                        {plat.solvedCount}
                      </span>
                      <span className="text-[10px] text-[#5C7C89] dark:text-[#89A7B3] leading-none">
                        solved
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#242424] dark:text-[#F6F1E9]">
                    {plat.platform}
                  </span>
                  <span className="text-[10px] text-[#5C7C89] dark:text-[#89A7B3]">
                    {plat.verificationType === 'Auto-verified' ? 'Verified' : 'Manual'}
                  </span>
                </button>
              ))}

              {/* Add Platform Story Trigger */}
              <button
                type="button"
                onClick={() => {
                  onNavigateTab('coding-profiles');
                  setShowAddPlatformSheet(true);
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-2 border-dashed border-[#5C7C89]/50 flex items-center justify-center group-hover:border-[#C9825B] transition-colors">
                  <Plus className="w-5 h-5 text-[#5C7C89] group-hover:text-[#C9825B]" />
                </div>
                <span className="text-xs font-medium text-[#5C7C89]">Add Platform</span>
                <span className="text-[10px] text-[#5C7C89]/70">Custom</span>
              </button>
            </div>
          </div>
        </section>

        {/* Main 3-Column Bento Grid: 75% Progress Ring + Weekly Mini-Chart + Active Commands */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* 75% Personal Weekly Goal Ring Card */}
          <div className="lg:col-span-4 glass-card rounded-[26px] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                  Weekly Goal Ring
                </h2>
                <span className="text-xs font-mono-num text-[#C9825B] font-semibold">
                  {student.streakDays}d Streak
                </span>
              </div>
              <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] mt-1">
                Personal pace target — never compared with peers
              </p>
            </div>

            <div className="my-6 flex items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 112 112">
                  <circle
                    cx="56"
                    cy="56"
                    r={ringRadius}
                    stroke="currentColor"
                    strokeWidth="9"
                    className="text-[#1F4959]/12 dark:text-white/10"
                    fill="none"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={ringRadius}
                    stroke="url(#warmProgressGrad)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    fill="none"
                  />
                  <defs>
                    <linearGradient id="warmProgressGrad" x1="0" y1="0" x2="112" y2="112" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#C9825B" />
                      <stop offset="0.5" stopColor="#D9A441" />
                      <stop offset="1" stopColor="#1F4959" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold font-mono-num text-[#1F4959] dark:text-[#F6F1E9]">
                    {weeklyPct}%
                  </span>
                  <span className="text-[11px] font-mono-num text-[#5C7C89]">
                    {student.weeklyCurrentSolved}/{student.weeklyTargetSolved} solved
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1F4959]/10 dark:border-white/10 flex items-center justify-between text-xs">
              <span className="text-[#5C7C89]">4 problems left for 100%</span>
              <button
                type="button"
                onClick={() => {
                  const nextSolved = Math.min(
                    student.weeklyTargetSolved,
                    student.weeklyCurrentSolved + 1
                  );
                  onUpdateStudent({
                    ...student,
                    weeklyCurrentSolved: nextSolved,
                    totalSolved: student.totalSolved + 1,
                  });
                  onTriggerToast(
                    'success',
                    'Logged +1 Practice Problem!',
                    `Your weekly progress ring is now at ${calculateProgressPercentage(
                      nextSolved,
                      student.weeklyTargetSolved
                    )}%.`
                  );
                }}
                className="font-semibold text-[#C9825B] hover:underline"
              >
                + Log Today’s Problem
              </button>
            </div>
          </div>

          {/* Active Commands from Ganesh Sir */}
          <div className="lg:col-span-8 glass-card rounded-[26px] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                    Active Commands from Ganesh Sir & HODs
                  </h2>
                  <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                    Update your status or leave a solution note before the cutoff
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('commands')}
                  className="text-xs font-semibold text-[#1F4959] dark:text-[#CFE0E3] hover:underline shrink-0"
                >
                  View all ({commands.length}) →
                </button>
              </div>

              <div className="space-y-3">
                {commands.slice(0, 2).map((cmd) => (
                  <div
                    key={cmd.id}
                    className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/12 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                        <span className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                          {cmd.assignedBy}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Due {cmd.dueDate}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            cmd.myStatus === 'Done'
                              ? 'text-[#2E6F5E] dark:text-[#7CD4B8]'
                              : cmd.myStatus === 'In progress'
                              ? 'text-[#D9A441]'
                              : 'text-[#C9825B]'
                          }`}
                        >
                          Status: {cmd.myStatus}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-[#242424] dark:text-[#F6F1E9]">
                        {cmd.title}
                      </h3>
                      <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] line-clamp-1">
                        {cmd.myComment ? `Your reply: “${cmd.myComment}”` : cmd.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenCommandReply(cmd)}
                      className="px-4 py-2 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors shrink-0 min-h-[40px]"
                    >
                      Reply / Status
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Activity Mini-Chart inside the right column bottom */}
            <div className="mt-5 pt-4 border-t border-[#1F4959]/10 dark:border-white/10">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                  This Week’s Problem & GitHub Commit Rhythm
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('analytics')}
                  className="text-xs text-[#5C7C89] hover:text-[#1F4959] underline"
                >
                  Full Analytics →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-16 pt-2">
                {student.weeklyActivity.map((item) => {
                  const totalDay = item.problems + item.commits;
                  const heightPct = Math.min(100, Math.max(22, totalDay * 14));
                  return (
                    <div key={item.day} className="flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className="w-full max-w-[28px] rounded-t-lg bg-[#1F4959] dark:bg-[#CFE0E3] transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${item.day}: ${item.problems} problems, ${item.commits} commits`}
                      />
                      <span className="text-[10px] font-mono-num text-[#5C7C89]">{item.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Verified Hackathons & Contests Strip (Google, Nvidia, Flipkart, TCS, Zoho) */}
        <section className="glass-card rounded-[26px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                Verified Hackathons & Tier-1 Contests
              </h2>
              <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                Hand-verified by Ganesh Sir from Google, Nvidia, Flipkart, TCS, Zoho, Qualcomm & PayPal
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('opportunities')}
              className="text-xs font-semibold text-[#C9825B] hover:underline shrink-0"
            >
              Explore All ({approvedOpportunities.length}) →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {approvedOpportunities.slice(0, 3).map((opp) => (
              <div
                key={opp.id}
                className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/12 dark:border-white/10 flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform"
              >
                <div className="flex items-start gap-3">
                  <CompanyMonogram company={opp.company} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#5C7C89] dark:text-[#89A7B3]">
                      <span className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                        {opp.company}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{opp.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#C9825B] font-semibold">{opp.daysLeft}d left</span>
                    </div>
                    <h3 className="text-sm font-bold mt-0.5 line-clamp-2">{opp.title}</h3>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1F4959]/10 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-[#5C7C89] truncate max-w-[160px]">{opp.prizeOrPerk}</span>
                  <button
                    type="button"
                    onClick={() => onOpenOpportunityDetail(opp)}
                    className="font-semibold text-[#1F4959] dark:text-[#CFE0E3] hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Details</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Story Ring Modal when user taps a Coding Platform Story Ring */}
        {activeStoryPlatform && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-ring-modal-title"
          >
            <div className="glass-modal max-w-sm w-full rounded-[28px] p-6 text-center relative">
              {/* Top Story Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-[#1F4959]/15 overflow-hidden mb-5">
                <div className="h-full w-full story-ring-active" />
              </div>

              <button
                type="button"
                onClick={() => setActiveStoryPlatform(null)}
                aria-label="Close platform story"
                className="absolute top-6 right-5 p-2 rounded-xl hover:bg-black/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mx-auto w-20 h-20 rounded-full p-1 story-ring-active">
                <div className="w-full h-full rounded-full bg-[#F6F1E9] dark:bg-[#011425] flex items-center justify-center font-serif-display text-xl font-bold text-[#1F4959] dark:text-[#F6F1E9]">
                  {activeStoryPlatform.platform.slice(0, 2)}
                </div>
              </div>

              <h3 id="story-ring-modal-title" className="text-xl font-bold font-serif-display mt-3">
                {activeStoryPlatform.platform} Highlight
              </h3>
              <p className="text-xs text-[#5C7C89] mt-0.5">
                @{activeStoryPlatform.handle} · {activeStoryPlatform.verificationType}
              </p>

              <div className="my-5 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/15 space-y-2">
                <p className="text-3xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3]">
                  {activeStoryPlatform.solvedCount}
                </p>
                <p className="text-xs text-[#5C7C89]">
                  {activeStoryPlatform.secondaryLabel}:{' '}
                  <strong className="text-[#242424] dark:text-[#F6F1E9]">
                    {activeStoryPlatform.secondaryValue}
                  </strong>
                </p>
                <p className="text-[11px] text-[#C9825B]">
                  Last synced {activeStoryPlatform.lastSynced}
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleRefreshPlatform(activeStoryPlatform);
                    setActiveStoryPlatform(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors min-h-[42px]"
                >
                  Sync Latest Stats
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStoryPlatform(null);
                    onNavigateTab('coding-profiles');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#1F4959]/20 text-xs font-semibold min-h-[42px]"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. MY PROFILE (Instagram-Inspired Warm Editorial Profile)
  // ============================================================================
  if (activeTab === 'profile') {
    return (
      <div className="space-y-6">
        {/* Insta-Style Profile Header Card */}
        <section className="glass-card rounded-[28px] p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar inside Warm Story Ring */}
            <div className="p-1 rounded-full story-ring-active shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-[#E8D8C3] border-2 border-[#F6F1E9] dark:border-[#011425]">
                <img
                  src={student.avatarUrl}
                  alt={student.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Bio & Stats Row */}
            <div className="flex-1 space-y-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                    {student.name}
                  </h1>
                  <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
                    <span>Roll No: {student.rollNo}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{student.department}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Mentor: Ganesh Sir</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('settings')}
                    className="px-4 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-[#1F4959]/20 text-xs font-semibold hover:bg-[#1F4959] hover:text-white transition-colors min-h-[40px]"
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('coding-profiles')}
                    className="px-4 py-2 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors min-h-[40px]"
                  >
                    Coding Handles
                  </button>
                </div>
              </div>

              {/* Instagram Stats Row (Personal Metrics Only — Zero Ranking!) */}
              <div className="grid grid-cols-4 gap-3 py-3.5 px-4 rounded-2xl bg-white/55 dark:bg-white/5 border border-[#1F4959]/10">
                <div>
                  <p className="text-lg sm:text-xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3]">
                    {totalSolved}
                  </p>
                  <p className="text-[11px] text-[#5C7C89]">Problems</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold font-mono-num text-[#C9825B]">
                    {student.streakDays}d
                  </p>
                  <p className="text-[11px] text-[#5C7C89]">Warm Streak</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3]">
                    {student.contestsCount}
                  </p>
                  <p className="text-[11px] text-[#5C7C89]">Contests</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3]">
                    {student.hackathonsCount}
                  </p>
                  <p className="text-[11px] text-[#5C7C89]">Hackathons</p>
                </div>
              </div>

              {/* Career Objective Bio */}
              <p className="text-xs sm:text-sm text-[#242424]/90 dark:text-[#F6F1E9]/90 leading-relaxed max-w-2xl">
                {student.careerObjective}
              </p>
            </div>
          </div>

          {/* Instagram Highlights Strip for Coding Platforms */}
          <div className="mt-7 pt-6 border-t border-[#1F4959]/10 dark:border-white/10">
            <p className="text-xs font-semibold text-[#5C7C89] mb-3">
              Platform Highlights · Tap to view verified credentials
            </p>
            <div className="flex items-center gap-5 overflow-x-auto pb-1">
              {student.platforms.map((plat) => (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => onNavigateTab('coding-profiles')}
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                >
                  <div className="p-[2.5px] rounded-full story-ring-amber group-hover:scale-105 transition-transform">
                    <div className="w-14 h-14 rounded-full bg-[#F6F1E9] dark:bg-[#011425] flex flex-col items-center justify-center">
                      <span className="text-xs font-mono-num font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                        {plat.solvedCount}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium">{plat.platform}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Instagram Post-Style 3-Column Achievements Grid */}
        <section className="glass-card rounded-[28px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                Milestone & Achievement Posts ({achievements.length})
              </h2>
              <p className="text-xs text-[#5C7C89]">
                Tap any square tile to open your reflection & mentor verification note
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('achievements')}
              className="text-xs font-semibold text-[#C9825B] hover:underline"
            >
              Open Full Grid →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((ach) => (
              <button
                key={ach.id}
                type="button"
                onClick={() => onOpenAchievementDetail(ach)}
                className="group text-left p-5 rounded-[22px] bg-white/60 dark:bg-white/5 border border-[#1F4959]/12 dark:border-white/10 hover:border-[#C9825B] transition-all flex flex-col justify-between aspect-[4/3]"
              >
                <div className="flex items-center justify-between text-xs text-[#5C7C89]">
                  <span className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                    {ach.platform} · {ach.category}
                  </span>
                  <span>{ach.date}</span>
                </div>

                <div className="my-2">
                  <h3 className="text-base font-bold font-serif-display group-hover:text-[#C9825B] transition-colors">
                    {ach.title}
                  </h3>
                  <p className="text-xs text-[#5C7C89] mt-1">{ach.subtitle}</p>
                </div>

                <div className="pt-2.5 border-t border-[#1F4959]/10 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="font-mono-num font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                    {ach.metricText}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[#C9825B]" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ============================================================================
  // 3. CODING PROFILES SCREEN
  // ============================================================================
  if (activeTab === 'coding-profiles') {
    const displayedPlatforms = previewEmptyProfiles ? [] : student.platforms;

    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                Linked Coding Profiles
              </h1>
              <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-1">
                Auto-verified handles sync every hour. Additional platforms can be logged as self-reported entries.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewEmptyProfiles(!previewEmptyProfiles)}
                className="px-3 py-2 rounded-xl border border-[#1F4959]/20 text-xs font-medium hover:bg-black/5 min-h-[40px]"
              >
                {previewEmptyProfiles ? 'Show Linked Profiles' : 'Preview Empty State'}
              </button>
              <button
                type="button"
                onClick={() => onTriggerSystemState('sync-failed')}
                className="px-3 py-2 rounded-xl border border-[#C9825B]/40 text-[#C9825B] text-xs font-semibold hover:bg-[#C9825B]/10 min-h-[40px]"
              >
                Simulate Sync Failed
              </button>
              <button
                type="button"
                onClick={() => setShowAddPlatformSheet(true)}
                className="px-4 py-2 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center gap-1.5 min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Other Platform</span>
              </button>
            </div>
          </div>
        </section>

        {displayedPlatforms.length === 0 ? (
          <div className="glass-card rounded-[26px] p-10 text-center flex flex-col items-center">
            <WarmIllustration variant="empty" className="w-32 h-32" />
            <h2 className="text-xl font-bold font-serif-display mt-3">
              No coding platforms linked yet
            </h2>
            <p className="text-xs text-[#5C7C89] max-w-md mt-1.5">
              Connect your LeetCode, Codeforces, CodeChef, or GitHub URLs so Ganesh Sir can track your weekly progress automatically.
            </p>
            <button
              type="button"
              onClick={() => setPreviewEmptyProfiles(false)}
              className="mt-5 px-5 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold min-h-[44px]"
            >
              Restore My Linked Platforms
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayedPlatforms.map((plat) => (
              <div
                key={plat.id}
                className="glass-card rounded-[24px] p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="p-[2.5px] rounded-2xl story-ring-active">
                      <div className="w-12 h-12 rounded-[14px] bg-[#F6F1E9] dark:bg-[#011425] flex items-center justify-center font-serif-display font-bold text-base text-[#1F4959] dark:text-[#CFE0E3]">
                        {plat.platform.slice(0, 2)}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold font-serif-display">{plat.platform}</h2>
                      <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                        @{plat.handle} ·{' '}
                        <span
                          className={
                            plat.verificationType === 'Auto-verified'
                              ? 'text-[#1F4959] dark:text-[#CFE0E3] font-semibold'
                              : 'text-[#C9825B] font-semibold'
                          }
                        >
                          {plat.verificationType}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono-num text-[#1F4959] dark:text-[#F6F1E9]">
                      {plat.solvedCount}
                    </p>
                    <p className="text-[11px] text-[#5C7C89]">Problems / Entries</p>
                  </div>
                </div>

                {/* Difficulty breakdown if available */}
                {plat.easySolved !== undefined && (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white/55 dark:bg-white/5 border border-[#1F4959]/10 text-xs">
                    <div>
                      <span className="text-[#5C7C89]">Easy: </span>
                      <strong className="font-mono-num">{plat.easySolved}</strong>
                    </div>
                    <div>
                      <span className="text-[#5C7C89]">Medium: </span>
                      <strong className="font-mono-num text-[#D9A441]">{plat.mediumSolved}</strong>
                    </div>
                    <div>
                      <span className="text-[#5C7C89]">Hard: </span>
                      <strong className="font-mono-num text-[#C9825B]">{plat.hardSolved}</strong>
                    </div>
                  </div>
                )}

                <div className="text-xs text-[#5C7C89] flex items-center justify-between">
                  <span>
                    {plat.secondaryLabel}: <strong className="text-[#242424] dark:text-[#F6F1E9]">{plat.secondaryValue}</strong>
                  </span>
                  <span>Synced {plat.lastSynced}</span>
                </div>

                {/* Inline Edit URL Form */}
                {editingPlatformId === plat.id && (
                  <div className="p-3 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 space-y-2">
                    <label htmlFor={`edit-url-${plat.id}`} className="block text-xs font-semibold">
                      Update {plat.platform} Profile Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={`edit-url-${plat.id}`}
                        type="text"
                        value={editingUrlValue}
                        onChange={(e) => setEditingUrlValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-[#1F4959]/20 text-xs bg-white dark:bg-[#011425]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = student.platforms.map((p) =>
                            p.id === plat.id
                              ? { ...p, url: editingUrlValue, lastSynced: 'Updated just now' }
                              : p
                          );
                          onUpdateStudent({ ...student, platforms: updated });
                          setEditingPlatformId(null);
                          onTriggerToast('success', 'Profile Link Updated', `Updated ${plat.platform} URL.`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#1F4959] text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#1F4959]/10 dark:border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRefreshPlatform(plat)}
                      className="px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-[#1F4959] hover:text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 min-h-[38px]"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${syncingPlatformId === plat.id ? 'animate-spin' : ''}`}
                      />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlatformId(editingPlatformId === plat.id ? null : plat.id);
                        setEditingUrlValue(plat.url);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-[#1F4959] hover:text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 min-h-[38px]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Link</span>
                    </button>
                  </div>

                  <a
                    href={plat.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[#1F4959] dark:text-[#CFE0E3] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Other Platform Bottom Sheet / Modal */}
        {showAddPlatformSheet && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-plat-sheet-title"
          >
            <div className="glass-modal w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-6">
              <div className="w-10 h-1.5 bg-[#5C7C89]/30 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h3 id="add-plat-sheet-title" className="text-lg font-bold font-serif-display">
                  Add Other Coding Platform
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddPlatformSheet(false)}
                  aria-label="Close add platform sheet"
                  className="p-2 rounded-xl hover:bg-black/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddOtherPlatformSubmit} className="space-y-4">
                <div>
                  <label htmlFor="sheet-plat-name" className="block text-xs font-semibold mb-1">
                    Platform Name
                  </label>
                  <input
                    id="sheet-plat-name"
                    type="text"
                    required
                    placeholder="e.g. AtCoder, TopCoder, HackerEarth"
                    value={newPlatformName}
                    onChange={(e) => setNewPlatformName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sheet-plat-handle" className="block text-xs font-semibold mb-1">
                    Username / Handle
                  </label>
                  <input
                    id="sheet-plat-handle"
                    type="text"
                    placeholder="e.g. ananya_atcoder"
                    value={newPlatformHandle}
                    onChange={(e) => setNewPlatformHandle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sheet-plat-count" className="block text-xs font-semibold mb-1">
                    Problems Solved (Self-reported count)
                  </label>
                  <input
                    id="sheet-plat-count"
                    type="number"
                    required
                    placeholder="e.g. 25"
                    value={newPlatformCount}
                    onChange={(e) => setNewPlatformCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm font-mono-num"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors min-h-[46px]"
                >
                  Save Self-Reported Platform
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 4. PROGRESS & ANALYTICS SCREEN (Personal Growth Only — Zero Peer Comparison)
  // ============================================================================
  const multiplier = dateRange === '7d' ? 1 : dateRange === '30d' ? 4 : 18;

  return (
    <div className="space-y-6">
      {/* Header & Date Range Filter */}
      <section className="glass-card rounded-[26px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
            Personal Progress & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
            Track your own consistency, problem-solving velocity, and contest participation over time.
          </p>
        </div>

        {/* Interactive Date Range Filter */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#E8D8C3]/55 dark:bg-[#0b2b3c] self-start sm:self-center"
          role="group"
          aria-label="Filter analytics by date range"
        >
          {[
            { id: '7d' as const, label: 'This Week' },
            { id: '30d' as const, label: 'Last 30 Days' },
            { id: '6m' as const, label: '6 Months' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDateRange(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[38px] ${
                dateRange === item.id
                  ? 'bg-[#1F4959] text-white shadow-sm'
                  : 'text-[#242424] dark:text-[#CFE0E3] hover:bg-white/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* 2-Column Charts: Weekly Bar Chart + Total-Over-Time Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Bar Chart */}
        <section className="glass-card rounded-[26px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold font-serif-display">
                Daily Problem & Commit Breakdown
              </h2>
              <p className="text-xs text-[#5C7C89]">
                Petrol Teal = Coding Problems · Terracotta = GitHub Commits
              </p>
            </div>
            <span className="text-sm font-mono-num font-bold text-[#1F4959] dark:text-[#CFE0E3]">
              {student.weeklyCurrentSolved * multiplier} Solved
            </span>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end h-48 pt-6 px-2">
            {student.weeklyActivity.map((d) => {
              const probH = Math.min(100, d.problems * 24);
              const commH = Math.min(100, d.commits * 16);
              return (
                <div key={d.day} className="flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div
                      className="w-3.5 rounded-t-md bg-[#1F4959] dark:bg-[#CFE0E3] transition-all"
                      style={{ height: `${probH}%` }}
                      title={`${d.problems * multiplier} problems`}
                    />
                    <div
                      className="w-3.5 rounded-t-md bg-[#C9825B] transition-all"
                      style={{ height: `${commH}%` }}
                      title={`${d.commits * multiplier} commits`}
                    />
                  </div>
                  <span className="text-xs font-mono-num text-[#5C7C89]">{d.day}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cumulative Total-Over-Time SVG Line Chart */}
        <section className="glass-card rounded-[26px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold font-serif-display">
                Cumulative Problems Solved Over Time
              </h2>
              <p className="text-xs text-[#5C7C89]">
                Steady growth from 210 in June to {totalSolved} in November
              </p>
            </div>
            <span className="text-sm font-mono-num font-bold text-[#C9825B]">
              +304 in 6m
            </span>
          </div>

          <div className="w-full">
            <svg viewBox="0 0 420 150" className="w-full h-40 overflow-visible">
              {/* Horizontal reference hairlines */}
              <line x1="20" y1="25" x2="400" y2="25" stroke="#5C7C89" strokeOpacity="0.2" strokeDasharray="4 4" />
              <line x1="20" y1="75" x2="400" y2="75" stroke="#5C7C89" strokeOpacity="0.2" strokeDasharray="4 4" />
              <line x1="20" y1="125" x2="400" y2="125" stroke="#5C7C89" strokeOpacity="0.2" />

              {/* Area fill */}
              <path
                d="M 30 115 L 100 98 L 170 76 L 240 54 L 310 38 L 385 20 L 385 125 L 30 125 Z"
                fill="#CFE0E3"
                fillOpacity="0.45"
              />
              {/* Line stroke */}
              <path
                d="M 30 115 L 100 98 L 170 76 L 240 54 L 310 38 L 385 20"
                fill="none"
                stroke="#1F4959"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data nodes */}
              {[
                { x: 30, y: 115, label: 'Jun', val: 210 },
                { x: 100, y: 98, label: 'Jul', val: 268 },
                { x: 170, y: 76, label: 'Aug', val: 335 },
                { x: 240, y: 54, label: 'Sep', val: 402 },
                { x: 310, y: 38, label: 'Oct', val: 465 },
                { x: 385, y: 20, label: 'Nov', val: totalSolved },
              ].map((pt) => (
                <g key={pt.label}>
                  <circle cx={pt.x} cy={pt.y} r="5" fill="#C9825B" stroke="#F6F1E9" strokeWidth="2" />
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    className="fill-[#1F4959] dark:fill-[#CFE0E3] text-[10px] font-mono-num font-bold"
                  >
                    {pt.val}
                  </text>
                  <text
                    x={pt.x}
                    y="144"
                    textAnchor="middle"
                    className="fill-[#5C7C89] text-[11px] font-mono-num"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </section>
      </div>

      {/* Consistency / Streak View + Contests vs Hackathons vs Practice Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Consistency & Streak Heatmap Strip */}
        <section className="lg:col-span-7 glass-card rounded-[26px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold font-serif-display">
                14-Day Warm Consistency Streak
              </h2>
              <p className="text-xs text-[#5C7C89]">
                Every highlighted tile marks a day with at least 1 verified problem or commit
              </p>
            </div>
            <span className="text-sm font-mono-num font-bold text-[#C9825B]">
              {student.streakDays} Days Active
            </span>
          </div>

          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
            {Array.from({ length: 14 }).map((_, idx) => {
              const dayNum = idx + 5;
              const isHigh = idx % 3 === 0 || idx > 10;
              return (
                <div
                  key={dayNum}
                  className={`p-2.5 rounded-xl flex flex-col items-center justify-center border ${
                    isHigh
                      ? 'bg-[#C9825B] text-white border-[#C9825B]'
                      : 'bg-[#D9A441]/35 text-[#1F4959] dark:text-[#F6F1E9] border-[#D9A441]/50'
                  }`}
                >
                  <span className="text-[10px] opacity-80">Nov</span>
                  <span className="text-xs font-mono-num font-bold">{dayNum}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contests vs Hackathons vs Practice Split */}
        <section className="lg:col-span-5 glass-card rounded-[26px] p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold font-serif-display">
              Effort Split: Practice vs Contests vs Hackathons
            </h2>
            <p className="text-xs text-[#5C7C89]">
              Balanced preparation across daily DSA, timed rounds, and product builds
            </p>
          </div>

          {/* Stacked Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-[#E8D8C3]">
            <div className="bg-[#1F4959] h-full" style={{ width: '64%' }} title="Daily Practice 64%" />
            <div className="bg-[#C9825B] h-full" style={{ width: '24%' }} title="Rated Contests 24%" />
            <div className="bg-[#D9A441] h-full" style={{ width: '12%' }} title="Hackathons 12%" />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <div className="p-3 rounded-2xl bg-white/55 dark:bg-white/5 border border-[#1F4959]/10">
              <p className="font-mono-num font-bold text-base text-[#1F4959] dark:text-[#CFE0E3]">64%</p>
              <p className="text-[#5C7C89]">Daily Practice</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/55 dark:bg-white/5 border border-[#1F4959]/10">
              <p className="font-mono-num font-bold text-base text-[#C9825B]">24%</p>
              <p className="text-[#5C7C89]">Timed Contests</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/55 dark:bg-white/5 border border-[#1F4959]/10">
              <p className="font-mono-num font-bold text-base text-[#D9A441]">12%</p>
              <p className="text-[#5C7C89]">Hackathons</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
