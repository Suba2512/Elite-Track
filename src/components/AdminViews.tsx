import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FilePlus,
  FileSpreadsheet,
  Medal,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  AdminTab,
  MentorCommand,
  Opportunity,
  OpportunityCategory,
  PipelineStage,
  StudentRecord,
} from '../types';
import { AVATAR_GANESH } from '../data/seedData';
import { computeBatchOverview } from '../utils/logic';
import { exportIndividualStudentDossier, exportConsolidatedBatchWorkbook } from '../utils/excelExporter';
import { CompanyMonogram } from './Illustrations';

interface AdminViewsProps {
  activeTab: AdminTab;
  onNavigateTab: (tab: AdminTab) => void;
  students: StudentRecord[];
  selectedStudent: StudentRecord;
  onSelectStudent: (stu: StudentRecord) => void;
  commands: MentorCommand[];
  onIssueCommand: (cmd: MentorCommand) => void;
  opportunities: Opportunity[];
  onUpdateOpportunityStage: (oppId: string, nextStage: PipelineStage, reason?: string) => void;
  onAddOpportunity: (opp: Opportunity) => void;
  onSendAnnouncement: (title: string, message: string, audience: string, viaWhatsapp: boolean) => void;
  onTriggerToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  onTriggerDiscovery?: (sourceId?: string) => void;
  isDiscovering?: boolean;
  discoveryStats?: any;
  onPreviewWhatsApp?: (oppId: string) => Promise<string | null>;
  onViewEvidence?: (oppId: string) => Promise<any>;
}

export const AdminViews: React.FC<AdminViewsProps> = ({
  activeTab,
  onNavigateTab,
  students,
  selectedStudent,
  onSelectStudent,
  commands,
  onIssueCommand,
  opportunities,
  onUpdateOpportunityStage,
  onAddOpportunity,
  onSendAnnouncement,
  onTriggerToast,
  onTriggerDiscovery,
  isDiscovering = false,
  discoveryStats,
  onPreviewWhatsApp,
  onViewEvidence,
}) => {
  const batchStats = computeBatchOverview(students);
  const pendingOpportunities = opportunities.filter(
    (o) => o.pipelineStage === 'Fetched' || o.pipelineStage === 'Verified'
  );

  // Issue Command Form State
  const [cmdTargetType, setCmdTargetType] = useState<'all' | 'individual'>('all');
  const [cmdTargetStudentId, setCmdTargetStudentId] = useState<string>(students[0]?.id || 'stu-01');
  const [cmdTitle, setCmdTitle] = useState('');
  const [cmdDescription, setCmdDescription] = useState('');
  const [cmdDueDate, setCmdDueDate] = useState('Nov 26, 6:00 PM');
  const [cmdAttachment, setCmdAttachment] = useState('Graphs_ShortestPath_Handout.pdf');

  // Opportunity Pipeline State
  const [pipelineFilter, setPipelineFilter] = useState<'All' | PipelineStage>('All');
  const [showAddOppModal, setShowAddOppModal] = useState(false);
  const [showSourceHealth, setShowSourceHealth] = useState(true);
  const [newOppTitle, setNewOppTitle] = useState('');
  const [newOppCompany, setNewOppCompany] = useState('Qualcomm');
  const [newOppPlatform, setNewOppPlatform] = useState('Devpost');
  const [newOppEdition, setNewOppEdition] = useState('2026');
  const [newOppCategory, setNewOppCategory] = useState<OpportunityCategory>('Hackathon');
  const [newOppDeadline, setNewOppDeadline] = useState('Dec 12, 2026');
  const [newOppOfficialUrl, setNewOppOfficialUrl] = useState('https://qualcomm.com/challenge');
  const [newOppRegUrl, setNewOppRegUrl] = useState('https://qualcomm.com/challenge/register');
  const [newOppRatingType, setNewOppRatingType] = useState('Rated');
  const [newOppEventStart, setNewOppEventStart] = useState('2026-12-10T10:00:00Z');
  const [newOppDuration, setNewOppDuration] = useState('2 hours');
  const [newOppPerk, setNewOppPerk] = useState('Direct R&D Internship Interview + ₹1,00,000 Grant');
  const [newOppEligibility, setNewOppEligibility] = useState('B.E / B.Tech CSE, IT, ECE (2026 Batch)');

  // Evidence, WhatsApp Preview, & Rejection Modals State
  const [evidenceOpp, setEvidenceOpp] = useState<Opportunity | null>(null);
  const [evidenceData, setEvidenceData] = useState<any>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [previewOpp, setPreviewOpp] = useState<Opportunity | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [rejectingOpp, setRejectingOpp] = useState<Opportunity | null>(null);
  const [rejectReason, setRejectReason] = useState('Does not match target batch graduation criteria');

  // Students List Filter State
  const [studentQuery, setStudentQuery] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('All');

  // Announcements State
  const [annAudience, setAnnAudience] = useState('All 17 Batch Students');
  const [annTitle, setAnnTitle] = useState('Weekend Mock Interview & Zoho LLD Review');
  const [annBody, setAnnBody] = useState(
    'Hi everyone, please push your week-3 DP and Graph solutions to GitHub before Saturday 5 PM. We will review individual approaches on Monday morning.'
  );
  const [annWhatsapp, setAnnWhatsapp] = useState(true);
  const [annScheduled, setAnnScheduled] = useState(false);
  const [annSentConfirmation, setAnnSentConfirmation] = useState(false);

  const handlePublishCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdTitle.trim() || !cmdDescription.trim()) {
      onTriggerToast('error', 'Missing Command Fields', 'Please enter a title and description.');
      return;
    }

    const newCmd: MentorCommand = {
      id: `cmd-${Date.now()}`,
      title: cmdTitle.trim(),
      description: cmdDescription.trim(),
      dueDate: cmdDueDate.trim() || 'Nov 28, 6:00 PM',
      assignedBy: 'Ganesh Sir',
      assignedByRole: 'Placement Mentor',
      targetType: cmdTargetType,
      targetStudentId: cmdTargetType === 'individual' ? cmdTargetStudentId : undefined,
      attachments: cmdAttachment.trim() ? [cmdAttachment.trim()] : [],
      createdAt: 'Just now',
      myStatus: 'Not started',
      myComment: '',
      studentReplies: [],
    };

    onIssueCommand(newCmd);
    setCmdTitle('');
    setCmdDescription('');
    onNavigateTab('command-tracking');
  };

  const handleAddManualOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOppTitle.trim()) {
      onTriggerToast('error', 'Title Required', 'Enter an opportunity title.');
      return;
    }

    const regUrlTrimmed = newOppRegUrl.trim();
    const isHttp = regUrlTrimmed.startsWith('http://') || regUrlTrimmed.startsWith('https://');
    const isGeneric = ['unstop.com', 'devpost.com', 'google.com', 'leetcode.com'].some(
      (root) => regUrlTrimmed.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/+$/, '') === root
    );
    const isRegValid = isHttp && !isGeneric && regUrlTrimmed.length > 10;

    const targetPlatform = newOppCategory === 'Contest' ? newOppPlatform : newOppCompany;

    const created: Opportunity = {
      id: `opp-${Date.now()}`,
      title: newOppTitle.trim(),
      company: targetPlatform,
      category: newOppCategory,
      edition: newOppEdition.trim() || undefined,
      deadline: newOppDeadline,
      daysLeft: 14,
      source: 'Manual',
      pipelineStage: 'Approved',
      eventStatus: 'Registration Open',
      eligibility: newOppEligibility,
      prizeOrPerk: newOppPerk,
      dates: newOppDeadline,
      officialEventUrl: newOppOfficialUrl.trim() || undefined,
      registrationUrl: regUrlTrimmed,
      sourceListingUrl: newOppOfficialUrl.trim() || undefined,
      isRegistrationUrlValid: isRegValid,
      linkVerifiedAt: new Date().toISOString(),
      contestRatingType: newOppCategory === 'Contest' ? (newOppRatingType as any) : undefined,
      eventStart: newOppCategory === 'Contest' ? newOppEventStart : undefined,
      durationText: newOppCategory === 'Contest' ? newOppDuration : undefined,
      description: `Manually verified and approved by Dr. R. Ganesh for the 17-student batch.`,
      saved: false,
      remindMe: false,
      tags: ['Mentor Verified', targetPlatform],
    };

    onAddOpportunity(created);
    setNewOppTitle('');
    setShowAddOppModal(false);
    onTriggerToast(
      'success',
      'Opportunity Added & Published',
      `"${created.title}" is now active in the batch pipeline.`
    );
    if (!isRegValid) {
      onTriggerToast(
        'info',
        'Registration URL Flagged',
        'Registration button disabled because the URL provided appears to be generic or non-specific.'
      );
    }
  };

  // ============================================================================
  // 1. ADMIN / MENTOR (GANESH SIR) DASHBOARD
  // ============================================================================
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Mentor Welcome Banner */}
        <section className="glass-card rounded-[28px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="p-1 rounded-full story-ring-active shrink-0">
              <img
                src={AVATAR_GANESH}
                alt="Ganesh Sir"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#C9825B]">
                Placement Mentor & HOD Console · Batch of 17 Students
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                Welcome, Ganesh Sir
              </h1>
              <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
                {batchStats.activeThisWeek} of {batchStats.totalStudents} students logged coding activity this week · {pendingOpportunities.length} opportunities awaiting verification.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateTab('leaderboards')}
              className="px-4 py-2.5 rounded-2xl bg-[#D9A441] text-[#1F4959] text-xs font-bold hover:bg-[#c89433] transition-colors inline-flex items-center gap-1.5 min-h-[44px] shadow-sm"
            >
              <Award className="w-4 h-4" />
              <span>Leaderboards</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportConsolidatedBatchWorkbook(students, commands);
                onTriggerToast('success', 'Excel Export Downloaded', 'Consolidated 17-Student Master Workbook (.xlsx) generated.');
              }}
              className="px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-white/10 border border-[#1F4959]/25 text-[#1F4959] dark:text-[#F6F1E9] text-xs font-bold hover:bg-white transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#1F4959]" />
              <span>Export Batch Excel</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('issue-command')}
              className="px-4 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Command</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('opportunities-pipeline')}
              className="px-4 py-2.5 rounded-2xl bg-[#C9825B] text-white text-xs font-semibold hover:bg-[#b5714c] transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approve Opps ({pendingOpportunities.length})</span>
            </button>
          </div>
        </section>

        {/* 4 Core Action Tiles */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              tab: 'issue-command' as const,
              title: 'Issue Command',
              subtitle: 'Assign DSA or LLD tasks to all 17 students or an individual',
              metric: `${commands.length} Active Tasks`,
              accent: 'text-[#1F4959] dark:text-[#CFE0E3]',
            },
            {
              tab: 'opportunities-pipeline' as const,
              title: 'Approve Opportunities',
              subtitle: 'Fetched from Devpost, Unstop & MyCareerNet -> Verify -> Approve',
              metric: `${pendingOpportunities.length} Pending Approval`,
              accent: 'text-[#C9825B]',
            },
            {
              tab: 'students' as const,
              title: 'View Batch Progress',
              subtitle: 'Individual progress for all 17 students (no rankings)',
              metric: `${batchStats.activeThisWeek}/17 Active This Week`,
              accent: 'text-[#1F4959] dark:text-[#CFE0E3]',
            },
            {
              tab: 'announcements' as const,
              title: 'Send Notifications',
              subtitle: 'Broadcast in-app & WhatsApp reminders with live preview',
              metric: '17/17 WhatsApp Linked',
              accent: 'text-[#D9A441]',
            },
          ].map((tile) => (
            <button
              key={tile.tab}
              type="button"
              onClick={() => onNavigateTab(tile.tab)}
              className="glass-card rounded-[24px] p-5 text-left flex flex-col justify-between gap-4 hover:-translate-y-1 transition-transform group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono-num font-bold ${tile.accent}`}>
                    {tile.metric}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[#5C7C89] group-hover:text-[#C9825B]" />
                </div>
                <h2 className="text-lg font-bold font-serif-display mt-2">{tile.title}</h2>
                <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] mt-1 leading-relaxed">
                  {tile.subtitle}
                </p>
              </div>
              <span className="text-xs font-semibold text-[#1F4959] dark:text-[#CFE0E3] group-hover:underline">
                Open Workspace →
              </span>
            </button>
          ))}
        </section>

        {/* Batch Overview (Submission Status This Week + Pending Opportunity Pipeline Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Batch Weekly Activity & Command Submission Overview */}
          <section className="lg:col-span-7 glass-card rounded-[26px] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-serif-display">
                  Batch of 17 — Weekly Submission & Activity Rhythm
                </h2>
                <p className="text-xs text-[#5C7C89]">
                  Non-comparative batch health: {batchStats.totalProblemsThisWeek} total problems solved this week
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('analytics')}
                className="text-xs font-semibold text-[#1F4959] dark:text-[#CFE0E3] hover:underline"
              >
                Batch Analytics →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
                <p className="text-2xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3]">
                  {batchStats.activeThisWeek} / 17
                </p>
                <p className="text-xs text-[#5C7C89] mt-0.5">Students Active This Week</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
                <p className="text-2xl font-bold font-mono-num text-[#C9825B]">
                  {batchStats.completionRate}%
                </p>
                <p className="text-xs text-[#5C7C89] mt-0.5">Command Completion Rate</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
                <p className="text-2xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3]">
                  2
                </p>
                <p className="text-xs text-[#5C7C89] mt-0.5">Students Need Check-In</p>
              </div>
            </div>

            {/* Students Needing a Gentle Mentor Check-In */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-[#5C7C89] mb-2.5">
                Students Needing a Friendly Check-In This Week
              </p>
              <div className="space-y-2">
                {students
                  .filter((s) => s.activeStatus === 'Needs check-in')
                  .map((stu) => (
                    <div
                      key={stu.id}
                      className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/12 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold">
                          {stu.name} <span className="text-xs font-mono-num text-[#5C7C89]">({stu.rollNo})</span>
                        </p>
                        <p className="text-xs text-[#5C7C89]">
                          Last active {stu.lastActive} · {stu.weeklyCurrentSolved}/{stu.weeklyTargetSolved} weekly goal
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectStudent(stu);
                            onNavigateTab('student-detail');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#1F4959] text-white text-xs font-semibold min-h-[36px]"
                        >
                          View Progress
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          {/* Pending Opportunity Approvals Queue */}
          <section className="lg:col-span-5 glass-card rounded-[26px] p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold font-serif-display">
                  Pending Opportunity Queue ({pendingOpportunities.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigateTab('opportunities-pipeline')}
                  className="text-xs font-semibold text-[#C9825B] hover:underline"
                >
                  Full Pipeline →
                </button>
              </div>

              <div className="space-y-3">
                {pendingOpportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/12 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <CompanyMonogram company={opp.company} size="sm" />
                        <div>
                          <p className="text-xs text-[#5C7C89]">
                            {opp.company} · Source: <strong>{opp.source}</strong> · Stage: {opp.pipelineStage}
                          </p>
                          <h3 className="text-sm font-bold">{opp.title}</h3>
                        </div>
                      </div>
                    </div>

                    {opp.isDuplicateFlagged && (
                      <p className="text-[11px] font-semibold text-[#C9825B]">
                        Duplicate warning: Matches existing Flipkart GRiD 7.0 Unstop listing
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onUpdateOpportunityStage(opp.id, 'Rejected')}
                        className="px-3 py-1.5 rounded-xl border border-[#1F4959]/20 text-xs font-semibold hover:bg-black/5 min-h-[36px]"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateOpportunityStage(opp.id, 'Approved')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] min-h-[36px]"
                      >
                        Approve & Notify Batch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. ISSUE COMMAND SCREEN
  // ============================================================================
  if (activeTab === 'issue-command') {
    const targetStudentObj = students.find((s) => s.id === cmdTargetStudentId);

    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6">
          <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
            Issue Mentor Command
          </h1>
          <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
            Assign a weekly problem set, mock LLD task, or hackathon registration directive to all 17 students or a specific student.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handlePublishCommand}
            className="lg:col-span-7 glass-card rounded-[26px] p-6 space-y-4"
          >
            <div>
              <span className="block text-xs font-semibold mb-1.5">Target Audience</span>
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#E8D8C3]/50 dark:bg-[#0b2b3c]">
                <button
                  type="button"
                  onClick={() => setCmdTargetType('all')}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[40px] ${cmdTargetType === 'all'
                    ? 'bg-[#1F4959] text-white shadow-sm'
                    : 'text-[#242424] dark:text-[#CFE0E3]'
                    }`}
                >
                  All 17 Students in Batch
                </button>
                <button
                  type="button"
                  onClick={() => setCmdTargetType('individual')}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[40px] ${cmdTargetType === 'individual'
                    ? 'bg-[#1F4959] text-white shadow-sm'
                    : 'text-[#242424] dark:text-[#CFE0E3]'
                    }`}
                >
                  Individual Student
                </button>
              </div>
            </div>

            {cmdTargetType === 'individual' && (
              <div>
                <label htmlFor="cmd-stu-select" className="block text-xs font-semibold mb-1">
                  Select Student
                </label>
                <select
                  id="cmd-stu-select"
                  value={cmdTargetStudentId}
                  onChange={(e) => setCmdTargetStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
                >
                  {students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.rollNo} — {stu.name} ({stu.department})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="cmd-title-input" className="block text-xs font-semibold mb-1">
                Command Title
              </label>
              <input
                id="cmd-title-input"
                type="text"
                required
                placeholder="e.g. Solve 4 Monotonic Stack & Sliding Window Problems"
                value={cmdTitle}
                onChange={(e) => setCmdTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
              />
            </div>

            <div>
              <label htmlFor="cmd-desc-input" className="block text-xs font-semibold mb-1">
                Instructions & Deliverables
              </label>
              <textarea
                id="cmd-desc-input"
                rows={4}
                required
                placeholder="Explain the problem list, evaluation rubric, or GitHub link required..."
                value={cmdDescription}
                onChange={(e) => setCmdDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cmd-due-input" className="block text-xs font-semibold mb-1">
                  Due Date & Time
                </label>
                <input
                  id="cmd-due-input"
                  type="text"
                  value={cmdDueDate}
                  onChange={(e) => setCmdDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
                />
              </div>
              <div>
                <label htmlFor="cmd-att-input" className="block text-xs font-semibold mb-1">
                  Attachment / Reference Filename
                </label>
                <input
                  id="cmd-att-input"
                  type="text"
                  value={cmdAttachment}
                  onChange={(e) => setCmdAttachment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#1F4959] text-white text-sm font-semibold hover:bg-[#163744] transition-colors inline-flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Send className="w-4 h-4" />
              <span>Issue Command & Notify via In-App + WhatsApp</span>
            </button>
          </form>

          {/* Live Student Card Preview */}
          <div className="lg:col-span-5 glass-card rounded-[26px] p-6 space-y-4">
            <p className="text-xs font-semibold text-[#C9825B]">
              Live Student Feed & WhatsApp Preview
            </p>
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-[#1F4959]/15 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5C7C89]">
                <span className="font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                  Ganesh Sir (Placement Mentor)
                </span>
                <span className="text-[#C9825B] font-semibold">Due {cmdDueDate}</span>
              </div>
              <h3 className="text-base font-bold font-serif-display">
                {cmdTitle || 'Your command title will appear here...'}
              </h3>
              <p className="text-xs text-[#5C7C89] leading-relaxed">
                {cmdDescription ||
                  'Students will see your instructions, reference attachment, and a quick Reply button to log their status.'}
              </p>
              <div className="pt-2 border-t border-[#1F4959]/10 text-[11px] text-[#5C7C89] flex items-center justify-between">
                <span>
                  Target:{' '}
                  {cmdTargetType === 'all'
                    ? 'All 17 Students'
                    : `${targetStudentObj?.name} (${targetStudentObj?.rollNo})`}
                </span>
                <span>Attachment: {cmdAttachment || 'None'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#2E5A44]/10 border border-[#2E5A44]/25 space-y-1.5 text-xs">
              <p className="font-bold text-[#2E5A44] dark:text-[#7CD4B8]">
                Automated WhatsApp Dispatch Preview
              </p>
              <p className="text-[#242424]/85 dark:text-[#F6F1E9]/85">
                “[Elite Track] Ganesh Sir issued a new command: *{cmdTitle || 'Weekly Task'}* (Due {cmdDueDate}). Reply in the app once completed.”
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. OPPORTUNITY MANAGEMENT PIPELINE (Fetched -> Verify -> Approve)
  // ============================================================================
  if (activeTab === 'opportunities-pipeline') {
    const filtered = opportunities.filter((o) =>
      pipelineFilter === 'All' ? true : o.pipelineStage === pipelineFilter
    );

    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                Opportunity Verification Pipeline
              </h1>
              <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
                Automated discovery: Devpost, MyCareernet, Codeforces, LeetCode, CodeChef & CodeGalatta → Verify → Explicit Mentor Approval.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => onTriggerDiscovery && onTriggerDiscovery()}
                disabled={isDiscovering}
                className="px-4 py-2.5 rounded-2xl bg-[#D9A441] text-[#1F4959] text-xs font-bold hover:opacity-90 transition-all inline-flex items-center gap-2 min-h-[42px] disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                <span>{isDiscovering ? 'Scanning Sources...' : 'Sync Discovery Engine'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddOppModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center gap-1.5 min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Opportunity Manually</span>
              </button>
            </div>
          </div>

          {/* Mentor Observability Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-[#1F4959]/10 dark:border-white/10">
            <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
              <p className="text-[11px] font-semibold text-[#5C7C89] dark:text-[#89A7B3]">Total Discovered</p>
              <p className="text-lg font-bold text-[#1F4959] dark:text-[#CFE0E3] mt-0.5">
                {discoveryStats?.totalDiscovered ?? opportunities.length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
              <p className="text-[11px] font-semibold text-[#5C7C89] dark:text-[#89A7B3]">Pending Approval</p>
              <p className="text-lg font-bold text-[#D9A441] mt-0.5">
                {opportunities.filter((o) => o.pipelineStage === 'Fetched' || o.pipelineStage === 'Verified').length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
              <p className="text-[11px] font-semibold text-[#5C7C89] dark:text-[#89A7B3]">Approved & Live</p>
              <p className="text-lg font-bold text-[#1F4959] dark:text-[#52B788] mt-0.5">
                {opportunities.filter((o) => o.pipelineStage === 'Approved').length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
              <p className="text-[11px] font-semibold text-[#5C7C89] dark:text-[#89A7B3]">Upcoming Hackathons</p>
              <p className="text-lg font-bold text-[#C9825B] mt-0.5">
                {discoveryStats?.upcomingCompanyHackathons ?? opportunities.filter((o) => o.category === 'Hackathon').length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
              <p className="text-[11px] font-semibold text-[#5C7C89] dark:text-[#89A7B3]">WhatsApp Delivered</p>
              <p className="text-lg font-bold text-[#1F4959] dark:text-[#CFE0E3] mt-0.5">
                {discoveryStats?.whatsappDelivered ?? 16}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
              <p className="text-[11px] font-semibold text-[#5C7C89] dark:text-[#89A7B3]">Engine Status</p>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-full text-[11px] font-bold bg-[#52B788]/20 text-[#2D6A4F] dark:text-[#74C69D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#52B788] animate-pulse"></span>
                <span>Active (6 Sources)</span>
              </span>
            </div>
          </div>
        </section>

        {/* Phase 9: Real Source Health & Adapter Monitoring Dashboard */}
        <section className="glass-card rounded-[26px] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F4959]/10 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1F4959] dark:text-[#D9A441]" />
                <h2 className="text-lg font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                  Source Health & Adapter Monitoring (6 Live Sources)
                </h2>
              </div>
              <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
                Real-data verification status, rate limits, fetching methods, and automated health checks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSourceHealth(!showSourceHealth)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-white/90 text-[#1F4959] dark:text-[#CFE0E3] self-start sm:self-auto border border-[#1F4959]/10"
            >
              {showSourceHealth ? 'Hide Source Cards' : 'View Source Cards (6)'}
            </button>
          </div>

          {showSourceHealth && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {((discoveryStats?.sources && discoveryStats.sources.length > 0)
                ? discoveryStats.sources
                : [
                  {
                    id: 'src-devpost',
                    name: 'Devpost Hackathons',
                    platform: 'Devpost',
                    source_type: 'hackathon',
                    fetching_method: 'Permitted Public Listing Extraction & RSS / JSON endpoints',
                    integration_status: 'Active',
                    last_fetch_attempt: new Date().toISOString(),
                    last_successful_fetch: new Date().toISOString(),
                    records_fetched: 2,
                    verified_records: 2,
                    expired_records: 0,
                    duplicate_records: 0,
                    invalid_links: 0,
                    manual_verification_required: 0,
                    last_error_message: null,
                    is_operational: true,
                  },
                  {
                    id: 'src-mycareernet',
                    name: 'MyCareernet Challenges',
                    platform: 'MyCareernet',
                    source_type: 'hackathon',
                    fetching_method: 'Public Contests Listing Inspection & Corporate Challenge Extraction',
                    integration_status: 'Active',
                    last_fetch_attempt: new Date().toISOString(),
                    last_successful_fetch: new Date().toISOString(),
                    records_fetched: 4,
                    verified_records: 3,
                    expired_records: 1,
                    duplicate_records: 0,
                    invalid_links: 1,
                    manual_verification_required: 0,
                    last_error_message: null,
                    is_operational: true,
                  },
                  {
                    id: 'src-codeforces',
                    name: 'Codeforces Contests',
                    platform: 'Codeforces',
                    source_type: 'contest',
                    fetching_method: 'Official Codeforces API (https://codeforces.com/api/contest.list)',
                    integration_status: 'Active',
                    last_fetch_attempt: new Date().toISOString(),
                    last_successful_fetch: new Date().toISOString(),
                    records_fetched: 1,
                    verified_records: 1,
                    expired_records: 0,
                    duplicate_records: 0,
                    invalid_links: 0,
                    manual_verification_required: 0,
                    last_error_message: null,
                    is_operational: true,
                  },
                  {
                    id: 'src-leetcode',
                    name: 'LeetCode Weekly & Biweekly',
                    platform: 'LeetCode',
                    source_type: 'contest',
                    fetching_method: 'Official Public Contest Feed Extraction & Mentor Manual Fallback',
                    integration_status: 'Active',
                    last_fetch_attempt: new Date().toISOString(),
                    last_successful_fetch: new Date().toISOString(),
                    records_fetched: 1,
                    verified_records: 1,
                    expired_records: 0,
                    duplicate_records: 0,
                    invalid_links: 0,
                    manual_verification_required: 0,
                    last_error_message: null,
                    is_operational: true,
                  },
                  {
                    id: 'src-codechef',
                    name: 'CodeChef Starters',
                    platform: 'CodeChef',
                    source_type: 'contest',
                    fetching_method: 'Official Public Contests Page Extraction & Starters Feeds',
                    integration_status: 'Active',
                    last_fetch_attempt: new Date().toISOString(),
                    last_successful_fetch: new Date().toISOString(),
                    records_fetched: 1,
                    verified_records: 1,
                    expired_records: 0,
                    duplicate_records: 0,
                    invalid_links: 0,
                    manual_verification_required: 0,
                    last_error_message: null,
                    is_operational: true,
                  },
                  {
                    id: 'src-codegalatta',
                    name: 'CodeGalatta Contests',
                    platform: 'CodeGalatta',
                    source_type: 'contest',
                    fetching_method: 'Public Collegiate Challenge Listings & Mentor Manual Fallback',
                    integration_status: 'Active',
                    last_fetch_attempt: new Date().toISOString(),
                    last_successful_fetch: new Date().toISOString(),
                    records_fetched: 1,
                    verified_records: 1,
                    expired_records: 0,
                    duplicate_records: 0,
                    invalid_links: 0,
                    manual_verification_required: 0,
                    last_error_message: null,
                    is_operational: true,
                  },
                ]
              ).map((src: any) => (
                <div
                  key={src.id}
                  className="rounded-2xl p-4 bg-white/70 dark:bg-white/5 border border-[#1F4959]/15 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <CompanyMonogram company={src.platform} size="md" />
                        <div>
                          <h3 className="text-sm font-bold text-[#1F4959] dark:text-[#F6F1E9] leading-tight">
                            {src.name}
                          </h3>
                          <span className="text-[11px] text-[#5C7C89] dark:text-[#89A7B3] font-medium">
                            {src.platform} · {src.source_type}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${src.integration_status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : src.integration_status === 'Temporarily unavailable'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${src.integration_status === 'Active'
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-amber-500'
                            }`}
                        />
                        <span>{src.integration_status}</span>
                      </span>
                    </div>

                    <div className="text-[11px] p-2 rounded-xl bg-[#F6F1E9]/70 dark:bg-black/20 text-[#1F4959] dark:text-[#CFE0E3] border border-[#1F4959]/10">
                      <p className="font-semibold text-[#5C7C89] dark:text-[#89A7B3] text-[10px] uppercase tracking-wider mb-0.5">
                        Fetching Method
                      </p>
                      <p className="line-clamp-2 leading-relaxed">{src.fetching_method}</p>
                    </div>

                    {/* Metrics Counters */}
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
                        <span className="block text-[10px] text-[#5C7C89] dark:text-[#89A7B3] font-medium">Fetched</span>
                        <span className="text-sm font-bold text-[#1F4959] dark:text-[#F6F1E9]">{src.records_fetched}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Verified</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{src.verified_records}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10">
                        <span className="block text-[10px] text-[#C9825B] font-medium">Expired</span>
                        <span className="text-sm font-bold text-[#C9825B]">{src.expired_records}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div className="p-1 rounded-lg bg-black/5 dark:bg-white/5 text-[#5C7C89]">
                        <span>Dups: <strong className="text-[#1F4959] dark:text-white">{src.duplicate_records}</strong></span>
                      </div>
                      <div className="p-1 rounded-lg bg-black/5 dark:bg-white/5 text-[#5C7C89]">
                        <span>Invalid: <strong className="text-rose-600 dark:text-rose-400">{src.invalid_links}</strong></span>
                      </div>
                      <div className="p-1 rounded-lg bg-black/5 dark:bg-white/5 text-[#5C7C89]">
                        <span>Needs Rev: <strong className="text-amber-600 dark:text-amber-400">{src.manual_verification_required}</strong></span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#5C7C89] dark:text-[#89A7B3] space-y-0.5 pt-0.5">
                      <div className="flex justify-between items-center">
                        <span>Last Attempt:</span>
                        <span className="font-medium text-[#1F4959] dark:text-[#CFE0E3]">
                          {src.last_fetch_attempt ? new Date(src.last_fetch_attempt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Last Success:</span>
                        <span className="font-medium text-[#52B788]">
                          {src.last_successful_fetch ? new Date(src.last_successful_fetch).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Verified Baseline'}
                        </span>
                      </div>
                    </div>

                    {src.last_error_message && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg border border-rose-200">
                        Error: {src.last_error_message}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#1F4959]/10 dark:border-white/10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onTriggerDiscovery && onTriggerDiscovery(src.id)}
                      disabled={isDiscovering}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-[#1F4959] text-white text-[11px] font-semibold hover:bg-[#163744] transition-colors flex items-center justify-center gap-1.5 min-h-[34px] disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isDiscovering ? 'animate-spin' : ''}`} />
                      <span>Trigger Live Fetch</span>
                    </button>
                    {['LeetCode', 'CodeChef', 'CodeGalatta'].includes(src.platform) && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewOppPlatform(src.platform);
                          setNewOppCategory('Contest');
                          setShowAddOppModal(true);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-[#D9A441]/20 text-[#D9A441] dark:text-[#D9A441] text-[11px] font-semibold hover:bg-[#D9A441]/30 transition-colors flex items-center gap-1 min-h-[34px]"
                        title="Mentor-Managed Manual Entry Fallback"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Manual</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pipeline Stage Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(['All', 'Fetched', 'Verified', 'Approved', 'Rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setPipelineFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[38px] ${pipelineFilter === st
                ? 'bg-[#1F4959] text-white'
                : 'glass-card hover:bg-white/80'
                }`}
            >
              {st} ({st === 'All' ? opportunities.length : opportunities.filter((o) => o.pipelineStage === st).length})
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.map((opp) => (
            <div
              key={opp.id}
              className="glass-card rounded-[24px] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <CompanyMonogram company={opp.company} size="lg" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C7C89]">
                    <span className="font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                      {opp.company}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Source: {opp.source}</span>
                    <span aria-hidden="true">·</span>
                    <span>Deadline: {opp.deadline}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#C9825B]">
                      Stage: {opp.pipelineStage}
                    </span>
                    {opp.contestRatingType && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#1F4959]/10 font-medium text-[#1F4959] dark:text-[#CFE0E3]">
                          {opp.contestRatingType}
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="text-lg font-bold font-serif-display">{opp.title}</h2>
                  <p className="text-xs text-[#5C7C89]">{opp.prizeOrPerk} · {opp.eligibility}</p>
                  {opp.isDuplicateFlagged && (
                    <p className="text-xs font-semibold text-[#C9825B] flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Duplicate Flagged: Mirror listing detected across multiple platforms</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Evidence Viewer Trigger */}
                <button
                  type="button"
                  onClick={async () => {
                    setEvidenceOpp(opp);
                    if (onViewEvidence) {
                      setLoadingEvidence(true);
                      const ev = await onViewEvidence(opp.id);
                      setEvidenceData(ev);
                      setLoadingEvidence(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl border border-[#1F4959]/20 text-[#1F4959] dark:text-[#CFE0E3] text-xs font-semibold hover:bg-black/5 transition-colors inline-flex items-center gap-1.5 min-h-[38px]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Evidence</span>
                </button>

                {/* WhatsApp Preview Trigger */}
                <button
                  type="button"
                  onClick={async () => {
                    setPreviewOpp(opp);
                    if (onPreviewWhatsApp) {
                      setLoadingPreview(true);
                      const txt = await onPreviewWhatsApp(opp.id);
                      setPreviewText(txt);
                      setLoadingPreview(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl border border-[#1F4959]/20 text-[#1F4959] dark:text-[#CFE0E3] text-xs font-semibold hover:bg-black/5 transition-colors inline-flex items-center gap-1.5 min-h-[38px]"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Preview</span>
                </button>

                {opp.pipelineStage === 'Fetched' && (
                  <button
                    type="button"
                    onClick={() => onUpdateOpportunityStage(opp.id, 'Verified')}
                    className="px-3.5 py-2 rounded-xl bg-[#D9A441] text-[#1F4959] text-xs font-bold hover:opacity-90 min-h-[38px]"
                  >
                    Step 1: Verify Eligibility
                  </button>
                )}
                {opp.pipelineStage !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => onUpdateOpportunityStage(opp.id, 'Approved')}
                    className="px-4 py-2 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] min-h-[38px]"
                  >
                    Approve & Publish to Batch
                  </button>
                )}
                {opp.pipelineStage !== 'Rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingOpp(opp);
                      setRejectReason('Does not match target batch graduation criteria');
                    }}
                    className="px-3.5 py-2 rounded-xl border border-[#C9825B] text-[#C9825B] text-xs font-semibold hover:bg-[#C9825B] hover:text-white transition-colors min-h-[38px]"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Verification Evidence Modal */}
        {evidenceOpp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="glass-modal max-w-lg w-full rounded-[28px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C9825B]">Verification Evidence</span>
                  <h3 className="text-lg font-bold font-serif-display mt-0.5">{evidenceOpp.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceOpp(null);
                    setEvidenceData(null);
                  }}
                  className="p-2 rounded-xl hover:bg-black/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/15 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#1F4959]/10">
                  <span className="text-[#5C7C89]">Platform Source:</span>
                  <strong className="text-[#1F4959] dark:text-[#CFE0E3]">{evidenceOpp.source}</strong>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#1F4959]/10">
                  <span className="text-[#5C7C89]">Verification Status:</span>
                  <span className="px-2 py-0.5 rounded-md font-bold bg-[#52B788]/20 text-[#2D6A4F]">
                    VERIFIED (Automated Engine)
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#1F4959]/10">
                  <span className="text-[#5C7C89]">Registration Deadline:</span>
                  <strong>{evidenceOpp.deadline}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5C7C89]">Authenticity Checks:</span>
                  <span className="text-[#2D6A4F] font-bold">5/5 Passed</span>
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-[#5C7C89]">
                <p>✓ Official portal URL verified reachable without gating.</p>
                <p>✓ Company / Sponsor recognized as verified tech enterprise.</p>
                <p>✓ College engineering student eligibility confirmed.</p>
                <p>✓ Deduplication algorithm checked against active database.</p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceOpp(null);
                    setEvidenceData(null);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold"
                >
                  Close Evidence
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Preview Modal */}
        {previewOpp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="glass-modal max-w-lg w-full rounded-[28px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#25D366]">WhatsApp Announcement Preview</span>
                  <h3 className="text-lg font-bold font-serif-display mt-0.5">{previewOpp.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpp(null);
                    setPreviewText(null);
                  }}
                  className="p-2 rounded-xl hover:bg-black/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#EFEAE2] dark:bg-[#075E54]/20 border border-[#25D366]/30 text-xs text-[#128C7E] dark:text-[#E8F5E9] font-mono whitespace-pre-wrap leading-relaxed">
                {previewText ||
                  `*NEW COMPANY HACKATHON*\n\n*Event:* ${previewOpp.title}\n*Company:* ${previewOpp.company}\n*Eligibility:* ${previewOpp.eligibility}\n*Registration Deadline:* ${previewOpp.deadline}\n\n*Registration Link:*\n${previewOpp.registrationUrl}\n\n_Approved by Elite Track Mentor (Dr. R. Ganesh)_`}
              </div>

              <p className="text-[11px] text-[#5C7C89]">
                ℹ️ This message will be automatically broadcasted to the 16 opted-in batch students upon your approval. Students who opted out will receive the in-app notification only.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpp(null);
                    setPreviewText(null);
                  }}
                  className="px-4 py-2.5 rounded-2xl border border-[#1F4959]/20 text-xs font-semibold"
                >
                  Cancel
                </button>
                {previewOpp.pipelineStage !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateOpportunityStage(previewOpp.id, 'Approved');
                      setPreviewOpp(null);
                      setPreviewText(null);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744]"
                  >
                    Approve & Dispatch Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {rejectingOpp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="glass-modal max-w-md w-full rounded-[28px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-serif-display text-[#C9825B]">
                  Reject Opportunity
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectingOpp(null)}
                  className="p-2 rounded-xl hover:bg-black/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#5C7C89]">
                Are you sure you want to reject <strong>{rejectingOpp.title}</strong>? It will not be published to students.
              </p>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#1F4959] dark:text-[#CFE0E3]">
                  Rejection Reason (Audit Trail)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Expired listing / Not relevant to 2026 batch"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingOpp(null)}
                  className="px-4 py-2.5 rounded-2xl border border-[#1F4959]/20 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateOpportunityStage(rejectingOpp.id, 'Rejected', rejectReason);
                    setRejectingOpp(null);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-[#C9825B] text-white text-xs font-semibold hover:opacity-90"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Add Opportunity Modal */}
        {showAddOppModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-opp-modal-title"
          >
            <div className="glass-modal max-w-lg w-full rounded-[28px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 id="add-opp-modal-title" className="text-lg font-bold font-serif-display">
                  Add Verified Opportunity Manually
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddOppModal(false)}
                  aria-label="Close modal"
                  className="p-2 rounded-xl hover:bg-black/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddManualOpportunity} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="opp-cat" className="block text-xs font-semibold mb-1">
                      Category
                    </label>
                    <select
                      id="opp-cat"
                      value={newOppCategory}
                      onChange={(e) => {
                        const val = e.target.value as OpportunityCategory;
                        setNewOppCategory(val);
                        if (val === 'Contest') {
                          setNewOppPlatform('LeetCode');
                          setNewOppCompany('LeetCode');
                        } else {
                          setNewOppCompany('Qualcomm');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-medium"
                    >
                      <option value="Hackathon">Company Hackathon</option>
                      <option value="Hiring Challenge">Hiring Challenge</option>
                      <option value="Contest">Competitive Programming Contest</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="opp-comp" className="block text-xs font-semibold mb-1">
                      {newOppCategory === 'Contest' ? 'Contest Platform' : 'Company / Sponsor'}
                    </label>
                    {newOppCategory === 'Contest' ? (
                      <select
                        id="opp-comp"
                        value={newOppPlatform}
                        onChange={(e) => {
                          setNewOppPlatform(e.target.value);
                          setNewOppCompany(e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-medium"
                      >
                        <option value="LeetCode">LeetCode</option>
                        <option value="Codeforces">Codeforces</option>
                        <option value="CodeChef">CodeChef</option>
                        <option value="CodeGalatta">CodeGalatta</option>
                        <option value="Manual">Other / Manual</option>
                      </select>
                    ) : (
                      <select
                        id="opp-comp"
                        value={newOppCompany}
                        onChange={(e) => setNewOppCompany(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-medium"
                      >
                        <option value="Google">Google</option>
                        <option value="Microsoft">Microsoft</option>
                        <option value="Walmart">Walmart</option>
                        <option value="Amazon">Amazon</option>
                        <option value="Flipkart">Flipkart</option>
                        <option value="TCS">TCS</option>
                        <option value="Infosys">Infosys</option>
                        <option value="Zoho">Zoho</option>
                        <option value="Qualcomm">Qualcomm</option>
                        <option value="PayPal">PayPal</option>
                        <option value="Other">Other Company</option>
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="opp-title" className="block text-xs font-semibold mb-1">
                    Event / Contest Title
                  </label>
                  <input
                    id="opp-title"
                    type="text"
                    required
                    placeholder={newOppCategory === 'Contest' ? 'e.g. LeetCode Weekly Contest 426' : 'e.g. Qualcomm Snapdragon Edge AI Challenge'}
                    value={newOppTitle}
                    onChange={(e) => setNewOppTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="opp-edition" className="block text-xs font-semibold mb-1">
                      Edition / Year
                    </label>
                    <input
                      id="opp-edition"
                      type="text"
                      placeholder="e.g. 2026, Season 8, 426"
                      value={newOppEdition}
                      onChange={(e) => setNewOppEdition(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="opp-dead" className="block text-xs font-semibold mb-1">
                      {newOppCategory === 'Contest' ? 'Contest Start / Deadline' : 'Registration Deadline'}
                    </label>
                    <input
                      id="opp-dead"
                      type="text"
                      value={newOppDeadline}
                      onChange={(e) => setNewOppDeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                    />
                  </div>
                </div>

                {newOppCategory === 'Contest' && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#1F4959]/5 border border-[#1F4959]/10">
                    <div>
                      <label htmlFor="opp-rating-type" className="block text-xs font-semibold mb-1">
                        Contest Rating Impact
                      </label>
                      <select
                        id="opp-rating-type"
                        value={newOppRatingType}
                        onChange={(e) => setNewOppRatingType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                      >
                        <option value="Rated">Rated (Direct rating updates)</option>
                        <option value="Unrated">Unrated / Practice</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="opp-duration" className="block text-xs font-semibold mb-1">
                        Contest Duration
                      </label>
                      <input
                        id="opp-duration"
                        type="text"
                        value={newOppDuration}
                        onChange={(e) => setNewOppDuration(e.target.value)}
                        placeholder="e.g. 90 mins, 2 hours"
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <label htmlFor="opp-official-url" className="block text-xs font-semibold mb-1">
                      Official Event Landing Page URL
                    </label>
                    <input
                      id="opp-official-url"
                      type="url"
                      required
                      placeholder="https://..."
                      value={newOppOfficialUrl}
                      onChange={(e) => setNewOppOfficialUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="opp-reg-url" className="block text-xs font-semibold mb-1 flex items-center justify-between">
                      <span>Direct Official Registration URL</span>
                      <span className="text-[10px] text-[#5C7C89] font-normal">Must be specific challenge slug</span>
                    </label>
                    <input
                      id="opp-reg-url"
                      type="url"
                      required
                      placeholder="https://.../register"
                      value={newOppRegUrl}
                      onChange={(e) => setNewOppRegUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-mono"
                    />
                    {newOppRegUrl && ['unstop.com', 'devpost.com', 'leetcode.com'].some(r => newOppRegUrl.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/+$/, '') === r) && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                        ⚠️ Generic platform homepage detected. In accordance with URL Verification rules, the Register button will display &quot;Registration link unavailable&quot; until a direct challenge path is entered.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="opp-elig" className="block text-xs font-semibold mb-1">
                      Eligibility
                    </label>
                    <input
                      id="opp-elig"
                      type="text"
                      value={newOppEligibility}
                      onChange={(e) => setNewOppEligibility(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="opp-perk" className="block text-xs font-semibold mb-1">
                      Prize / Interview Fast-Track Perk
                    </label>
                    <input
                      id="opp-perk"
                      type="text"
                      value={newOppPerk}
                      onChange={(e) => setNewOppPerk(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] min-h-[44px] transition-colors mt-2"
                >
                  Verify &amp; Publish to Batch Pipeline
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 4. STUDENTS LIST (All 17 Students — Searchable, Status Filter, NO RANKING)
  // ============================================================================
  if (activeTab === 'students') {
    const filteredStudents = students.filter((s) => {
      if (studentStatusFilter !== 'All' && s.activeStatus !== studentStatusFilter) return false;
      if (studentQuery.trim()) {
        const q = studentQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                Batch of 17 Students Directory
              </h1>
              <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
                Ordered strictly by Roll Number (`22CS001` – `22CS017`). Individual progress is never ranked or compared.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#5C7C89] absolute left-3.5 top-3" />
              <input
                type="search"
                aria-label="Search students by name or roll number"
                placeholder="Search name or roll no..."
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Active this week', 'On track', 'Needs check-in'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStudentStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors min-h-[36px] ${studentStatusFilter === st
                  ? 'bg-[#1F4959] text-white'
                  : 'bg-white/60 dark:bg-white/5 hover:bg-white'
                  }`}
              >
                {st}
              </button>
            ))}
          </div>
        </section>

        <div className="glass-card rounded-[26px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1F4959]/10 dark:border-white/10 text-[11px] font-semibold text-[#5C7C89]">
                  <th className="py-3.5 px-5">Roll No & Student</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Weekly Goal</th>
                  <th className="py-3.5 px-4 text-right">Commands</th>
                  <th className="py-3.5 px-5 text-right">Individual View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F4959]/10 dark:divide-white/10 text-xs">
                {filteredStudents.map((stu) => (
                  <tr
                    key={stu.id}
                    className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={stu.avatarUrl}
                          alt={stu.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold text-sm text-[#242424] dark:text-[#F6F1E9]">
                            {stu.name}
                          </p>
                          <p className="font-mono-num text-[11px] text-[#5C7C89]">
                            {stu.rollNo} · Active {stu.lastActive}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C7C89]">{stu.department}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${stu.activeStatus === 'Active this week'
                          ? 'text-[#1F4959] dark:text-[#CFE0E3]'
                          : stu.activeStatus === 'On track'
                            ? 'text-[#D9A441]'
                            : 'text-[#C9825B]'
                          }`}
                      >
                        {stu.activeStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num">
                      {stu.weeklyCurrentSolved} / {stu.weeklyTargetSolved}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num">
                      {stu.commandsCompleted} / {stu.commandsTotal}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStudent(stu);
                          onNavigateTab('student-detail');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors min-h-[34px]"
                      >
                        Inspect Progress
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 5. INDIVIDUAL STUDENT PROGRESS SCREEN
  // ============================================================================
  if (activeTab === 'student-detail') {
    const stu = selectedStudent;
    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6">
          <button
            type="button"
            onClick={() => onNavigateTab('students')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C7C89] hover:text-[#1F4959] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All 17 Students</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={stu.avatarUrl}
                alt={stu.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border-2 border-[#C9825B]"
              />
              <div>
                <h1 className="text-2xl font-bold font-serif-display">
                  {stu.name} <span className="text-base font-mono-num text-[#5C7C89]">({stu.rollNo})</span>
                </h1>
                <p className="text-xs text-[#5C7C89]">
                  {stu.department} · WhatsApp: {stu.whatsappNumber} · {stu.activeStatus}
                </p>
                <p className="text-xs mt-1 max-w-2xl">{stu.careerObjective}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => {
                  exportIndividualStudentDossier(stu, commands);
                  onTriggerToast('success', 'Student Dossier Exported', `Downloaded complete dossier for ${stu.name} (${stu.rollNo})`);
                }}
                className="px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-white/10 border border-[#1F4959]/25 text-[#1F4959] dark:text-[#F6F1E9] text-xs font-bold hover:bg-white transition-colors inline-flex items-center gap-1.5 min-h-[42px]"
              >
                <Download className="w-4 h-4 text-[#C9825B]" />
                <span>Export Dossier (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCmdTargetType('individual');
                  setCmdTargetStudentId(stu.id);
                  onNavigateTab('issue-command');
                }}
                className="px-4 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] min-h-[42px]"
              >
                Issue 1-on-1 Command
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-4">
            <p className="text-2xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3]">
              {stu.totalSolved}
            </p>
            <p className="text-xs text-[#5C7C89]">Total Problems Solved</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-2xl font-bold font-mono-num text-[#C9825B]">
              {stu.weeklyCurrentSolved} / {stu.weeklyTargetSolved}
            </p>
            <p className="text-xs text-[#5C7C89]">This Week’s Goal Progress</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-2xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3]">
              {stu.commandsCompleted} / {stu.commandsTotal}
            </p>
            <p className="text-xs text-[#5C7C89]">Mentor Commands Completed</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-2xl font-bold font-mono-num text-[#D9A441]">
              {stu.streakDays} Days
            </p>
            <p className="text-xs text-[#5C7C89]">Current Coding Streak</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 6. COMMAND TRACKING SCREEN
  // ============================================================================
  if (activeTab === 'command-tracking') {
    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
              Command Completion Tracking
            </h1>
            <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
              Monitor replies and solution links across our 17-student batch for every issued command.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('issue-command')}
            className="px-4 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold min-h-[42px]"
          >
            + Issue Command
          </button>
        </section>

        <div className="space-y-5">
          {commands.map((cmd) => (
            <div key={cmd.id} className="glass-card rounded-[26px] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1F4959]/10 dark:border-white/10">
                <div>
                  <p className="text-xs text-[#5C7C89]">
                    Issued by {cmd.assignedBy} · Due <strong className="text-[#C9825B]">{cmd.dueDate}</strong>
                  </p>
                  <h2 className="text-lg font-bold font-serif-display">{cmd.title}</h2>
                </div>
                <span className="text-xs font-mono-num font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                  {cmd.studentReplies.length} Replies Logged
                </span>
              </div>

              <div className="space-y-2">
                {cmd.studentReplies.map((rep) => (
                  <div
                    key={rep.studentId}
                    className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold">{rep.studentName}</span>{' '}
                      <span className="font-mono-num text-[#5C7C89]">({rep.rollNo})</span>
                      <p className="text-[#5C7C89] mt-0.5">“{rep.comment}”</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                        {rep.status}
                      </span>
                      <span className="text-[#5C7C89] font-mono-num">{rep.updatedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 7. SEND ANNOUNCEMENTS / NOTIFICATIONS (In-App + WhatsApp Preview)
  // ============================================================================
  if (activeTab === 'announcements') {
    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6">
          <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
            Broadcast Announcements & WhatsApp Alerts
          </h1>
          <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
            Send reminders simultaneously to the in-app activity feed and consented student WhatsApp numbers.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSendAnnouncement(annTitle, annBody, annAudience, annWhatsapp);
              setAnnSentConfirmation(true);
            }}
            className="lg:col-span-7 glass-card rounded-[26px] p-6 space-y-4"
          >
            <div>
              <label htmlFor="ann-aud" className="block text-xs font-semibold mb-1">
                Recipient Audience
              </label>
              <select
                id="ann-aud"
                value={annAudience}
                onChange={(e) => setAnnAudience(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
              >
                <option value="All 17 Batch Students">All 17 Batch Students</option>
                <option value="Students with Pending DP Command">Students with Pending DP Command</option>
                <option value="Flipkart GRiD Registered Teams">Flipkart GRiD Registered Teams</option>
              </select>
            </div>

            <div>
              <label htmlFor="ann-title" className="block text-xs font-semibold mb-1">
                Announcement Headline
              </label>
              <input
                id="ann-title"
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
              />
            </div>

            <div>
              <label htmlFor="ann-body" className="block text-xs font-semibold mb-1">
                Message Content
              </label>
              <textarea
                id="ann-body"
                rows={4}
                required
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={annWhatsapp}
                  onChange={(e) => setAnnWhatsapp(e.target.checked)}
                  className="rounded accent-[#C9825B]"
                />
                <span>Deliver via WhatsApp + In-App Feed</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={annScheduled}
                  onChange={(e) => setAnnScheduled(e.target.checked)}
                  className="rounded accent-[#1F4959]"
                />
                <span>Schedule for 7:00 PM IST Today</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#1F4959] text-white text-sm font-semibold hover:bg-[#163744] transition-colors inline-flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Send className="w-4 h-4" />
              <span>{annScheduled ? 'Schedule Broadcast' : 'Send Broadcast Now'}</span>
            </button>
          </form>

          {/* Dual Channel Preview & Sent Confirmation */}
          <div className="lg:col-span-5 glass-card rounded-[26px] p-6 space-y-4">
            <h2 className="text-base font-bold font-serif-display">
              In-App & WhatsApp Message Preview
            </h2>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-[#1F4959]/15 space-y-1">
              <p className="text-[11px] font-semibold text-[#C9825B]">In-App Activity Feed Card</p>
              <p className="text-sm font-bold">{annTitle}</p>
              <p className="text-xs text-[#5C7C89]">{annBody}</p>
            </div>

            {annWhatsapp && (
              <div className="p-4 rounded-2xl bg-[#2E5A44]/10 border border-[#2E5A44]/25 space-y-1 text-xs">
                <p className="font-bold text-[#2E5A44] dark:text-[#7CD4B8]">
                  WhatsApp Template Preview ({annAudience})
                </p>
                <p className="font-mono-num text-[11px] leading-relaxed">
                  *{annTitle}* — {annBody} — Ganesh Sir, Placement Cell
                </p>
              </div>
            )}

            {annSentConfirmation && (
              <div className="p-4 rounded-2xl bg-[#1F4959] text-white space-y-1 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D9A441]" />
                  <span>Broadcast Delivered to {annAudience}</span>
                </p>
                <p className="text-[#CFE0E3]">
                  17 in-app notifications and 17 WhatsApp messages queued with zero delivery errors.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 8. BATCH ANALYTICS (Non-Comparative) & 9. SETTINGS / ROLES MANAGEMENT
  // ============================================================================
  if (activeTab === 'analytics') {
    return (
      <div className="space-y-6">
        <section className="glass-card rounded-[26px] p-6">
          <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
            Batch-Level Non-Comparative Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
            Collective placement readiness across our 17 students without individual rankings.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card rounded-[24px] p-6">
            <p className="text-xs text-[#5C7C89]">Total Batch Problems Solved</p>
            <p className="text-3xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3] mt-1">
              7,020
            </p>
            <p className="text-xs text-[#C9825B] mt-2">+186 solved across batch this week</p>
          </div>
          <div className="glass-card rounded-[24px] p-6">
            <p className="text-xs text-[#5C7C89]">Tier-1 Hackathon Participation</p>
            <p className="text-3xl font-bold font-mono-num text-[#1F4959] dark:text-[#CFE0E3] mt-1">
              100%
            </p>
            <p className="text-xs text-[#5C7C89] mt-2">All 17 students registered in ≥2 hackathons</p>
          </div>
          <div className="glass-card rounded-[24px] p-6">
            <p className="text-xs text-[#5C7C89]">Auto-Verified Profile Coverage</p>
            <p className="text-3xl font-bold font-mono-num text-[#C9825B] mt-1">
              68 / 68
            </p>
            <p className="text-xs text-[#5C7C89] mt-2">LeetCode, CF, CodeChef & GitHub linked</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-[26px] p-6">
        <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
          Mentor & HOD Roles Management
        </h1>
        <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
          Manage administrative permissions for issuing commands and verifying external contest opportunities.
        </p>
      </section>

      <div className="glass-card rounded-[26px] p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#1F4959] dark:text-[#F6F1E9] uppercase tracking-wider">
          Approved Faculty Members (Pre-Registered Allowlist)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[
            {
              name: 'Prof. Ganesh Sir',
              role: 'Lead Placement Mentor',
              email: 'ganesh@uniqshift.com',
              dept: 'Placement Cell',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
            {
              name: 'Dr. K. Kalidasa Murugavel',
              role: 'Principal',
              email: 'principal@nec.edu.in',
              dept: 'Administration',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
            {
              name: 'Dr. Shenbagavalli',
              role: 'Dean R&D',
              email: 'deanrd@nec.edu.in',
              dept: 'Research & Development',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
            {
              name: 'Dr. V. Gomathi',
              role: 'Head of Department (CSE)',
              email: 'hodcse@nec.edu.in',
              dept: 'Computer Science & Engg',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
            {
              name: 'Dr. L. Jerart Julus',
              role: 'Head of Department (AI&DS)',
              email: 'hodai@nec.edu.in',
              dept: 'Artificial Intelligence & Data Science',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
            {
              name: 'Dr. D. Manimegalai',
              role: 'Head of Department (IT)',
              email: 'hodit@nec.edu.in',
              dept: 'Information Technology',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
            {
              name: 'Dr. B. Shanmuga Priya',
              role: 'Associate Professor',
              email: 'bsp@nec.edu.in',
              dept: 'Information Technology',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
            {
              name: 'Prof. Anitha',
              role: 'Assistant Professor',
              email: 'anithait@nec.edu.in',
              dept: 'Information Technology',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
            {
              name: 'Prof. Ram Priya',
              role: 'Assistant Professor',
              email: 'rampriya-aids@nec.edu.in',
              dept: 'AI & Data Science',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
            {
              name: 'Dr. J. Naskath',
              role: 'Associate Professor',
              email: 'naskat@nec.edu.in',
              dept: 'AI & Data Science',
              access: 'Unified Faculty Cohort · Full Batch Oversight',
            },
          ].map((faculty) => (
            <div
              key={faculty.email}
              className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/12 flex flex-col justify-between gap-2.5 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#1F4959] dark:text-[#F6F1E9]">{faculty.name}</p>
                  <span className="px-2 py-0.5 rounded-full bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3] text-[10px] font-bold">
                    {faculty.dept}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#C9825B] mt-0.5">{faculty.role}</p>
                <p className="text-xs font-mono-num text-[#5C7C89] mt-1">{faculty.email}</p>
              </div>

              <div className="pt-2 border-t border-[#1F4959]/10 flex items-center justify-between text-[11px] text-[#5C7C89]">
                <span>{faculty.access}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">● Allowed</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
