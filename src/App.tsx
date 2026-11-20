/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  Code2,
  Compass,
  ExternalLink,
  Home,
  Layers,
  LogOut,
  Moon,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  Trophy,
  User,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  AchievementItem,
  ActivityNotification,
  AdminTab,
  AuthScreen,
  CodingPlatformProfile,
  CommandStatus,
  MentorCommand,
  Opportunity,
  PipelineStage,
  StudentRecord,
  StudentTab,
  SystemStateScreen,
  ToastMessage,
  UserRole,
} from './types';
import {
  INITIAL_ACHIEVEMENTS,
  INITIAL_COMMANDS,
  INITIAL_NOTIFICATIONS,
  INITIAL_OPPORTUNITIES,
  INITIAL_STUDENTS,
} from './data/seedData';
import {
  calculateTotalSolvedAcrossPlatforms,
  updateCommandReply,
} from './utils/logic';
import { AuthAndOnboarding } from './components/AuthAndOnboarding';
import { DesignSystemDrawer } from './components/DesignSystemDrawer';
import { SystemStatesView } from './components/SystemStatesView';
import { StudentPrimaryViews } from './components/StudentPrimaryViews';
import { StudentSecondaryViews } from './components/StudentSecondaryViews';
import { AdminViews } from './components/AdminViews';
import { PWAInstallButton } from './components/PWAInstallButton';
import { CompanyMonogram } from './components/Illustrations';
import { api, DiscoveryObservabilityStats } from './utils/apiClient';

export default function App() {
  // Check localStorage for active session, otherwise default to login
  const getInitialAuth = (): AuthScreen => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('elite_track_auth');
      if (stored === 'authenticated') return 'authenticated';
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'authenticated';
      if (params.get('auth') === 'splash') return 'splash';
      if (params.get('auth') === 'onboarding') return 'onboarding';
    }
    return 'login';
  };

  const getInitialRole = (): UserRole => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('elite_track_role');
      if (storedRole === 'admin' || storedRole === 'faculty') return 'admin';
      if (storedRole === 'student') return 'student';
    }
    return 'student';
  };

  const [authScreen, setAuthScreen] = useState<AuthScreen>(getInitialAuth);
  const [role, setRole] = useState<UserRole>(getInitialRole);
  const [studentTab, setStudentTab] = useState<StudentTab>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('elite_track_auth');
    localStorage.removeItem('elite_track_role');
    localStorage.removeItem('elite_track_email');
    setAuthScreen('login');
  };

  // Core Shared Domain State (End-to-End Wired between Student and Mentor/Admin)
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [selectedAdminStudent, setSelectedAdminStudent] = useState<StudentRecord>(
    INITIAL_STUDENTS[0]
  );
  const [commands, setCommands] = useState<MentorCommand[]>(INITIAL_COMMANDS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [achievements] = useState<AchievementItem[]>(INITIAL_ACHIEVEMENTS);
  const [notifications, setNotifications] = useState<ActivityNotification[]>(
    INITIAL_NOTIFICATIONS
  );

  // Modals & Drawers
  const [systemState, setSystemState] = useState<SystemStateScreen>('none');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);
  const [quickReplyCommand, setQuickReplyCommand] = useState<MentorCommand | null>(null);
  const [quickReplyStatus, setQuickReplyStatus] = useState<CommandStatus>('Done');
  const [quickReplyComment, setQuickReplyComment] = useState('');

  // Edge State & Skeleton toggles
  const [isSkeletonMode, setIsSkeletonMode] = useState(false);
  const [isOfflineBanner, setIsOfflineBanner] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Real backend discovery and observability state
  const [discoveryStats, setDiscoveryStats] = useState<DiscoveryObservabilityStats | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const currentStudent = students[0];

  // Load persistent opportunities and observability stats from real Obj3 backend
  useEffect(() => {
    let isMounted = true;
    async function loadOpportunitiesFromBackend() {
      try {
        const backendOpps = await api.getOpportunities(role, currentStudent?.id);
        if (isMounted && backendOpps && backendOpps.length > 0) {
          setOpportunities(backendOpps);
        }
        if (role === 'admin') {
          const stats = await api.getDiscoveryStatus();
          if (isMounted && stats) {
            setDiscoveryStats(stats);
          }
        }
      } catch (err) {
        console.warn('[App] Backend connection error, maintaining initial state:', err);
      }
    }
    loadOpportunitiesFromBackend();
    return () => {
      isMounted = false;
    };
  }, [role, currentStudent?.id]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Listen to browser online/offline events
  useEffect(() => {
    const onOnline = () => setIsOfflineBanner(false);
    const onOffline = () => setIsOfflineBanner(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const triggerToast = (
    type: 'success' | 'error' | 'info',
    title: string,
    description?: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const handleUpdateCurrentStudent = (updated: StudentRecord) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleReplyCommand = (
    commandId: string,
    newStatus: CommandStatus,
    newComment: string
  ) => {
    setCommands((prev) =>
      updateCommandReply(
        prev,
        commandId,
        currentStudent.id,
        currentStudent.name,
        currentStudent.rollNo,
        newStatus,
        newComment,
        'Just now'
      )
    );
    triggerToast(
      'success',
      `Command marked as "${newStatus}"`,
      'Ganesh Sir can now see your updated progress note.'
    );
  };

  const handleIssueCommand = (newCmd: MentorCommand) => {
    setCommands((prev) => [newCmd, ...prev]);
    const newNotif: ActivityNotification = {
      id: `notif-${Date.now()}`,
      title: `Ganesh Sir issued: ${newCmd.title}`,
      message: `${newCmd.description} · Due ${newCmd.dueDate}. WhatsApp reminder also dispatched.`,
      timestamp: 'Just now',
      timeBucket: 'today',
      type: 'command',
      unread: true,
      actionTab: 'commands',
    };
    setNotifications((prev) => [newNotif, ...prev]);
    triggerToast(
      'success',
      'Command Issued & Notifications Sent',
      `Delivered "${newCmd.title}" to in-app feed and WhatsApp.`
    );
  };

  const handleUpdateOpportunityStage = async (
    oppId: string,
    nextStage: PipelineStage,
    reason?: string
  ) => {
    const target = opportunities.find((o) => o.id === oppId);
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, pipelineStage: nextStage } : o))
    );

    // Call persistent backend API
    const res = await api.updateOpportunityStage(oppId, nextStage, reason);

    if (nextStage === 'Approved' && target) {
      const notif: ActivityNotification = {
        id: `notif-${Date.now()}`,
        title: `Verified Opportunity: ${target.title}`,
        message: `Approved by Ganesh Sir (${target.company}) · Deadline ${target.deadline}.`,
        timestamp: 'Just now',
        timeBucket: 'today',
        type: 'opportunity',
        unread: true,
        actionTab: 'opportunities',
      };
      setNotifications((prev) => [notif, ...prev]);

      const waCount = res.distribution?.whatsappQueuedCount ?? 16;
      triggerToast(
        'success',
        `${target.company} Opportunity Approved!`,
        `Published to all 17 students and dispatched via WhatsApp to ${waCount} consented students.`
      );
    } else {
      triggerToast(
        'info',
        `Moved to ${nextStage}`,
        target ? `${target.title} is now ${nextStage}.` : undefined
      );
    }

    // Refresh observability metrics
    const freshStats = await api.getDiscoveryStatus();
    if (freshStats) setDiscoveryStats(freshStats);
  };

  const handleAddOpportunity = async (newOpp: Opportunity) => {
    setOpportunities((prev) => [newOpp, ...prev]);
    await api.createOpportunity(newOpp);

    const notif: ActivityNotification = {
      id: `notif-${Date.now()}`,
      title: `New ${newOpp.company} ${newOpp.category}: ${newOpp.title}`,
      message: `Added by Ganesh Sir · Deadline ${newOpp.deadline}.`,
      timestamp: 'Just now',
      timeBucket: 'today',
      type: 'opportunity',
      unread: true,
      actionTab: 'opportunities',
    };
    setNotifications((prev) => [notif, ...prev]);
    triggerToast(
      'success',
      'Opportunity Published',
      `Added ${newOpp.title} to the verified student feed.`
    );
  };

  const handleToggleSaveOpportunity = async (oppId: string) => {
    const target = opportunities.find((o) => o.id === oppId);
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, saved: !o.saved } : o))
    );
    await api.toggleSave(oppId, currentStudent?.id);
    if (target) {
      triggerToast(
        'info',
        target.saved ? 'Removed from Saved' : 'Saved Opportunity',
        target.title
      );
    }
  };

  const handleToggleRemindOpportunity = async (oppId: string) => {
    const target = opportunities.find((o) => o.id === oppId);
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, remindMe: !o.remindMe } : o))
    );
    await api.toggleRemind(oppId, currentStudent?.id);
    if (target) {
      triggerToast(
        'success',
        target.remindMe ? 'WhatsApp Reminder Cancelled' : 'WhatsApp Reminder Set',
        target.remindMe
          ? `Removed alert for ${target.company}`
          : `We’ll ping ${currentStudent.whatsappNumber} 24h before ${target.deadline}.`
      );
    }
  };

  const handleUpdateParticipationStatus = async (
    oppId: string,
    status: string,
    notes?: string
  ) => {
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === oppId
          ? {
            ...o,
            participationStatus: status,
            registrationConfirmedAt: status === 'Registered' ? new Date().toISOString() : o.registrationConfirmedAt,
          }
          : o
      )
    );
    await api.updateParticipationStatus(oppId, status, notes, currentStudent?.id);
    triggerToast(
      'success',
      'Participation Status Updated',
      `Marked as ${status} for ${opportunities.find((o) => o.id === oppId)?.title || 'opportunity'}.`
    );
  };

  const handleTriggerDiscovery = async (sourceId?: string) => {
    setIsDiscovering(true);
    triggerToast('info', 'Discovery Engine Triggered', 'Scanning Devpost, MyCareernet, Codeforces, LeetCode, CodeChef, CodeGalatta...');
    try {
      const res = await api.triggerDiscovery(sourceId);
      if (res.success) {
        const freshOpps = await api.getOpportunities(role, currentStudent?.id);
        if (freshOpps && freshOpps.length > 0) {
          setOpportunities(freshOpps);
        }
        const stats = await api.getDiscoveryStatus();
        if (stats) setDiscoveryStats(stats);
        triggerToast(
          'success',
          'Discovery Run Completed',
          `Found ${res.summary?.totalFound ?? 0} events (${res.summary?.totalCreated ?? 0} new, ${res.summary?.totalUpdated ?? 0} refreshed).`
        );
      } else {
        triggerToast('error', 'Discovery Run Failed', 'Could not complete discovery run');
      }
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSendAnnouncement = (
    title: string,
    message: string,
    audience: string,
    viaWhatsapp: boolean
  ) => {
    const notif: ActivityNotification = {
      id: `notif-${Date.now()}`,
      title: `Mentor Broadcast: ${title}`,
      message: `${message} (${viaWhatsapp ? 'In-App + WhatsApp' : 'In-App'})`,
      timestamp: 'Just now',
      timeBucket: 'today',
      type: 'whatsapp',
      unread: true,
      actionTab: 'commands',
    };
    setNotifications((prev) => [notif, ...prev]);
    triggerToast(
      'success',
      'Announcement Sent',
      `Delivered to ${audience} (${viaWhatsapp ? 'In-App + WhatsApp' : 'In-App only'}).`
    );
  };

  const handleManualPlatformFallback = (
    platform: string,
    count: number,
    handle: string
  ) => {
    const fallbackProfile: CodingPlatformProfile = {
      id: `manual-${Date.now()}`,
      platform,
      handle,
      url: `https://${platform.toLowerCase()}.com/${handle}`,
      solvedCount: count,
      secondaryLabel: 'Manual Fallback',
      secondaryValue: `${count} Solved`,
      verificationType: 'Self-reported',
      lastSynced: 'Manual entry just now',
      syncStatus: 'synced',
    };
    const exists = currentStudent.platforms.some(
      (p) => p.platform.toLowerCase() === platform.toLowerCase()
    );
    const updatedPlatforms = exists
      ? currentStudent.platforms.map((p) =>
        p.platform.toLowerCase() === platform.toLowerCase()
          ? {
            ...p,
            solvedCount: count,
            handle,
            verificationType: 'Self-reported' as const,
            lastSynced: 'Manual entry just now',
          }
          : p
      )
      : [...currentStudent.platforms, fallbackProfile];

    handleUpdateCurrentStudent({
      ...currentStudent,
      platforms: updatedPlatforms,
      totalSolved: calculateTotalSolvedAcrossPlatforms(updatedPlatforms),
    });
    triggerToast(
      'success',
      'Saved Self-Reported Stats',
      `${platform} updated with ${count} solved problems.`
    );
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen relative film-grain text-[#242424] dark:text-[#F6F1E9] transition-colors">
      {/* Ambient Blurred Warm Cream / Pale-Teal / Sand Gradient Blobs */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#CFE0E3]/65 dark:bg-[#0b2b3c]/60 blur-3xl" />
        <div className="absolute top-1/4 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#E8D8C3]/70 dark:bg-[#1f2421]/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-[#CFE0E3]/50 dark:bg-[#1F4959]/30 blur-3xl" />
      </div>

      {/* Non-Intrusive Offline Mode Banner (PWA & Section 5 Requirement) */}
      {isOfflineBanner && (
        <div
          role="status"
          className="bg-[#D9A441] text-[#1F4959] px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            Looks like you’re offline — viewing cached coding rings, commands, and saved hackathons.
          </span>
          <button
            type="button"
            onClick={() => setIsOfflineBanner(false)}
            className="underline ml-2 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* If viewing Auth or Onboarding screens */}
      {authScreen !== 'authenticated' ? (
        <div className="relative">
          <AuthAndOnboarding
            screen={authScreen}
            role={role}
            onSelectRole={setRole}
            onNavigateAuth={setAuthScreen}
            student={currentStudent}
            onUpdateStudent={handleUpdateCurrentStudent}
            onTriggerToast={triggerToast}
          />
        </div>
      ) : (
        <>
          {/* 3-Zone Top Bar Contract (Brand Wordmark — 5 Concise Single-Line Links — 1 Primary Action) */}
          <header className="sticky top-0 z-30 glass-nav border-b px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-8">
            {/* Zone 1: Single Text Element Wordmark */}
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                if (role === 'student') setStudentTab('home');
                else setAdminTab('dashboard');
              }}
              className="text-lg sm:text-xl font-bold font-serif-display tracking-tight text-[#1F4959] dark:text-[#F6F1E9] whitespace-nowrap shrink-0"
            >
              Elite Track
            </a>

            {/* Zone 2: 5 Single-Line Navigation Links */}
            {role === 'student' ? (
              <nav
                aria-label="Primary student navigation"
                className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-[#5C7C89] dark:text-[#CFE0E3]"
              >
                {[
                  { id: 'home' as const, label: 'Dashboard' },
                  { id: 'commands' as const, label: 'Commands' },
                  { id: 'opportunities' as const, label: 'Opportunities' },
                  { id: 'analytics' as const, label: 'Analytics' },
                  { id: 'profile' as const, label: 'My Profile' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStudentTab(item.id)}
                    className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${studentTab === item.id
                      ? 'text-[#1F4959] dark:text-white border-[#C9825B] font-semibold'
                      : 'border-transparent hover:text-[#1F4959] dark:hover:text-white'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            ) : (
              <nav
                aria-label="Primary mentor navigation"
                className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-[#5C7C89] dark:text-[#CFE0E3]"
              >
                {[
                  { id: 'dashboard' as const, label: 'Overview' },
                  { id: 'leaderboards' as const, label: 'Leaderboard' },
                  { id: 'issue-command' as const, label: 'Issue Command' },
                  { id: 'opportunities-pipeline' as const, label: 'Pipeline' },
                  { id: 'students' as const, label: '17 Students' },
                  { id: 'announcements' as const, label: 'Notify' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAdminTab(item.id)}
                    className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${adminTab === item.id
                      ? 'text-[#1F4959] dark:text-white border-[#C9825B] font-semibold'
                      : 'border-transparent hover:text-[#1F4959] dark:hover:text-white'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}

            {/* Zone 3: Active User Profile & Sign Out */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/70 dark:bg-white/10 border border-[#1F4959]/15 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-[#1F4959] text-[#CFE0E3] flex items-center justify-center text-xs font-bold font-mono">
                  {role === 'admin' ? 'F' : 'S'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight text-[#1F4959] dark:text-[#F6F1E9]">
                    {role === 'admin' ? 'Faculty Portal' : 'Ananya Sharma'}
                  </p>
                  <p className="text-[10px] text-[#C9825B] leading-tight">
                    {role === 'admin' ? 'Full Batch Access' : '22CS001 · Elite Batch'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                aria-label={darkMode ? 'Switch to warm light theme' : 'Switch to deep petrol dark theme'}
                className="p-2 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-[#1F4959] hover:text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center border border-[#1F4959]/10"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-2 rounded-xl bg-white/90 dark:bg-white/10 hover:bg-rose-600 hover:text-white text-[#1F4959] dark:text-[#CFE0E3] text-xs font-bold border border-[#1F4959]/20 transition-all flex items-center gap-1.5 min-h-[38px] shadow-sm"
                title="Sign out of Elite Track"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500 hover:text-white" />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          {/* Workspace Layout: Desktop Sidebar + Main Content Canvas */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-24 lg:pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar Navigation (Desktop) & Sub-screen Explorer */}
            <aside
              aria-label="Workspace screen directory"
              className="lg:col-span-3 space-y-4"
            >
              {/* Role & Flow Switcher Card */}
              <div className="glass-card rounded-[24px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                    {role === 'student' ? 'Student Workspace' : 'Faculty Cohort Hub'}
                  </span>
                </div>

                {/* Desktop Vertical Nav List */}
                {role === 'student' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
                    {[
                      { id: 'home' as const, label: 'Home Dashboard', icon: Home },
                      { id: 'profile' as const, label: 'My Profile (Insta)', icon: User },
                      { id: 'coding-profiles' as const, label: 'Coding Profiles', icon: Code2 },
                      { id: 'analytics' as const, label: 'Progress & Analytics', icon: BarChart3 },
                      { id: 'commands' as const, label: 'Mentor Commands', icon: Terminal },
                      { id: 'opportunities' as const, label: 'Opportunities', icon: Briefcase },
                      { id: 'calendar' as const, label: 'Contest Calendar', icon: Calendar },
                      { id: 'achievements' as const, label: 'Achievements Grid', icon: Award },
                      {
                        id: 'notifications' as const,
                        label: `Notifications (${unreadCount})`,
                        icon: Bell,
                      },
                      { id: 'settings' as const, label: 'Settings & Prefs', icon: Settings },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = studentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setStudentTab(item.id)}
                          className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all min-h-[40px] ${active
                            ? 'bg-[#1F4959] text-white shadow-sm'
                            : 'hover:bg-white/60 dark:hover:bg-white/10 text-[#242424] dark:text-[#CFE0E3]'
                            }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
                    {[
                      { id: 'dashboard' as const, label: 'Faculty Dashboard', icon: Home },
                      { id: 'leaderboards' as const, label: 'Batch Leaderboards', icon: Trophy },
                      { id: 'issue-command' as const, label: 'Issue Command', icon: Terminal },
                      {
                        id: 'opportunities-pipeline' as const,
                        label: 'Opportunity Pipeline',
                        icon: ShieldCheck,
                      },
                      { id: 'students' as const, label: 'Batch of 17 Students', icon: Users },
                      {
                        id: 'student-detail' as const,
                        label: 'Individual Progress',
                        icon: User,
                      },
                      {
                        id: 'command-tracking' as const,
                        label: 'Command Tracking',
                        icon: CheckCircle2,
                      },
                      {
                        id: 'announcements' as const,
                        label: 'Send Notifications',
                        icon: Send,
                      },
                      {
                        id: 'analytics' as const,
                        label: 'Batch Analytics',
                        icon: BarChart3,
                      },
                      {
                        id: 'settings' as const,
                        label: 'Faculty Cohort (12)',
                        icon: Settings,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = adminTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAdminTab(item.id)}
                          className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all min-h-[40px] ${active
                            ? 'bg-[#1F4959] text-white shadow-sm'
                            : 'hover:bg-white/60 dark:hover:bg-white/10 text-[#242424] dark:text-[#CFE0E3]'
                            }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* App Status & Mobile PWA */}
              <div className="glass-card rounded-[24px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#1F4959] dark:text-[#CFE0E3] uppercase tracking-wider">
                    Mobile Experience
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] leading-relaxed">
                  Install Elite Track as a native PWA on Android & iOS for quick daily check-ins.
                </p>
                <PWAInstallButton />
              </div>
            </aside>

            {/* Main Viewport Content Column */}
            <main className="lg:col-span-9 min-w-0">
              {role === 'student' ? (
                studentTab === 'home' ||
                  studentTab === 'profile' ||
                  studentTab === 'coding-profiles' ||
                  studentTab === 'analytics' ? (
                  <StudentPrimaryViews
                    activeTab={studentTab}
                    student={currentStudent}
                    onUpdateStudent={handleUpdateCurrentStudent}
                    commands={commands}
                    opportunities={opportunities}
                    achievements={achievements}
                    onNavigateTab={setStudentTab}
                    onOpenCommandReply={(cmd) => {
                      setQuickReplyCommand(cmd);
                      setQuickReplyStatus(cmd.myStatus);
                      setQuickReplyComment(cmd.myComment);
                    }}
                    onOpenOpportunityDetail={setSelectedOpportunity}
                    onOpenAchievementDetail={setSelectedAchievement}
                    onTriggerToast={triggerToast}
                    onTriggerSystemState={setSystemState}
                    isSkeletonMode={isSkeletonMode}
                  />
                ) : (
                  <StudentSecondaryViews
                    activeTab={studentTab}
                    student={currentStudent}
                    onUpdateStudent={handleUpdateCurrentStudent}
                    commands={commands}
                    onReplyCommand={handleReplyCommand}
                    opportunities={opportunities}
                    onToggleSaveOpportunity={handleToggleSaveOpportunity}
                    onToggleRemindOpportunity={handleToggleRemindOpportunity}
                    onOpenOpportunityDetail={setSelectedOpportunity}
                    achievements={achievements}
                    onOpenAchievementDetail={setSelectedAchievement}
                    notifications={notifications}
                    onMarkAllNotificationsRead={() => {
                      setNotifications((prev) =>
                        prev.map((n) => ({ ...n, unread: false }))
                      );
                      triggerToast('info', 'All Notifications Read');
                    }}
                    onNavigateTab={setStudentTab}
                    darkMode={darkMode}
                    onToggleDarkMode={() => setDarkMode(!darkMode)}
                    onLogout={handleLogout}
                    onTriggerToast={triggerToast}
                    onTriggerSystemState={setSystemState}
                    onUpdateParticipationStatus={handleUpdateParticipationStatus}
                  />
                )
              ) : (
                <AdminViews
                  activeTab={adminTab}
                  onNavigateTab={setAdminTab}
                  students={students}
                  selectedStudent={selectedAdminStudent}
                  onSelectStudent={setSelectedAdminStudent}
                  commands={commands}
                  onIssueCommand={handleIssueCommand}
                  opportunities={opportunities}
                  onUpdateOpportunityStage={handleUpdateOpportunityStage}
                  onAddOpportunity={handleAddOpportunity}
                  onSendAnnouncement={handleSendAnnouncement}
                  onTriggerToast={triggerToast}
                  onTriggerDiscovery={handleTriggerDiscovery}
                  isDiscovering={isDiscovering}
                  discoveryStats={discoveryStats}
                  onPreviewWhatsApp={(oppId) => api.previewWhatsApp(oppId)}
                  onViewEvidence={(oppId) => api.getOpportunityEvidence(oppId)}
                />
              )}
            </main>
          </div>

          {/* Mobile Fixed Bottom Tab Bar (Instagram-Inspired, <15% Sticky Cap) */}
          <nav
            aria-label="Mobile bottom navigation"
            className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-nav border-t h-16 px-2 grid grid-cols-5 items-center"
          >
            {role === 'student'
              ? [
                { id: 'home' as const, label: 'Home', icon: Home },
                { id: 'commands' as const, label: 'Commands', icon: Terminal },
                { id: 'opportunities' as const, label: 'Contests', icon: Compass },
                { id: 'notifications' as const, label: 'Activity', icon: Bell },
                { id: 'profile' as const, label: 'Profile', icon: User },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = studentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStudentTab(tab.id)}
                    className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${active
                      ? 'text-[#C9825B] font-bold'
                      : 'text-[#5C7C89] dark:text-[#89A7B3]'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] mt-0.5">{tab.label}</span>
                  </button>
                );
              })
              : [
                { id: 'dashboard' as const, label: 'Overview', icon: Home },
                { id: 'leaderboards' as const, label: 'Ranking', icon: Trophy },
                { id: 'issue-command' as const, label: 'Command', icon: Terminal },
                { id: 'opportunities-pipeline' as const, label: 'Verify', icon: ShieldCheck },
                { id: 'students' as const, label: 'Batch 17', icon: Users },
                { id: 'announcements' as const, label: 'Notify', icon: Send },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = adminTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAdminTab(tab.id)}
                    className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${active
                      ? 'text-[#C9825B] font-bold'
                      : 'text-[#5C7C89] dark:text-[#89A7B3]'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] mt-0.5">{tab.label}</span>
                  </button>
                );
              })}
          </nav>
        </>
      )}

      {/* Opportunity Detail Modal */}
      {selectedOpportunity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="opp-detail-modal-title"
        >
          <div className="glass-modal max-w-lg w-full rounded-[28px] p-6 sm:p-8 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <CompanyMonogram company={selectedOpportunity.company} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-[#C9825B]">
                      {selectedOpportunity.company} · {selectedOpportunity.category}
                    </p>
                    {selectedOpportunity.edition && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3]">
                        {selectedOpportunity.edition}
                      </span>
                    )}
                  </div>
                  <h2
                    id="opp-detail-modal-title"
                    className="text-xl font-bold font-serif-display mt-0.5"
                  >
                    {selectedOpportunity.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOpportunity(null)}
                aria-label="Close opportunity detail"
                className="p-2 rounded-xl hover:bg-black/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#52B788]/20 text-[#2D6A4F] dark:text-[#74C69D]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Mentor Approved</span>
              </span>
              {selectedOpportunity.eventStatus && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selectedOpportunity.eventStatus === 'Expired'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  : selectedOpportunity.eventStatus === 'Registration Open'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                  }`}>
                  {selectedOpportunity.eventStatus}
                </span>
              )}
              {selectedOpportunity.eventStatus !== 'Expired' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#C9825B]/20 text-[#C9825B]">
                  {selectedOpportunity.daysLeft} days left to register
                </span>
              )}
              {selectedOpportunity.contestRatingType && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#1F4959]/10 text-[#1F4959] dark:text-[#CFE0E3]">
                  {selectedOpportunity.contestRatingType}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-[#242424]/85 dark:text-[#F6F1E9]/85 leading-relaxed">
              {selectedOpportunity.description}
            </p>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/15 space-y-2 text-xs">
              <p>
                <strong>Eligibility:</strong> {selectedOpportunity.eligibility}
              </p>
              <p>
                <strong>Event Format:</strong>{' '}
                <span className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                  {(selectedOpportunity.eventMode || 'online').toLowerCase() === 'offline'
                    ? '🏛️ On-Campus / In-Person'
                    : (selectedOpportunity.eventMode || 'online').toLowerCase() === 'hybrid'
                      ? '⚡ Hybrid (Online Rounds + In-Person Finale)'
                      : '🌐 100% Online'}
                </span>
              </p>
              <p>
                <strong>Key Dates:</strong> {selectedOpportunity.dates} (Registration closes{' '}
                {selectedOpportunity.deadline})
              </p>
              <p>
                <strong>Prizes & Career Perks:</strong> {selectedOpportunity.prizeOrPerk}
              </p>
              <div className="pt-2 border-t border-[#1F4959]/10 flex items-center justify-between">
                <span className="text-[#5C7C89]">My Participation:</span>
                <span className="font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                  {selectedOpportunity.participationStatus || 'Interested'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleUpdateParticipationStatus(selectedOpportunity.id, 'Registered');
                  setSelectedOpportunity((prev) => prev ? { ...prev, participationStatus: 'Registered' } : null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-[#52B788] text-white text-xs font-semibold hover:opacity-90 min-h-[38px]"
              >
                ✓ Mark as Registered
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateParticipationStatus(selectedOpportunity.id, 'Participating');
                  setSelectedOpportunity((prev) => prev ? { ...prev, participationStatus: 'Participating' } : null);
                }}
                className="py-2 px-3 rounded-xl border border-[#1F4959]/20 text-xs font-semibold min-h-[38px]"
              >
                Mark as Participating
              </button>
            </div>

            {/* Official Registration & Event Links (Phase 3) */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              {selectedOpportunity.isRegistrationUrlValid !== false &&
                selectedOpportunity.eventStatus !== 'Expired' &&
                selectedOpportunity.eventStatus !== 'Completed' &&
                selectedOpportunity.eventStatus !== 'Cancelled' &&
                (selectedOpportunity.daysLeft === undefined || selectedOpportunity.daysLeft > 0) &&
                selectedOpportunity.registrationUrl ? (
                <a
                  href={selectedOpportunity.registrationUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() =>
                    triggerToast(
                      'success',
                      `Opening ${selectedOpportunity.company} Portal`,
                      'Remember to update your mentor command once registered.'
                    )
                  }
                  className="flex-1 py-3 px-5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center justify-center gap-2 min-h-[46px]"
                >
                  <span>Register on Official Portal</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="This opportunity has concluded or registration is not open."
                  className="flex-1 py-3 px-5 rounded-2xl bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold cursor-not-allowed inline-flex items-center justify-center gap-2 min-h-[46px] border border-gray-300 dark:border-gray-700 opacity-80"
                >
                  <span>Event Concluded / Registration Closed</span>
                </button>
              )}

              {/* View Official Event Link */}
              {selectedOpportunity.officialEventUrl && (
                <a
                  href={selectedOpportunity.officialEventUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="py-3 px-4 rounded-2xl border border-[#1F4959]/30 text-[#1F4959] dark:text-[#CFE0E3] text-xs font-semibold hover:bg-[#1F4959]/5 inline-flex items-center justify-center gap-1.5 min-h-[46px]"
                >
                  <span>View Official Event</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  handleToggleRemindOpportunity(selectedOpportunity.id);
                  setSelectedOpportunity(null);
                }}
                className="px-4 py-3 rounded-2xl border border-[#1F4959]/20 text-xs font-semibold min-h-[46px]"
              >
                Remind Me on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Post Detail Modal */}
      {selectedAchievement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ach-detail-modal-title"
        >
          <div className="glass-modal max-w-md w-full rounded-[28px] p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#C9825B]">
                  {selectedAchievement.platform} · {selectedAchievement.category} · {selectedAchievement.date}
                </p>
                <h2
                  id="ach-detail-modal-title"
                  className="text-xl font-bold font-serif-display mt-0.5"
                >
                  {selectedAchievement.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                aria-label="Close achievement detail"
                className="p-2 rounded-xl hover:bg-black/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/15 space-y-2">
              <p className="text-sm font-mono-num font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                {selectedAchievement.metricText}
              </p>
              <p className="text-xs text-[#242424]/85 dark:text-[#F6F1E9]/85 leading-relaxed">
                “{selectedAchievement.reflection}”
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-[#5C7C89]">
              <span>Verified by Ganesh Sir (Placement Mentor)</span>
              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                className="px-4 py-2 rounded-xl bg-[#1F4959] text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Command Reply Sheet from Home Dashboard */}
      {quickReplyCommand && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-reply-title"
        >
          <div className="glass-modal w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#C9825B]">
                  Quick Reply to {quickReplyCommand.assignedBy}
                </p>
                <h3 id="quick-reply-title" className="text-lg font-bold font-serif-display">
                  {quickReplyCommand.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickReplyCommand(null)}
                aria-label="Close quick reply"
                className="p-2 rounded-xl hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleReplyCommand(
                  quickReplyCommand.id,
                  quickReplyStatus,
                  quickReplyComment
                );
                setQuickReplyCommand(null);
              }}
              className="space-y-3.5"
            >
              <div>
                <label htmlFor="qr-status" className="block text-xs font-semibold mb-1">
                  Status
                </label>
                <select
                  id="qr-status"
                  value={quickReplyStatus}
                  onChange={(e) => setQuickReplyStatus(e.target.value as CommandStatus)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
                >
                  <option value="Not started">Not started</option>
                  <option value="In progress">In progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div>
                <label htmlFor="qr-comment" className="block text-xs font-semibold mb-1">
                  Progress Note
                </label>
                <textarea
                  id="qr-comment"
                  rows={3}
                  required
                  value={quickReplyComment}
                  onChange={(e) => setQuickReplyComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] min-h-[44px]"
              >
                Submit Status Update
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Design System & UI Kit Drawer (Deliverable 1) */}
      {systemState === 'design-system' && (
        <DesignSystemDrawer
          onClose={() => setSystemState('none')}
          onTriggerSystemState={(st) => setSystemState(st)}
          onTriggerToast={triggerToast}
          isSkeletonMode={isSkeletonMode}
          onToggleSkeletonMode={() => {
            setIsSkeletonMode(!isSkeletonMode);
            setSystemState('none');
          }}
          isOfflineBanner={isOfflineBanner}
          onToggleOfflineBanner={() => setIsOfflineBanner(!isOfflineBanner)}
        />
      )}

      {/* System / Error / Edge State Full-Screen View (Section 5) */}
      {systemState !== 'none' && systemState !== 'design-system' && (
        <SystemStatesView
          state={systemState}
          onClose={() => setSystemState('none')}
          onManualPlatformEntry={handleManualPlatformFallback}
        />
      )}

      {/* Toast Notification Stack */}
      <div
        aria-live="polite"
        className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto glass-modal rounded-2xl p-4 border shadow-lg flex items-start justify-between gap-3 ${t.type === 'error'
              ? 'border-[#C9825B]'
              : t.type === 'success'
                ? 'border-[#1F4959]'
                : 'border-[#D9A441]'
              }`}
          >
            <div>
              <p className="text-xs font-bold text-[#1F4959] dark:text-[#CFE0E3]">
                {t.title}
              </p>
              {t.description && (
                <p className="text-[11px] text-[#5C7C89] dark:text-[#89A7B3] mt-0.5">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((item) => item.id !== t.id))
              }
              aria-label="Dismiss notification"
              className="text-xs text-[#5C7C89] hover:text-[#242424]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
