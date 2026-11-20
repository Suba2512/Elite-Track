import React from 'react';
import {
  Bell,
  Bookmark,
  CheckCircle2,
  Code2,
  Compass,
  Heart,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { SystemStateScreen } from '../types';
import { WarmIllustration } from './Illustrations';

interface DesignSystemDrawerProps {
  onClose: () => void;
  onTriggerSystemState: (state: SystemStateScreen) => void;
  onTriggerToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  isSkeletonMode: boolean;
  onToggleSkeletonMode: () => void;
  isOfflineBanner: boolean;
  onToggleOfflineBanner: () => void;
}

export const DesignSystemDrawer: React.FC<DesignSystemDrawerProps> = ({
  onClose,
  onTriggerSystemState,
  onTriggerToast,
  isSkeletonMode,
  onToggleSkeletonMode,
  isOfflineBanner,
  onToggleOfflineBanner,
}) => {
  const colorTokens = [
    { name: 'Warm Cream Base', hex: '#F6F1E9', swatch: 'bg-[#F6F1E9] border border-[#1F4959]/20' },
    { name: 'Pale Teal Blob', hex: '#CFE0E3', swatch: 'bg-[#CFE0E3]' },
    { name: 'Warm Sand Blob', hex: '#E8D8C3', swatch: 'bg-[#E8D8C3]' },
    { name: 'Primary Petrol Teal', hex: '#1F4959', swatch: 'bg-[#1F4959]' },
    { name: 'Secondary Muted Teal', hex: '#5C7C89', swatch: 'bg-[#5C7C89]' },
    { name: 'Accent Terracotta', hex: '#C9825B', swatch: 'bg-[#C9825B]' },
    { name: 'Accent Warm Amber', hex: '#D9A441', swatch: 'bg-[#D9A441]' },
    { name: 'Deep Petrol Dark', hex: '#011425', swatch: 'bg-[#011425] border border-white/20' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-sm p-3 sm:p-6 flex items-start justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="design-system-title"
    >
      <div className="glass-modal w-full max-w-5xl rounded-[28px] p-5 sm:p-8 my-4 text-[#242424] dark:text-[#F6F1E9]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#1F4959]/10 dark:border-white/10">
          <div>
            <p className="text-xs font-medium text-[#C9825B]">
              Deliverable 01 · Production Design System & Interactive Edge-State Inspector
            </p>
            <h2 id="design-system-title" className="text-2xl sm:text-3xl font-bold font-serif-display mt-1">
              Elite Track — Warm Glassmorphism UI Kit
            </h2>
            <p className="text-sm text-[#5C7C89] dark:text-[#89A7B3] mt-1">
              Classic editorial serif pairings, frosted cream-teal glass surfaces, Instagram story rings, and non-comparative batch analytics.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Design System"
            className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/10 hover:bg-[#1F4959] hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-8">
          {/* 1. Colour Tokens */}
          <section>
            <h3 className="text-lg font-semibold font-serif-display mb-3">
              01. Curated Colour Palette Tokens (WCAG AA High-Contrast)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {colorTokens.map((t) => (
                <div
                  key={t.hex}
                  className="glass-card rounded-2xl p-3 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl shrink-0 shadow-inner ${t.swatch}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{t.name}</p>
                    <p className="text-xs font-mono-num text-[#5C7C89] dark:text-[#89A7B3]">
                      {t.hex}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Typography Scale */}
          <section className="glass-card rounded-[24px] p-5">
            <h3 className="text-lg font-semibold font-serif-display mb-4">
              02. Typography Scale (Fraunces + DM Sans + JetBrains Mono)
            </h3>
            <div className="space-y-3 divide-y divide-[#1F4959]/10 dark:divide-white/10">
              <div className="pt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-serif-display">
                  Display Headline · Track. Participate. Achieve.
                </span>
                <span className="text-xs font-mono-num text-[#5C7C89]">Fraunces · 30px / 1.2</span>
              </div>
              <div className="pt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-xl font-semibold font-serif-display">
                  Section Heading · Verified Placement Opportunities
                </span>
                <span className="text-xs font-mono-num text-[#5C7C89]">Fraunces · 20px / 1.3</span>
              </div>
              <div className="pt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-sm sm:text-base">
                  Body Prose · Nice, 12 problems solved this week! Keep your 14-day warm streak going.
                </span>
                <span className="text-xs font-mono-num text-[#5C7C89]">DM Sans · 15px / 1.6</span>
              </div>
              <div className="pt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <span className="text-sm font-mono-num font-semibold text-[#1F4959] dark:text-[#CFE0E3]">
                  248 Solved · Rating 1,765 · 75% Weekly Ring
                </span>
                <span className="text-xs font-mono-num text-[#5C7C89]">JetBrains Mono · Tabular</span>
              </div>
            </div>
          </section>

          {/* 3. Components & Instagram Story Ring Primitives */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card rounded-[24px] p-5 space-y-4">
              <h3 className="text-lg font-semibold font-serif-display">
                03. Buttons, Segmented Filters & Bookmark Actions
              </h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onTriggerToast('success', 'Primary CTA Clicked', 'Petrol teal action button.')
                  }
                  className="px-4 py-2.5 rounded-2xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors min-h-[42px]"
                >
                  Primary Petrol CTA
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onTriggerToast('info', 'Warm Terracotta CTA', 'Used for urgent deadlines & streaks.')
                  }
                  className="px-4 py-2.5 rounded-2xl bg-[#C9825B] text-white text-xs font-semibold hover:bg-[#b5714c] transition-colors min-h-[42px]"
                >
                  Terracotta Accent
                </button>
                <button
                  type="button"
                  aria-label="Save opportunity example"
                  onClick={() =>
                    onTriggerToast('success', 'Opportunity Saved', 'Added to your personal bookmarks.')
                  }
                  className="p-2.5 rounded-2xl border border-[#1F4959]/20 dark:border-white/15 bg-white/50 dark:bg-white/5 text-[#C9825B] hover:scale-105 transition-transform min-h-[42px] min-w-[42px] flex items-center justify-center"
                >
                  <Heart className="w-4 h-4 fill-[#C9825B]" />
                </button>
                <button
                  type="button"
                  aria-label="Remind me on WhatsApp example"
                  onClick={() =>
                    onTriggerToast('info', 'WhatsApp Reminder Set', 'We will ping you 24h before deadline.')
                  }
                  className="p-2.5 rounded-2xl border border-[#1F4959]/20 dark:border-white/15 bg-white/50 dark:bg-white/5 text-[#1F4959] dark:text-[#CFE0E3] hover:scale-105 transition-transform min-h-[42px] min-w-[42px] flex items-center justify-center"
                >
                  <Bell className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                Unboxed metadata discipline: <span>Auto-verified</span> · <span>Synced 14m ago</span> · <span>14-day streak</span>
              </p>
            </div>

            <div className="glass-card rounded-[24px] p-5 space-y-4">
              <h3 className="text-lg font-semibold font-serif-display">
                04. Story Rings & Rounded Line Iconography
              </h3>
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center gap-1">
                  <div className="p-[3px] rounded-full story-ring-active">
                    <div className="w-12 h-12 rounded-full bg-[#F6F1E9] dark:bg-[#011425] flex items-center justify-center">
                      <Code2 className="w-5 h-5 text-[#1F4959] dark:text-[#CFE0E3]" />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium">Active Story</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="p-[3px] rounded-full story-ring-amber">
                    <div className="w-12 h-12 rounded-full bg-[#F6F1E9] dark:bg-[#011425] flex items-center justify-center">
                      <Terminal className="w-5 h-5 text-[#C9825B]" />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium">14d Streak</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="p-[2px] rounded-full border-2 border-[#5C7C89]/40">
                    <div className="w-12 h-12 rounded-full bg-[#F6F1E9] dark:bg-[#011425] flex items-center justify-center">
                      <Compass className="w-5 h-5 text-[#5C7C89]" />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium">Viewed</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="p-[2px] rounded-full border-2 border-[#1F4959] dark:border-[#CFE0E3]">
                    <div className="w-12 h-12 rounded-full bg-[#F6F1E9] dark:bg-[#011425] flex items-center justify-center">
                      <Bookmark className="w-5 h-5 text-[#1F4959] dark:text-[#CFE0E3]" />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium">Saved Highlight</span>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Interactive System, Error & Edge States Launcher */}
          <section className="glass-card rounded-[24px] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold font-serif-display">
                  05. Error, Edge & System States Previewer (Section 5 Deliverables)
                </h3>
                <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                  Test every required error illustration, skeleton shimmer, toast notification, and fallback sheet directly:
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleSkeletonMode}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[40px] ${
                    isSkeletonMode
                      ? 'bg-[#C9825B] text-white border-[#C9825B]'
                      : 'border-[#1F4959]/20 hover:bg-[#1F4959]/10'
                  }`}
                >
                  {isSkeletonMode ? 'Disable Skeleton Shimmer' : 'Preview Loading Skeletons'}
                </button>
                <button
                  type="button"
                  onClick={onToggleOfflineBanner}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[40px] ${
                    isOfflineBanner
                      ? 'bg-[#D9A441] text-[#1F4959] border-[#D9A441]'
                      : 'border-[#1F4959]/20 hover:bg-[#1F4959]/10'
                  }`}
                >
                  {isOfflineBanner ? 'Hide Offline Page Banner' : 'Toggle Offline Banner'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: '404' as const, label: '404 Page Not Found' },
                { id: '403' as const, label: '403 Access Denied' },
                { id: '500' as const, label: '500 Server Error' },
                { id: 'no-internet' as const, label: 'No Internet (Full Page)' },
                { id: 'maintenance' as const, label: 'Maintenance Mode' },
                { id: 'sync-failed' as const, label: 'Platform Sync Failed' },
                { id: 'whatsapp-denied' as const, label: 'WhatsApp Perm Denied' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTriggerSystemState(item.id)}
                  className="px-3.5 py-2.5 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-[#1F4959] hover:text-white text-left text-xs font-medium transition-colors border border-[#1F4959]/10 dark:border-white/10 min-h-[42px]"
                >
                  {item.label} →
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  onTriggerToast(
                    'error',
                    'Sync Rate Limit Reached',
                    'Codeforces API timed out. Using cached stats from 22m ago.'
                  )
                }
                className="px-3.5 py-2.5 rounded-xl bg-[#C9825B]/15 text-[#C9825B] hover:bg-[#C9825B] hover:text-white text-left text-xs font-semibold transition-colors min-h-[42px]"
              >
                Trigger Error Toast
              </button>
            </div>

            {/* Mini Illustration Strip */}
            <div className="mt-5 pt-4 border-t border-[#1F4959]/10 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
              <div className="flex items-center gap-2.5">
                <WarmIllustration variant="404" className="w-14 h-14 shrink-0" />
                <span className="text-xs text-[#5C7C89]">Warm SVG Illustration Style</span>
              </div>
              <div className="flex items-center gap-2.5">
                <WarmIllustration variant="sync-failed" className="w-14 h-14 shrink-0" />
                <span className="text-xs text-[#5C7C89]">Sync Fallback Vector</span>
              </div>
              <div className="flex items-center gap-2.5">
                <WarmIllustration variant="confetti" className="w-14 h-14 shrink-0" />
                <span className="text-xs text-[#5C7C89]">Milestone & Confetti</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#1F4959] dark:text-[#CFE0E3] shrink-0" />
                <span className="text-xs text-[#5C7C89]">Zero-Leaderboard Ethos</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
