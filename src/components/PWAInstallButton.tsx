import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install Elite Track PWA"
        className={`inline-flex items-center gap-1.5 rounded-xl border border-[#1F4959]/20 dark:border-[#CFE0E3]/20 bg-white/40 dark:bg-[#0b2b3c]/50 text-[#1F4959] dark:text-[#CFE0E3] hover:bg-[#1F4959] hover:text-white dark:hover:bg-[#C9825B] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'px-2.5 py-1.5 text-xs font-medium min-h-[38px]' : 'px-3.5 py-2 text-xs font-semibold min-h-[42px]'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="glass-modal w-full max-w-md rounded-[24px] p-6 text-[#242424] dark:text-[#F6F1E9]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#1F4959] text-[#F6F1E9] flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pwa-install-title" className="text-lg font-semibold font-serif-display">
                    Install Elite Track PWA
                  </h3>
                  <p className="text-xs text-[#5C7C89] dark:text-[#89A7B3]">
                    Home screen access & offline caching
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close install guide"
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#242424]/85 dark:text-[#F6F1E9]/85">
              <p>
                Add <strong>Elite Track</strong> to your phone or desktop for instant command alerts from Ganesh Sir and offline access to your coding stats:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs bg-white/50 dark:bg-black/25 p-3.5 rounded-2xl border border-[#1F4959]/10 dark:border-white/10">
                <li>
                  <strong>Chrome / Edge (Desktop & Android):</strong> Click the install icon in the browser address bar or menu <em>“Install Elite Track”</em>.
                </li>
                <li>
                  <strong>iOS Safari (iPhone / iPad):</strong> Tap the <strong>Share</strong> button in the bottom bar and select <strong>Add to Home Screen</strong>.
                </li>
              </ol>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1F4959] text-white text-xs font-semibold hover:bg-[#163744] transition-colors min-h-[42px]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
