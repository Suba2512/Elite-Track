import React from 'react';

/**
 * Custom editorial illustrations built in the Elite Track warm palette:
 * Cream (#F6F1E9), Pale Teal (#CFE0E3), Sand (#E8D8C3), Petrol Teal (#1F4959),
 * Secondary Teal (#5C7C89), Terracotta (#C9825B), and Amber (#D9A441).
 */
export const WarmIllustration: React.FC<{
  variant:
    | '404'
    | '403'
    | '500'
    | 'offline'
    | 'maintenance'
    | 'sync-failed'
    | 'empty'
    | 'confetti'
    | 'welcome';
  className?: string;
}> = ({ variant, className = 'w-36 h-36' }) => {
  return (
    <svg
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Soft warm backdrop blobs */}
      <circle cx="100" cy="92" r="68" fill="#E8D8C3" fillOpacity="0.55" />
      <circle cx="122" cy="76" r="48" fill="#CFE0E3" fillOpacity="0.65" />

      {variant === '404' && (
        <>
          {/* Compass / Telescope searching for a missing route */}
          <rect
            x="48"
            y="54"
            width="104"
            height="76"
            rx="18"
            fill="#F6F1E9"
            stroke="#1F4959"
            strokeWidth="3"
          />
          <circle cx="100" cy="92" r="24" stroke="#C9825B" strokeWidth="3" strokeDasharray="6 4" />
          <path
            d="M90 102L104 82L112 90L98 108L90 102Z"
            fill="#D9A441"
            stroke="#1F4959"
            strokeWidth="2.5"
          />
          <text
            x="100"
            y="44"
            textAnchor="middle"
            fill="#1F4959"
            fontFamily="Fraunces, Georgia, serif"
            fontSize="20"
            fontWeight="700"
          >
            404
          </text>
        </>
      )}

      {variant === '403' && (
        <>
          {/* Classic arch key & shield lock */}
          <path
            d="M100 38L142 56V92C142 120 123 140 100 148C77 140 58 120 58 92V56L100 38Z"
            fill="#F6F1E9"
            stroke="#1F4959"
            strokeWidth="3"
          />
          <rect
            x="84"
            y="84"
            width="32"
            height="26"
            rx="7"
            fill="#C9825B"
            stroke="#1F4959"
            strokeWidth="2.5"
          />
          <path
            d="M90 84V74C90 68.5 94.5 64 100 64C105.5 64 110 68.5 110 74V84"
            stroke="#1F4959"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="97" r="3" fill="#F6F1E9" />
        </>
      )}

      {variant === '500' && (
        <>
          {/* Warm tea cup with spilled steam & gear */}
          <rect
            x="56"
            y="68"
            width="88"
            height="62"
            rx="16"
            fill="#F6F1E9"
            stroke="#1F4959"
            strokeWidth="3"
          />
          <path
            d="M78 98L92 84L106 104L122 86"
            stroke="#C9825B"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="136" cy="64" r="14" fill="#D9A441" stroke="#1F4959" strokeWidth="2.5" />
          <path d="M136 58V65" stroke="#1F4959" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="136" cy="70" r="1.5" fill="#1F4959" />
        </>
      )}

      {variant === 'offline' && (
        <>
          {/* Cloud with disconnected warm wave */}
          <path
            d="M66 116H134C146 116 154 107 154 96C154 86 146 78 136 77C133 60 118 48 100 48C80 48 65 63 64 81C54 83 48 91 48 100C48 109 56 116 66 116Z"
            fill="#F6F1E9"
            stroke="#1F4959"
            strokeWidth="3"
          />
          <path
            d="M64 46L138 130"
            stroke="#C9825B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="100" cy="96" r="5" fill="#D9A441" />
        </>
      )}

      {variant === 'maintenance' && (
        <>
          {/* Blueprint ruler & tuning wrench */}
          <rect
            x="50"
            y="58"
            width="100"
            height="68"
            rx="16"
            fill="#F6F1E9"
            stroke="#1F4959"
            strokeWidth="3"
          />
          <circle cx="88" cy="92" r="16" stroke="#1F4959" strokeWidth="3" strokeDasharray="5 3" />
          <circle cx="118" cy="92" r="12" fill="#D9A441" stroke="#1F4959" strokeWidth="2.5" />
          <path d="M70 140H130" stroke="#5C7C89" strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {variant === 'sync-failed' && (
        <>
          {/* Two nodes with broken link bridge */}
          <circle cx="68" cy="92" r="22" fill="#F6F1E9" stroke="#1F4959" strokeWidth="3" />
          <circle cx="132" cy="92" r="22" fill="#F6F1E9" stroke="#1F4959" strokeWidth="3" />
          <path
            d="M90 92H110"
            stroke="#C9825B"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="4 5"
          />
          <circle cx="100" cy="72" r="11" fill="#D9A441" stroke="#1F4959" strokeWidth="2" />
          <path d="M100 67V73" stroke="#1F4959" strokeWidth="2" strokeLinecap="round" />
          <circle cx="100" cy="77" r="1.3" fill="#1F4959" />
        </>
      )}

      {(variant === 'empty' || variant === 'welcome') && (
        <>
          {/* Notebook & glowing terracotta bookmark */}
          <rect
            x="60"
            y="44"
            width="80"
            height="96"
            rx="16"
            fill="#F6F1E9"
            stroke="#1F4959"
            strokeWidth="3"
          />
          <path d="M80 72H120" stroke="#1F4959" strokeWidth="3" strokeLinecap="round" />
          <path d="M80 90H112" stroke="#5C7C89" strokeWidth="3" strokeLinecap="round" />
          <path d="M80 108H102" stroke="#5C7C89" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M114 44V68L122 61L130 68V44"
            fill="#C9825B"
            stroke="#1F4959"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </>
      )}

      {variant === 'confetti' && (
        <>
          {/* Trophy badge with terracotta & amber confetti sparks */}
          <circle
            cx="100"
            cy="92"
            r="34"
            fill="#1F4959"
            stroke="#D9A441"
            strokeWidth="4"
          />
          <path
            d="M86 93L96 103L116 81"
            stroke="#F6F1E9"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="48" cy="56" r="6" fill="#C9825B" />
          <circle cx="152" cy="52" r="5" fill="#D9A441" />
          <circle cx="156" cy="118" r="6" fill="#C9825B" />
          <circle cx="46" cy="122" r="5" fill="#1F4959" />
          <rect
            x="96"
            y="32"
            width="8"
            height="14"
            rx="4"
            fill="#D9A441"
          />
        </>
      )}
    </svg>
  );
};

export const CompanyMonogram: React.FC<{ company: string; size?: 'sm' | 'md' | 'lg' }> = ({
  company,
  size = 'md',
}) => {
  const palette: Record<string, { bg: string; text: string; label: string }> = {
    Google: { bg: 'bg-[#1F4959] text-[#F6F1E9]', text: 'G', label: 'Google' },
    Nvidia: { bg: 'bg-[#2E5A44] text-[#F6F1E9]', text: 'NV', label: 'Nvidia' },
    Flipkart: { bg: 'bg-[#D9A441] text-[#1F4959]', text: 'FK', label: 'Flipkart' },
    TCS: { bg: 'bg-[#C9825B] text-[#F6F1E9]', text: 'TC', label: 'TCS' },
    Zoho: { bg: 'bg-[#8F4F32] text-[#F6F1E9]', text: 'ZH', label: 'Zoho' },
    Qualcomm: { bg: 'bg-[#3A606E] text-[#F6F1E9]', text: 'QC', label: 'Qualcomm' },
    PayPal: { bg: 'bg-[#1F4959] text-[#E8D8C3]', text: 'PP', label: 'PayPal' },
  };

  const entry = palette[company] || {
    bg: 'bg-[#1F4959] text-[#F6F1E9]',
    text: company.slice(0, 2).toUpperCase(),
    label: company,
  };

  const dims =
    size === 'sm'
      ? 'w-9 h-9 text-xs rounded-xl'
      : size === 'lg'
      ? 'w-14 h-14 text-lg rounded-2xl'
      : 'w-11 h-11 text-sm rounded-2xl';

  return (
    <div
      className={`${dims} ${entry.bg} font-serif-display font-bold flex items-center justify-center shrink-0 shadow-sm border border-white/30`}
      aria-label={`${entry.label} insignia`}
    >
      {entry.text}
    </div>
  );
};
