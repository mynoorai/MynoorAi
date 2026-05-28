/**
 * iOS / Apple HIG style primitives.
 *
 * Design language (matches iOS 17/18 system look — independent of Apple
 * proprietary assets so we stay license-safe):
 *   - SF Pro-equivalent font stack (system-ui / -apple-system / SF Pro Text)
 *   - 22px outer radius cards, 14px inner radius rows
 *   - System grays for neutrals, single accent (system blue)
 *   - Vibrancy / translucent surfaces via backdrop-blur
 *   - Min 44px tappable area
 *   - Large titles, grouped lists, segmented controls, search bar
 *
 * These primitives are *only* used by Home / Shop / MyPage. Landing,
 * Analyze, Result and admin pages keep their existing styles.
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';

// ───────────────────────── Tokens (Tailwind-friendly classnames) ─────
export const iosFont =
  '[font-family:-apple-system,BlinkMacSystemFont,"SF_Pro_Text","SF_Pro_Display","Segoe_UI",system-ui,sans-serif]';

export const iosPage = `${iosFont} min-h-screen bg-[#F2F2F7] text-[#1C1C1E] antialiased pb-28`;

export const iosCard =
  'bg-white rounded-[22px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]';

export const iosGroup = 'bg-white rounded-[14px] overflow-hidden';

export const iosDivider = 'h-px bg-[#E5E5EA]';

// ───────────────────────── LargeTitle ─────
export const IOSLargeTitle: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}> = ({ title, subtitle, right }) => (
  <div className="px-4 pt-3 pb-2 flex items-end justify-between">
    <div>
      <h1 className="text-[34px] leading-[41px] font-bold tracking-[-0.4px] text-[#1C1C1E]">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[15px] leading-[20px] text-[#8E8E93] mt-1">{subtitle}</p>
      )}
    </div>
    {right}
  </div>
);

// ───────────────────────── SearchBar ─────
export const IOSSearchBar: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Search' }) => (
  <div className="px-4 pb-2">
    <div className="flex items-center gap-2 h-9 rounded-[10px] bg-[#E5E5EA] px-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#8E8E93]">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent flex-1 outline-none text-[17px] placeholder:text-[#8E8E93] text-[#1C1C1E] min-h-0"
        style={{ minHeight: 0 }}
      />
      {value && (
        <button onClick={() => onChange('')} className="text-[#8E8E93] min-h-0" aria-label="Clear">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
            <path d="m8 8 8 8M16 8l-8 8" stroke="#E5E5EA" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  </div>
);

// ───────────────────────── Segmented control ─────
export const IOSSegmented = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}): JSX.Element => (
  <div className="px-4 pb-2">
    <div className="flex p-[2px] rounded-[9px] bg-[#E5E5EA]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={[
              'flex-1 h-8 text-[13px] font-medium rounded-[7px] transition-all',
              active
                ? 'bg-white text-[#1C1C1E] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)]'
                : 'text-[#1C1C1E]/70 active:text-[#1C1C1E]',
            ].join(' ')}
            style={{ minHeight: 0 }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
);

// ───────────────────────── Section header ─────
export const IOSSectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({
  title,
  action,
}) => (
  <div className="px-4 pt-6 pb-2 flex items-end justify-between">
    <h2 className="text-[13px] font-semibold uppercase tracking-[0.4px] text-[#8E8E93]">
      {title}
    </h2>
    {action}
  </div>
);

// ───────────────────────── Inset grouped list ─────
export const IOSList: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="px-4">
    <div className={iosGroup}>{children}</div>
  </div>
);

type RowProps = {
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: React.ReactNode;
  detail?: React.ReactNode;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  divider?: boolean;
  onClick?: () => void;
  to?: LinkProps['to'];
};

export const IOSListRow: React.FC<RowProps> = ({
  icon,
  iconBg = '#007AFF',
  iconColor = 'white',
  title,
  detail,
  trailing,
  showChevron = false,
  destructive = false,
  divider = true,
  onClick,
  to,
}) => {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3 active:bg-[#E5E5EA]/40 transition-colors">
      {icon && (
        <div
          className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div
          className={[
            'text-[17px] leading-[22px] truncate',
            destructive ? 'text-[#FF3B30]' : 'text-[#1C1C1E]',
          ].join(' ')}
        >
          {title}
        </div>
        {detail && (
          <div className="text-[13px] text-[#8E8E93] truncate leading-[18px]">{detail}</div>
        )}
      </div>
      {trailing && (
        <div className="text-[15px] text-[#8E8E93] shrink-0 flex items-center gap-1">
          {trailing}
        </div>
      )}
      {showChevron && <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />}
    </div>
  );
  const body = to ? (
    <Link to={to}>{inner}</Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {inner}
    </button>
  ) : (
    inner
  );
  return (
    <>
      {body}
      {divider && <div className="ml-[60px] h-px bg-[#E5E5EA]" />}
    </>
  );
};

// ───────────────────────── Tab bar (bottom) ─────
export type TabItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  match?: (pathname: string) => boolean;
};

export const IOSTabBar: React.FC<{ items: TabItem[]; pathname: string }> = ({
  items,
  pathname,
}) => (
  <nav className="fixed bottom-0 left-0 right-0 z-40 [padding-bottom:env(safe-area-inset-bottom)]">
    <div className="border-t border-[#D1D1D6] bg-[rgba(249,249,249,0.94)] backdrop-blur-xl">
      <div className="max-w-screen-sm mx-auto flex">
        {items.map((it) => {
          const active = it.match ? it.match(pathname) : pathname === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-[50px] min-h-0"
              style={{ minHeight: 50, color: active ? '#007AFF' : '#8E8E93' }}
            >
              <div className="w-6 h-6 flex items-center justify-center">{it.icon}</div>
              <span className="text-[10px] font-medium leading-none">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  </nav>
);

// ───────────────────────── Pill / Badge ─────
export const IOSPill: React.FC<React.PropsWithChildren<{ color?: string; bg?: string }>> = ({
  color = '#1C1C1E',
  bg = '#E5E5EA',
  children,
}) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-semibold"
    style={{ color, background: bg }}
  >
    {children}
  </span>
);

// ───────────────────────── Get button (App Store) ─────
export const IOSGetButton: React.FC<{ children?: React.ReactNode; onClick?: () => void }> = ({
  children = 'Get',
  onClick,
}) => (
  <button
    onClick={onClick}
    className="bg-[#E5E5EA] active:bg-[#D1D1D6] text-[#007AFF] font-bold text-[15px] uppercase tracking-wide px-4 h-7 rounded-full min-h-0"
    style={{ minHeight: 28 }}
  >
    {children}
  </button>
);

// ───────────────────────── Primary action button (iOS large filled) ─────
export const IOSPrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; tone?: 'blue' | 'gradient' | 'red' }
> = ({ children, loading, tone = 'gradient', className = '', disabled, ...rest }) => {
  const bg =
    tone === 'blue'
      ? 'bg-[#007AFF] active:bg-[#0062CC]'
      : tone === 'red'
        ? 'bg-[#FF3B30] active:bg-[#CC2F26]'
        : 'bg-gradient-to-r from-[#FF8FA3] via-[#FFB199] to-[#7FA1FF] active:opacity-90';
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        'w-full h-12 rounded-[14px] text-white text-[17px] font-semibold transition-opacity',
        bg,
        disabled || loading ? 'opacity-60' : '',
        className,
      ].join(' ')}
      style={{ minHeight: 48 }}
    >
      {loading ? '…' : children}
    </button>
  );
};

// ───────────────────────── Secondary button (subtle) ─────
export const IOSSecondaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, className = '', ...rest }) => (
  <button
    {...rest}
    className={[
      'w-full h-12 rounded-[14px] text-[#007AFF] text-[17px] font-semibold bg-[#F2F2F7] active:bg-[#E5E5EA]',
      className,
    ].join(' ')}
    style={{ minHeight: 48 }}
  >
    {children}
  </button>
);

// ───────────────────────── Form field ─────
export const IOSField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    icon?: React.ReactNode;
    suffix?: React.ReactNode;
    error?: string;
  }
>(({ label, icon, suffix, error, className = '', ...rest }, ref) => (
  <div>
    {label && (
      <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">{label}</label>
    )}
    <div
      className={[
        'flex items-center gap-2 rounded-[12px] bg-white border h-11 px-3',
        error ? 'border-[#FF3B30]' : 'border-[#E5E5EA]',
      ].join(' ')}
      style={{ minHeight: 44 }}
    >
      {icon && <span className="text-[#8E8E93] shrink-0">{icon}</span>}
      <input
        ref={ref}
        {...rest}
        className={[
          'flex-1 bg-transparent outline-none text-[17px] text-[#1C1C1E] placeholder:text-[#C7C7CC] min-h-0',
          className,
        ].join(' ')}
        style={{ minHeight: 0 }}
      />
      {suffix}
    </div>
    {error && <p className="text-[13px] text-[#FF3B30] mt-1">{error}</p>}
  </div>
));
IOSField.displayName = 'IOSField';

// ───────────────────────── Modal / Sheet ─────
// Centered card on tablet/desktop, bottom sheet on small screens.
export const IOSModal: React.FC<{
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div
          className="bg-white rounded-t-[24px] sm:rounded-[22px] w-full sm:max-w-md mx-auto shadow-[0_-12px_40px_rgba(0,0,0,0.18)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.22)] [padding-bottom:env(safe-area-inset-bottom)] animate-[slideUp_0.25s_cubic-bezier(0.32,0.72,0,1)] sm:animate-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sm:hidden flex justify-center pt-2">
            <div className="w-9 h-1 rounded-full bg-[#E5E5EA]" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
