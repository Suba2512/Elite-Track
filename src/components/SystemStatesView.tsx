import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';
import { SystemStateScreen } from '../types';
import { WarmIllustration } from './Illustrations';

interface SystemStatesViewProps {
  state: Exclude<SystemStateScreen, 'none' | 'design-system'>;
  onClose: () => void;
  onManualPlatformEntry: (platform: string, count: number, handle: string) => void;
}

export const SystemStatesView: React.FC<SystemStatesViewProps> = ({
  state,
  onClose,
  onManualPlatformEntry,
}) => {
  const [manualPlatform, setManualPlatform] = useState('Codeforces');
  const [manualHandle, setManualHandle] = useState('ananya_cf');
  const [manualSolved, setManualSolved] = useState('115');

  const configs: Record<
    Exclude<SystemStateScreen, 'none' | 'design-system'>,
    {
      variant: '404' | '403' | '500' | 'offline' | 'maintenance' | 'sync-failed';
      badge: string;
      title: string;
      message: string;
      primaryAction: string;
    }
  > = {
    '404': {
      variant: '404',
      badge: 'Error 404 · Route Not Found',
      title: 'Looks like this page wandered off campus',
      message:
        'We couldn’t find the screen or contest link you were looking for. Your progress rings and commands are safe back on the dashboard.',
      primaryAction: 'Return to Dashboard',
    },
    '403': {
      variant: '403',
      badge: 'Error 403 · Mentor / HOD Restricted Area',
      title: 'Access reserved for Ganesh Sir & HODs',
      message:
        'This section requires Placement Mentor or Head of Department permissions. Switch to the Admin role if you need to issue commands or approve opportunities.',
      primaryAction: 'Back to My Workspace',
    },
    '500': {
      variant: '500',
      badge: 'Error 500 · Unexpected Glitch',
      title: 'Something went wrong on our end',
      message:
        'Our placement sync worker hit an unexpected bump while compiling stats. Give it a quick retry or head back home.',
      primaryAction: 'Retry & Return Home',
    },
    'no-internet': {
      variant: 'offline',
      badge: 'Offline Mode · PWA Cache Active',
      title: 'Looks like you’re offline right now',
      message:
        'No worries — Elite Track cached your latest coding rings, commands, and saved hackathons on your device. Reconnect when you’re back on campus Wi-Fi.',
      primaryAction: 'Continue with Cached Data',
    },
    maintenance: {
      variant: 'maintenance',
      badge: 'Scheduled Maintenance · 15 Mins',
      title: 'Polishing the batch placement engine',
      message:
        'We’re upgrading our MyCareerNet and Unstop opportunity verifiers for the 2026 placement drive. We’ll be right back shortly.',
      primaryAction: 'Check Status & Return',
    },
    'sync-failed': {
      variant: 'sync-failed',
      badge: 'Platform Sync Warning · Fallback Available',
      title: 'We couldn’t auto-fetch your profile right now',
      message:
        'Either the platform API is rate-limited, your handle wasn’t found, or your profile privacy is set to private. You can enter your latest solved count manually below.',
      primaryAction: 'Save Manual Entry & Return',
    },
    'whatsapp-denied': {
      variant: '403',
      badge: 'Permission Notice · Notification Channel',
      title: 'WhatsApp & Browser Push Permissions Paused',
      message:
        'You opted out of WhatsApp or browser push alerts. You will still receive all command updates from Ganesh Sir inside your in-app activity feed.',
      primaryAction: 'Update Preferences & Return',
    },
  };

  const cfg = configs[state];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sys-state-title"
    >
      <div className="glass-modal max-w-lg w-full rounded-[28px] p-6 sm:p-8 text-center flex flex-col items-center">
        <WarmIllustration variant={cfg.variant} className="w-36 h-36" />

        <p className="text-xs font-semibold text-[#C9825B] mt-3">{cfg.badge}</p>
        <h2
          id="sys-state-title"
          className="text-2xl font-bold font-serif-display mt-1.5 text-[#1F4959] dark:text-[#F6F1E9]"
        >
          {cfg.title}
        </h2>
        <p className="text-xs sm:text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-2 leading-relaxed">
          {cfg.message}
        </p>

        {/* Manual Fallback Form when Platform Sync Fails */}
        {state === 'sync-failed' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const count = parseInt(manualSolved, 10) || 100;
              onManualPlatformEntry(manualPlatform, count, manualHandle);
              onClose();
            }}
            className="w-full mt-5 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-[#1F4959]/15 text-left space-y-3"
          >
            <p className="text-xs font-bold text-[#1F4959] dark:text-[#CFE0E3]">
              Enter Stats Manually (Marked as Self-Reported)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="man-plat" className="block text-[11px] font-medium mb-1">
                  Platform
                </label>
                <select
                  id="man-plat"
                  value={manualPlatform}
                  onChange={(e) => setManualPlatform(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                >
                  <option value="Codeforces">Codeforces</option>
                  <option value="LeetCode">LeetCode</option>
                  <option value="CodeChef">CodeChef</option>
                  <option value="GitHub">GitHub</option>
                </select>
              </div>
              <div>
                <label htmlFor="man-handle" className="block text-[11px] font-medium mb-1">
                  Handle
                </label>
                <input
                  id="man-handle"
                  type="text"
                  value={manualHandle}
                  onChange={(e) => setManualHandle(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs"
                />
              </div>
              <div>
                <label htmlFor="man-count" className="block text-[11px] font-medium mb-1">
                  Solved Count
                </label>
                <input
                  id="man-count"
                  type="number"
                  value={manualSolved}
                  onChange={(e) => setManualSolved(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#0b2b3c] border border-[#1F4959]/20 text-xs font-mono-num"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#C9825B] text-white text-xs font-semibold hover:bg-[#b5714c] transition-colors min-h-[42px]"
            >
              Save Self-Reported Fallback
            </button>
          </form>
        )}

        <div className="w-full mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors inline-flex items-center justify-center gap-2 min-h-[46px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{cfg.primaryAction}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
