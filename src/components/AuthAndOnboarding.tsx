import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { AuthScreen, CodingPlatformProfile, StudentRecord, UserRole } from '../types';
import { calculateProgressPercentage, validateProfileInput } from '../utils/logic';
import { verifyUserEmail, signInWithGoogle, isSupabaseConfigured } from '../utils/supabaseClient';
import { WarmIllustration } from './Illustrations';

interface AuthAndOnboardingProps {
  screen: Exclude<AuthScreen, 'authenticated'>;
  role: UserRole;
  onSelectRole: (r: UserRole) => void;
  onNavigateAuth: (next: AuthScreen) => void;
  student: StudentRecord;
  onUpdateStudent: (updated: StudentRecord) => void;
  onTriggerToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AuthAndOnboarding: React.FC<AuthAndOnboardingProps> = ({
  screen,
  role,
  onSelectRole,
  onNavigateAuth,
  student,
  onUpdateStudent,
  onTriggerToast,
}) => {
  // Login form state
  const [email, setEmail] = useState(
    role === 'student' ? 'ananya.22cs001@college.edu' : 'ganesh.mentor@college.edu'
  );
  const [password, setPassword] = useState('EliteBatch2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Forgot password & OTP state
  const [recoveryEmail, setRecoveryEmail] = useState('ananya.22cs001@college.edu');
  const [otpDigits, setOtpDigits] = useState(['4', '8', '2', '9', '1', '6']);
  const [newPassword, setNewPassword] = useState('NewPlacementPrep#26');

  // 6-step Onboarding state
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState(student.name);
  const [rollNo, setRollNo] = useState(student.rollNo);
  const [department, setDepartment] = useState(student.department);
  const [careerObjective, setCareerObjective] = useState(student.careerObjective);
  const [onboardingError, setOnboardingError] = useState('');

  // Coding profile URL inputs with live validation states
  const [lcUrl, setLcUrl] = useState('https://leetcode.com/u/ananya_sundaram');
  const [cfUrl, setCfUrl] = useState('https://codeforces.com/profile/ananya_cf');
  const [ccUrl, setCcUrl] = useState('https://www.codechef.com/users/ananya_cc22');
  const [ghUrl, setGhUrl] = useState('https://github.com/ananya-dev');
  const [checkingPlatform, setCheckingPlatform] = useState<string | null>(null);

  // Step 4: Other platforms manual chips
  const [otherPlatforms, setOtherPlatforms] = useState<{ name: string; count: number }[]>([
    { name: 'AtCoder', count: 18 },
    { name: 'TopCoder', count: 7 },
    { name: 'HackerRank', count: 35 },
  ]);
  const [newPlatName, setNewPlatName] = useState('');
  const [newPlatCount, setNewPlatCount] = useState('');

  // Step 5: Notifications & WhatsApp
  const [inAppEnabled, setInAppEnabled] = useState(student.inAppNotifications);
  const [whatsappNumber, setWhatsappNumber] = useState(student.whatsappNumber);
  const [whatsappConsent, setWhatsappConsent] = useState(student.whatsappConsent);

  const handleRoleSwitch = (nextRole: UserRole) => {
    onSelectRole(nextRole);
    setEmail(nextRole === 'student' ? 'ananya.22cs001@college.edu' : 'ganesh@uniqshift.com');
    setLoginError('');
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    if (isSupabaseConfigured) {
      try {
        await signInWithGoogle();
      } catch (err: any) {
        setLoginError(err.message || 'Google OAuth failed.');
      }
    } else {
      // Local / Offline fallback: prompt for email if not filled
      let targetEmail = email.trim();
      if (!targetEmail || !targetEmail.includes('@')) {
        const entered = window.prompt('Enter your Google email address to sign in:', 'smslgr2512@gmail.com');
        if (!entered) return;
        targetEmail = entered.trim();
        setEmail(targetEmail);
      }

      const verification = await verifyUserEmail(targetEmail, role);
      if (!verification.approved) {
        setLoginError(verification.message || 'Access Denied: Email not registered.');
        return;
      }

      const assignedRole = verification.role === 'faculty' ? 'admin' : 'student';
      onSelectRole(assignedRole);
      localStorage.setItem('elite_track_auth', 'authenticated');
      localStorage.setItem('elite_track_role', assignedRole);
      localStorage.setItem('elite_track_email', targetEmail);
      localStorage.setItem('elite_track_name', verification.name || targetEmail.split('@')[0]);

      onTriggerToast('success', 'Authenticated with Google', `Welcome, ${verification.name || targetEmail}!`);
      onNavigateAuth('authenticated');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setLoginError('Please enter your valid college email address.');
      return;
    }
    if (password.trim().length < 4) {
      setLoginError('Password must be at least 4 characters long.');
      return;
    }

    // Verify against database/allowlist (pass preferred role from tab)
    const verification = await verifyUserEmail(email, role);
    if (!verification.approved) {
      setLoginError(verification.message || 'Access Denied.');
      return;
    }

    setLoginError('');
    const assignedRole = verification.role === 'faculty' ? 'admin' : 'student';
    onSelectRole(assignedRole);
    localStorage.setItem('elite_track_auth', 'authenticated');
    localStorage.setItem('elite_track_role', assignedRole);
    localStorage.setItem('elite_track_email', email);
    localStorage.setItem('elite_track_name', verification.name || email.split('@')[0]);

    onTriggerToast(
      'success',
      `Welcome, ${verification.name || email.split('@')[0]}!`,
      assignedRole === 'student'
        ? 'Your coding workspace is ready.'
        : 'Consolidated batch overview for all 17 students is ready.'
    );
    onNavigateAuth('authenticated');
  };

  const handleStartOnboarding = () => {
    onSelectRole('student');
    setStep(1);
    onNavigateAuth('onboarding');
  };

  const handleAddOtherPlatform = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlatName.trim();
    const countNum = parseInt(newPlatCount, 10);
    if (!trimmed || Number.isNaN(countNum) || countNum < 0) {
      onTriggerToast('error', 'Invalid Platform Entry', 'Provide a platform name and solved count.');
      return;
    }
    setOtherPlatforms((prev) => [...prev, { name: trimmed, count: countNum }]);
    setNewPlatName('');
    setNewPlatCount('');
  };

  const handleFinishOnboarding = () => {
    const extraProfiles: CodingPlatformProfile[] = otherPlatforms.map((op, idx) => ({
      id: `manual-${idx}`,
      platform: op.name,
      handle: student.rollNo.toLowerCase(),
      url: `https://${op.name.toLowerCase().replace(/\s+/g, '')}.com`,
      solvedCount: op.count,
      secondaryLabel: 'Manual Count',
      secondaryValue: `${op.count} Solved`,
      verificationType: 'Self-reported',
      lastSynced: 'Just now',
      syncStatus: 'synced',
    }));

    const coreProfiles = student.platforms.filter((p) =>
      ['LeetCode', 'Codeforces', 'CodeChef', 'GitHub'].includes(p.platform)
    );

    onUpdateStudent({
      ...student,
      name: name.trim() || student.name,
      rollNo: rollNo.trim() || student.rollNo,
      department,
      careerObjective: careerObjective.trim() || student.careerObjective,
      whatsappNumber,
      whatsappConsent,
      inAppNotifications: inAppEnabled,
      platforms: [...coreProfiles, ...extraProfiles],
    });

    onTriggerToast(
      'success',
      'Onboarding Complete!',
      'Your coding profiles and WhatsApp reminders are now linked.'
    );
    onNavigateAuth('authenticated');
  };

  // 1. SPLASH SCREEN
  if (screen === 'splash') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-card max-w-md w-full rounded-[28px] p-8 sm:p-10 flex flex-col items-center">
          <div className="p-1 rounded-full story-ring-active animate-ring-pulse">
            <div className="w-20 h-20 rounded-full bg-[#F6F1E9] dark:bg-[#011425] flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-[#1F4959] text-[#F6F1E9] flex items-center justify-center font-serif-display text-2xl font-bold">
                ET
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif-display mt-6 text-[#1F4959] dark:text-[#F6F1E9]">
            Elite Track
          </h1>
          <p className="text-sm font-medium tracking-wide text-[#C9825B] mt-1.5">
            Track. Participate. Achieve.
          </p>
          <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] mt-3 leading-relaxed">
            Personal placement-prep companion for our 17-student batch, mentored by Ganesh Sir & Department HODs.
          </p>

          <div className="w-full mt-7 space-y-2.5">
            <button
              type="button"
              onClick={() => onNavigateAuth('login')}
              className="w-full py-3 px-5 rounded-2xl bg-[#1F4959] text-white text-sm font-semibold hover:bg-[#163744] transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>Continue to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleStartOnboarding}
              className="w-full py-2.5 px-5 rounded-2xl border border-[#1F4959]/20 dark:border-white/15 bg-white/50 dark:bg-white/5 text-xs font-semibold text-[#1F4959] dark:text-[#CFE0E3] hover:bg-white/80 transition-colors min-h-[44px]"
            >
              First-Time Student Onboarding Wizard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. FORGOT PASSWORD
  if (screen === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card max-w-md w-full rounded-[28px] p-6 sm:p-8">
          <button
            type="button"
            onClick={() => onNavigateAuth('login')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C7C89] hover:text-[#1F4959] mb-4 min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to login</span>
          </button>
          <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
            Forgot your password?
          </h1>
          <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] mt-1.5 leading-relaxed">
            Enter your registered college email address. We’ll send a 6-digit verification code to reset your credentials.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onTriggerToast('info', 'Verification Code Sent', `Sent 6-digit OTP to ${recoveryEmail}`);
              onNavigateAuth('otp-verify');
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <label htmlFor="recovery-email" className="block text-xs font-semibold mb-1.5">
                College Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5C7C89] absolute left-3.5 top-3.5" />
                <input
                  id="recovery-email"
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/75 dark:bg-[#0b2b3c]/70 border border-[#1F4959]/20 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9825B]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#1F4959] text-white text-sm font-semibold hover:bg-[#163744] transition-colors min-h-[48px]"
            >
              Send 6-Digit Verification OTP
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. OTP / VERIFY EMAIL
  if (screen === 'otp-verify') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card max-w-md w-full rounded-[28px] p-6 sm:p-8">
          <button
            type="button"
            onClick={() => onNavigateAuth('forgot-password')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C7C89] hover:text-[#1F4959] mb-4 min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change email</span>
          </button>

          <h1 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
            Verify your college email
          </h1>
          <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] mt-1.5">
            Enter the 6-digit code sent to <span className="font-semibold">{recoveryEmail}</span>
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onNavigateAuth('reset-success');
            }}
            className="mt-6 space-y-5"
          >
            <div className="grid grid-cols-6 gap-2">
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  aria-label={`OTP digit ${i + 1}`}
                  value={digit}
                  onChange={(e) => {
                    const next = [...otpDigits];
                    next[i] = e.target.value.slice(-1);
                    setOtpDigits(next);
                  }}
                  className="w-full h-12 text-center font-mono-num text-base font-bold rounded-xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/25 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#C9825B]"
                />
              ))}
            </div>

            <div>
              <label htmlFor="new-reset-password" className="block text-xs font-semibold mb-1.5">
                New Password
              </label>
              <input
                id="new-reset-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/75 dark:bg-[#0b2b3c]/70 border border-[#1F4959]/20 dark:border-white/15 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#1F4959] text-white text-sm font-semibold hover:bg-[#163744] transition-colors min-h-[48px]"
            >
              Verify & Update Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. RESET PASSWORD SUCCESS
  if (screen === 'reset-success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card max-w-md w-full rounded-[28px] p-8 text-center flex flex-col items-center">
          <WarmIllustration variant="confetti" className="w-28 h-28" />
          <h1 className="text-2xl font-bold font-serif-display mt-4 text-[#1F4959] dark:text-[#F6F1E9]">
            Password updated!
          </h1>
          <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] mt-2 leading-relaxed">
            Your Elite Track college credentials have been refreshed. You can now sign back into your placement workspace.
          </p>
          <button
            type="button"
            onClick={() => onNavigateAuth('login')}
            className="mt-6 w-full py-3 rounded-2xl bg-[#1F4959] text-white text-sm font-semibold hover:bg-[#163744] transition-colors min-h-[48px]"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // 5. SESSION EXPIRED SCREEN
  if (screen === 'session-expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card max-w-md w-full rounded-[28px] p-8 text-center flex flex-col items-center">
          <WarmIllustration variant="403" className="w-28 h-28" />
          <h1 className="text-2xl font-bold font-serif-display mt-3 text-[#1F4959] dark:text-[#F6F1E9]">
            Your session took a tea break
          </h1>
          <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3] mt-2 leading-relaxed">
            For your security, college placement sessions expire after 12 hours of inactivity. Any unsaved command drafts are preserved locally.
          </p>
          <button
            type="button"
            onClick={() => onNavigateAuth('login')}
            className="mt-6 w-full py-3 rounded-2xl bg-[#1F4959] text-white text-sm font-semibold hover:bg-[#163744] transition-colors min-h-[48px]"
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  // 6. FIRST-TIME STUDENT ONBOARDING (Multi-step with Progress Ring)
  if (screen === 'onboarding') {
    const totalSteps = 6;
    const progressPct = calculateProgressPercentage(step, totalSteps);
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPct / 100) * circumference;

    const platformsList = [
      { name: 'LeetCode', value: lcUrl, setter: setLcUrl, hint: 'https://leetcode.com/u/handle' },
      { name: 'Codeforces', value: cfUrl, setter: setCfUrl, hint: 'https://codeforces.com/profile/handle' },
      { name: 'CodeChef', value: ccUrl, setter: setCcUrl, hint: 'https://codechef.com/users/handle' },
      { name: 'GitHub', value: ghUrl, setter: setGhUrl, hint: 'https://github.com/handle' },
    ];

    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card max-w-2xl w-full rounded-[28px] p-6 sm:p-8">
          {/* Top bar with Progress Ring */}
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#1F4959]/10 dark:border-white/10">
            <div>
              <p className="text-xs font-semibold text-[#C9825B]">
                Batch of 2026 · Student Setup ({step} of {totalSteps})
              </p>
              <h1 className="text-xl sm:text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                {step === 1 && 'Welcome to Elite Track'}
                {step === 2 && 'Your Academic & Career Profile'}
                {step === 3 && 'Link Core Coding Profiles'}
                {step === 4 && 'Other Coding Platforms'}
                {step === 5 && 'In-App & WhatsApp Alerts'}
                {step === 6 && 'All Set for Placement Season!'}
              </h1>
            </div>

            {/* SVG Progress Ring */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle
                  cx="28"
                  cy="28"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="4.5"
                  className="text-[#1F4959]/15 dark:text-white/15"
                  fill="none"
                />
                <circle
                  cx="28"
                  cy="28"
                  r={radius}
                  stroke="#C9825B"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  fill="none"
                />
              </svg>
              <span className="absolute text-xs font-mono-num font-bold text-[#1F4959] dark:text-[#F6F1E9]">
                {progressPct}%
              </span>
            </div>
          </div>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="py-6 space-y-5">
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-white/45 dark:bg-white/5 p-5 rounded-2xl border border-[#1F4959]/10">
                <WarmIllustration variant="welcome" className="w-28 h-28 shrink-0" />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold font-serif-display">
                    Your personal space—zero leaderboards, zero peer pressure.
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] leading-relaxed">
                    Ganesh Sir and your HODs designed Elite Track for our 17-student batch so you can track your own milestones, receive verified Tier-1 hackathons (Google, Nvidia, Zoho, Flipkart), and reply to weekly mentor commands.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-[#1F4959]/10">
                  <p className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">1. Auto-Synced Rings</p>
                  <p className="text-[#5C7C89] mt-1">LeetCode, Codeforces, CodeChef & GitHub rings update automatically.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-[#1F4959]/10">
                  <p className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">2. Mentor Commands</p>
                  <p className="text-[#5C7C89] mt-1">Reply directly to Ganesh Sir’s weekly problem sets and LLD tasks.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-[#1F4959]/10">
                  <p className="font-semibold text-[#1F4959] dark:text-[#CFE0E3]">3. Verified Alerts</p>
                  <p className="text-[#5C7C89] mt-1">Get WhatsApp & in-app reminders 24 hours before contest deadlines.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div className="py-5 space-y-4">
              {onboardingError && (
                <div className="p-3 rounded-xl bg-[#C9825B]/15 border border-[#C9825B] text-xs font-medium text-[#8F4F32] dark:text-[#E8D8C3]">
                  {onboardingError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="onb-name" className="block text-xs font-semibold mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="onb-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/75 dark:bg-[#0b2b3c]/70 border border-[#1F4959]/20 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="onb-roll" className="block text-xs font-semibold mb-1.5">
                    College Roll Number
                  </label>
                  <input
                    id="onb-roll"
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/75 dark:bg-[#0b2b3c]/70 border border-[#1F4959]/20 text-sm font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="onb-dept" className="block text-xs font-semibold mb-1.5">
                  Department
                </label>
                <select
                  id="onb-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/75 dark:bg-[#0b2b3c]/70 border border-[#1F4959]/20 text-sm"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                </select>
              </div>

              <div>
                <label htmlFor="onb-bio" className="block text-xs font-semibold mb-1.5">
                  Career Objective (shown on your personal profile header)
                </label>
                <textarea
                  id="onb-bio"
                  rows={3}
                  value={careerObjective}
                  onChange={(e) => setCareerObjective(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/75 dark:bg-[#0b2b3c]/70 border border-[#1F4959]/20 text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 3: Link Coding Profiles with live validation states */}
          {step === 3 && (
            <div className="py-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C7C89]">
                <span>Paste your profile URLs. Type &ldquo;private&rdquo; or &ldquo;404&rdquo; in any box to test live validation states:</span>
                <button
                  type="button"
                  onClick={() => setCcUrl('https://codechef.com/users/private_account')}
                  className="underline text-[#C9825B] font-medium"
                >
                  Simulate Private Profile
                </button>
              </div>

              <div className="space-y-3">
                {platformsList.map((item) => {
                  const result =
                    checkingPlatform === item.name
                      ? { status: 'checking' as const, message: 'Checking profile accessibility...', handle: '' }
                      : validateProfileInput(item.name, item.value);

                  return (
                    <div
                      key={item.name}
                      className="p-3.5 rounded-2xl bg-white/55 dark:bg-white/5 border border-[#1F4959]/15 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label htmlFor={`url-${item.name}`} className="text-xs font-bold">
                          {item.name} Profile URL
                        </label>
                        <span className="text-xs font-medium flex items-center gap-1.5">
                          {result.status === 'checking' && (
                            <span className="text-[#D9A441] flex items-center gap-1">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking...
                            </span>
                          )}
                          {result.status === 'found' && (
                            <span className="text-[#1F4959] dark:text-[#CFE0E3] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E6F5E]" /> Found
                            </span>
                          )}
                          {result.status === 'private' && (
                            <span className="text-[#D9A441] flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> Profile Private
                            </span>
                          )}
                          {result.status === 'not-found' && (
                            <span className="text-[#C9825B] flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Not Found
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          id={`url-${item.name}`}
                          type="text"
                          value={item.value}
                          placeholder={item.hint}
                          onChange={(e) => item.setter(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCheckingPlatform(item.name);
                            setTimeout(() => setCheckingPlatform(null), 350);
                          }}
                          className="px-3 py-2 rounded-xl bg-[#1F4959]/10 dark:bg-white/10 text-xs font-semibold hover:bg-[#1F4959] hover:text-white transition-colors"
                        >
                          Verify
                        </button>
                      </div>

                      <p className="text-[11px] text-[#5C7C89] dark:text-[#89A7B3]">{result.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Add Other Platforms */}
          {step === 4 && (
            <div className="py-5 space-y-4">
              <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                Practicing on specialized platforms? Add manual count entries below (labeled as Self-reported on your profile):
              </p>

              <form onSubmit={handleAddOtherPlatform} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  aria-label="Other platform name"
                  placeholder="Platform name (e.g. AtCoder, TopCoder, GeeksforGeeks)"
                  value={newPlatName}
                  onChange={(e) => setNewPlatName(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white/75 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                />
                <input
                  type="number"
                  aria-label="Problems solved count"
                  placeholder="Solved count"
                  value={newPlatCount}
                  onChange={(e) => setNewPlatCount(e.target.value)}
                  className="w-full sm:w-36 px-3.5 py-2.5 rounded-2xl bg-white/75 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-mono-num"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center justify-center gap-1.5 min-h-[42px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Platform</span>
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {otherPlatforms.map((plat, idx) => (
                  <div
                    key={`${plat.name}-${idx}`}
                    className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/15 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold">{plat.name}</p>
                      <p className="text-xs font-mono-num text-[#5C7C89]">{plat.count} solved · Self-reported</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${plat.name}`}
                      onClick={() =>
                        setOtherPlatforms((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-xs text-[#C9825B] hover:underline px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Notification Preferences */}
          {step === 5 && (
            <div className="py-5 space-y-4">
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/15 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">In-App Activity Feed Notifications</p>
                  <p className="text-xs text-[#5C7C89]">
                    Instant alerts when Ganesh Sir issues a command or approves a hackathon.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={inAppEnabled}
                  aria-label="Toggle in-app notifications"
                  onClick={() => setInAppEnabled(!inAppEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
                    inAppEnabled ? 'bg-[#1F4959] justify-end' : 'bg-[#5C7C89]/30 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/15 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-[#C9825B]" />
                    <div>
                      <p className="text-sm font-semibold">WhatsApp Deadline & Command Reminders</p>
                      <p className="text-xs text-[#5C7C89]">
                        Receive official placement reminders from Ganesh Sir on WhatsApp.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={whatsappConsent}
                    aria-label="Toggle WhatsApp consent"
                    onClick={() => setWhatsappConsent(!whatsappConsent)}
                    className={`w-12 h-7 rounded-full transition-colors p-1 flex items-center ${
                      whatsappConsent ? 'bg-[#C9825B] justify-end' : 'bg-[#5C7C89]/30 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow" />
                  </button>
                </div>

                <div>
                  <label htmlFor="onb-whatsapp" className="block text-xs font-semibold mb-1">
                    WhatsApp Mobile Number
                  </label>
                  <input
                    id="onb-whatsapp"
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-mono-num"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: All Set! Success screen with soft confetti */}
          {step === 6 && (
            <div className="py-8 text-center flex flex-col items-center space-y-4">
              <div className="animate-ring-pulse">
                <WarmIllustration variant="confetti" className="w-32 h-32" />
              </div>
              <h2 className="text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                You’re all set, {name.split(' ')[0]}!
              </h2>
              <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] max-w-md leading-relaxed">
                Your 4 core story rings and {otherPlatforms.length} additional platforms are linked. Your personal weekly goal ring starts at 75% (12/16 problems solved this week).
              </p>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-5 border-t border-[#1F4959]/10 dark:border-white/10 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-2xl border border-[#1F4959]/20 text-xs font-semibold hover:bg-black/5 transition-colors min-h-[44px]"
              >
                Previous Step
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateAuth('login')}
                className="px-4 py-2.5 rounded-2xl border border-[#1F4959]/20 text-xs font-semibold hover:bg-black/5 transition-colors min-h-[44px]"
              >
                Skip to Sign In
              </button>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 2 && (!name.trim() || !rollNo.trim())) {
                    setOnboardingError('Please enter both your Full Name and Roll Number.');
                    return;
                  }
                  setOnboardingError('');
                  setStep(step + 1);
                }}
                className="px-6 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="px-6 py-3 rounded-2xl bg-[#C9825B] text-white text-xs font-semibold hover:bg-[#b5714c] transition-colors inline-flex items-center gap-1.5 min-h-[46px]"
              >
                <Check className="w-4 h-4" />
                <span>Enter Student Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT: LOGIN SCREEN
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="glass-card max-w-4xl w-full rounded-[28px] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Editorial Column */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-[#1F4959] text-[#F6F1E9] flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#C9825B] text-white font-serif-display font-bold flex items-center justify-center">
                ET
              </div>
              <span className="font-serif-display text-lg font-bold tracking-tight">
                Elite Track
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-serif-display mt-6 leading-snug">
              Track. Participate. Achieve.
            </h1>
            <p className="text-xs sm:text-sm text-[#CFE0E3] mt-3 leading-relaxed">
              A warm, distraction-free placement workspace crafted for our 17-student college batch, Ganesh Sir, and Department HODs.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/15 space-y-3 text-xs text-[#E8D8C3]">
            <p className="font-semibold text-white">Personal Progress First</p>
            <p className="text-[#CFE0E3]/90 leading-relaxed">
              No public rankings or stressful leaderboards. Focus on your own coding story rings, weekly habits, and verified Tier-1 hackathons.
            </p>
          </div>
        </div>

        {/* Right Sign-In Form Column */}
        <div className="lg:col-span-7 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-display text-[#1F4959] dark:text-[#F6F1E9]">
                Sign in to your workspace
              </h2>
              <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                Choose your role to preview the Student or Mentor/HOD experience
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateAuth('splash')}
              className="text-xs text-[#5C7C89] hover:text-[#1F4959] underline shrink-0"
            >
              Splash Screen
            </button>
          </div>

          {/* Role Selector (Segmented Control) */}
          <div
            className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#E8D8C3]/50 dark:bg-[#0b2b3c] mb-5"
            role="tablist"
            aria-label="Choose account role"
          >
            <button
              type="button"
              role="tab"
              aria-selected={role === 'student'}
              onClick={() => handleRoleSwitch('student')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all min-h-[42px] ${
                role === 'student'
                  ? 'bg-[#1F4959] text-white shadow-sm'
                  : 'text-[#242424] dark:text-[#CFE0E3] hover:bg-white/40'
              }`}
            >
              Student (Batch of 17)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'admin'}
              onClick={() => handleRoleSwitch('admin')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all min-h-[42px] ${
                role === 'admin'
                  ? 'bg-[#1F4959] text-white shadow-sm'
                  : 'text-[#242424] dark:text-[#CFE0E3] hover:bg-white/40'
              }`}
            >
              Faculty / Mentor / HOD
            </button>
          </div>

          {/* Google OAuth Button */}
          <div className="space-y-3 mb-5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-white/10 hover:bg-white/90 border border-[#1F4959]/20 text-[#1F4959] dark:text-[#F6F1E9] text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-3 min-h-[48px]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
            <p className="text-[11px] text-center text-[#5C7C89]">
              Strict college allowlist enforced · Non-registered Google accounts receive Access Denied.
            </p>
          </div>

          {/* Quick Roster Test Switcher Chips */}
          <div className="mb-5 p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-[#1F4959]/10">
            <p className="text-[10px] font-bold text-[#5C7C89] uppercase tracking-wider mb-2">
              Fast Preview Pre-Registered Roster:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Ganesh Sir (Mentor)', mail: 'ganesh@uniqshift.com', role: 'admin' as const },
                { label: 'Principal Sir', mail: 'principal@nec.edu.in', role: 'admin' as const },
                { label: 'HOD CSE', mail: 'hodcse@nec.edu.in', role: 'admin' as const },
                { label: 'Dr. J. Naskath', mail: 'naskat@nec.edu.in', role: 'admin' as const },
                { label: 'Ananya (Student)', mail: 'ananya.22cs001@college.edu', role: 'student' as const },
              ].map((chip) => (
                <button
                  key={chip.mail}
                  type="button"
                  onClick={() => {
                    setEmail(chip.mail);
                    onSelectRole(chip.role);
                    setLoginError('');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border ${
                    email === chip.mail
                      ? 'bg-[#1F4959] text-white border-[#1F4959]'
                      : 'bg-white/70 dark:bg-white/10 text-[#1F4959] dark:text-[#CFE0E3] border-[#1F4959]/15 hover:bg-white'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex py-2 items-center mb-4">
            <div className="flex-grow border-t border-[#1F4959]/15"></div>
            <span className="flex-shrink mx-3 text-[11px] text-[#5C7C89]">or college password login</span>
            <div className="flex-grow border-t border-[#1F4959]/15"></div>
          </div>

          {loginError && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-[#C9825B]/15 border border-[#C9825B] text-xs font-medium text-[#8F4F32] dark:text-[#E8D8C3]"
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold mb-1.5">
                College Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5C7C89] absolute left-3.5 top-3.5" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rollno@college.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c]/80 border border-[#1F4959]/20 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9825B]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-xs font-semibold">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => onNavigateAuth('forgot-password')}
                  className="text-xs font-semibold text-[#C9825B] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5C7C89] absolute left-3.5 top-3.5" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 rounded-2xl bg-white/80 dark:bg-[#0b2b3c]/80 border border-[#1F4959]/20 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9825B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1.5 p-2 text-[#5C7C89] hover:text-[#1F4959] min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-2xl bg-[#1F4959] text-white text-sm font-semibold hover:bg-[#163744] transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {role === 'student'
                  ? 'Sign In as Student (Ananya)'
                  : 'Sign In as Mentor (Ganesh Sir)'}
              </span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#1F4959]/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={handleStartOnboarding}
              className="font-semibold text-[#1F4959] dark:text-[#CFE0E3] hover:underline"
            >
              New student? Start 6-step onboarding →
            </button>
            <button
              type="button"
              onClick={() => onNavigateAuth('session-expired')}
              className="text-[#5C7C89] hover:underline"
            >
              Preview Session Expired
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
