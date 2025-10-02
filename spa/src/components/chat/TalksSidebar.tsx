import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { ChatSummary } from '../../services/api';

function stripMarkdown(input: string): string {
  try {
    let s = String(input || '');
    // Remove code fences and inline backticks
    s = s.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]+)`/g, '$1');
    // Remove headings ###, ##, #
    s = s.replace(/^#{1,6}\s+/gm, '');
    // Replace list markers -, *, +, and numbered lists "1."
    s = s.replace(/^\s*[-*+]\s+/gm, '');
    s = s.replace(/^\s*\d+\.\s+/gm, '');
    // Blockquotes
    s = s.replace(/^>\s?/gm, '');
    // Links [text](url) -> text
    s = s.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    // Images ![alt](src) -> alt
    s = s.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
    // Bold/italic
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
    s = s.replace(/\*([^*]+)\*/g, '$1');
    s = s.replace(/_([^_]+)_/g, '$1');
    // Tables: strip pipes
    s = s.replace(/^\|.*\|$/gm, (m) => m.replace(/\|/g, ' ').trim());
    // Collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  } catch {
    return input;
  }
}

type Props = {
  chats: ChatSummary[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  open: boolean;
  onClose?: () => void;
  onOpen?: () => void;
};

const MobileDrawerLeft: React.FC<{ open: boolean; onClose?: () => void; children: React.ReactNode }>
  = ({ open, onClose, children }) => {
  const [mounted, setMounted] = React.useState(false);
  const [animOpen, setAnimOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => setAnimOpen(true), 10);
      return () => clearTimeout(t);
    } else {
      setAnimOpen(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleBackdropClick = () => {
    setAnimOpen(false);
    setTimeout(() => { if (onClose) onClose(); }, 300);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] md:hidden" onClick={handleBackdropClick}>
      <div className={`absolute inset-0 transition-opacity duration-300 ${animOpen ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'var(--colour-overlay)' }} />
      <div 
        className={`absolute inset-y-0 left-0 w-[85vw] max-w-[340px] backdrop-blur-md p-4 shadow-2xl h-full overflow-auto transform-gpu will-change-transform transform transition-transform duration-300 ease-in-out ${animOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--colour-bg-black)', borderRight: '1px solid var(--colour-glass-border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export const TalksSidebar: React.FC<Props> = ({ chats, activeId, onSelect, onCreate, open, onClose, onOpen }) => {
  const formatPreview = (c: ChatSummary): string => {
    try {
      const kind = (c.last_message && c.last_message.kind) || null;
      const raw = (c.last_message && c.last_message.content) || '';
      if (!raw) return '';

      // Friendly labels for non-text refs
      if (kind === 'weather_ref') return 'Weather update';
      if (kind === 'matches_ref') return 'Products updated';
      if (kind === 'summary_ref') return 'Instrument summary';

      // If it's JSON comment, extract assistant_text
      const trimmed = raw.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const obj = JSON.parse(trimmed);
          if (obj && typeof obj === 'object' && obj.action === 'comment' && obj.assistant_text) {
            return String(obj.assistant_text);
          }
        } catch {
          // fallback regex extraction
          const m = trimmed.match(/"assistant_text"\s*:\s*"([\s\S]*?)"\s*[},]/);
          if (m && m[1]) {
            return m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
          }
        }
      }
      return raw;
    } catch {
      return '';
    }
  };

  const ellipsize = (s: string, max = 80): string => {
    const t = (s || '').trim();
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
  };

  const getLastTimestamp = (c: ChatSummary): Date | null => {
    const ts = c.last_message?.created_at || c.updated_at || c.created_at;
    if (!ts) return null;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatWhen = (d: Date | null): string => {
    if (!d) return '';
    const now = new Date();
    const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    const diffMs = now.getTime() - d.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    if (diffMs < 7 * oneDay) {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}.${mm}.${yyyy}`;
  };

  const UserMenuDropup: React.FC<{ onAction?: () => void; compact?: boolean }> = ({ onAction, compact = false }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    const displayName = React.useMemo(() => {
      if (user) {
        const nameParts = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        return nameParts || user.email;
      }
      return 'Account';
    }, [user]);

    React.useEffect(() => {
      const handle = (e: MouseEvent) => {
        if (!ref.current) return;
        if (!ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('click', handle);
      return () => document.removeEventListener('click', handle);
    }, []);

    const goAccount = () => {
      setOpen(false);
      navigate('/account');
      if (onAction) onAction();
    };

    const goLogout = () => {
      setOpen(false);
      navigate('/logout');
      if (onAction) onAction();
    };

    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={compact ? 'w-9 h-9 rounded-full flex items-center justify-center' : 'w-full px-3 py-2 rounded-lg flex items-center justify-between'}
          aria-haspopup="menu"
          aria-expanded={open}
          style={{ background: '#FFFFFF', color: '#0A0A0A', border: '1px solid #ECECEC' }}
        >
          {compact ? (
            <span className="text-sm font-medium" style={{ color: '#0A0A0A' }}>{(displayName || 'U').charAt(0).toUpperCase()}</span>
          ) : (
            <>
              <span className="truncate text-sm" style={{ color: '#0A0A0A' }}>{displayName}</span>
              <span className="ml-2 text-xs" style={{ color: '#6B7280' }}>{open ? '▲' : '▼'}</span>
            </>
          )}
        </button>
        {open && (
          <div
            role="menu"
            className={compact ? 'absolute bottom-10 left-full ml-2 z-20' : 'absolute bottom-full left-0 right-0 mb-2 z-10'}
            style={{ background: '#FFFFFF', border: '1px solid #ECECEC', borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}
          >
            <button
              type="button"
              onClick={goAccount}
              className="w-full text-left px-3 py-2 text-sm"
              style={{ color: '#0A0A0A' }}
              role="menuitem"
            >
              Account
            </button>
            <div style={{ height: 1, background: '#ECECEC' }} />
            <button
              type="button"
              onClick={goLogout}
              className="w-full text-left px-3 py-2 text-sm"
              style={{ color: '#D64545' }}
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className={`hidden md:flex md:flex-col p-0 m-0 md:h-[100dvh] md:overflow-visible transition-all duration-300 group`} style={{ background: 'var(--colour-panel-bg)', color: '#0A0A0A', borderRight: '1px solid var(--colour-panel-border)', width: open ? 256 : 56 }}>
        <div className={`${open ? 'p-4' : ''}`}>
          <div className={`${open ? 'flex items-center justify-between' : 'm-4'}`}>
            <div className="relative w-6 h-6">
              <img src={new URL('../../assets/nirvana_bird.png', import.meta.url).toString()} alt="Nirvana" width={24} height={24} 
                className={
                  `${open ? '' : 'absolute inset-0 transition-opacity duration-200 group-hover:opacity-0'} block`
              } />
              {!open && (
                <button
                  type="button"
                  onClick={onOpen}
                  className={
                    `${open ? '' : 'absolute inset-0 w-6 h-6 flex items-center justify-center rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity'} block`
                  }
                  style={{ border: '1px solid var(--colour-standard-pass)', color: '#000' }}
                  aria-label="Show sidebar"
                >
                  →
                </button>
              )}
            </div>
            {open && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-full text-xs"
                style={{ border: '1px solid var(--colour-standard-pass)', color: '#000' }}
                aria-label="Hide sidebar"
              >
                ←
              </button>
            )}
          </div>
          {open ? (
            <button 
              type="button" 
              onClick={onCreate} 
              className="mt-5 px-3 py-1 w-full rounded-lg text-sm transition-colors block mx-auto" 
              style={{ border: '1px solid var(--colour-standard-pass)', color: '#000' }}
              aria-label="New session"
            >
              New Session
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreate}
              className="mt-5 w-9 h-9 flex items-center justify-center rounded-lg text-lg mx-auto block"
              style={{ border: '1px solid var(--colour-standard-pass)', color: '#000' }}
              aria-label="New session"
              title="New session"
            >
              +
            </button>
          )}
        </div>
        {open ? (
          <>
            <div className="flex-1 overflow-auto pr-0 px-1">
              {[...(chats || [])]
                .sort((a, b) => {
                  const ts = (c: ChatSummary) => {
                    const u = c.updated_at ? new Date(c.updated_at).getTime() : 0;
                    const l = c.last_message?.created_at ? new Date(c.last_message.created_at).getTime() : 0;
                    const cr = c.created_at ? new Date(c.created_at).getTime() : 0;
                    return Math.max(u || 0, l || 0, cr || 0);
                  };
                  return ts(b) - ts(a);
                })
                .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-all duration-200 border-l-4`}
                  style={{ background: activeId === c.id ? 'var(--colour-panel-active)' : 'transparent', borderLeftColor: activeId === c.id ? 'var(--colour-standard-pass)' : 'transparent', color: '#0A0A0A' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate" style={{ color: '#0A0A0A' }}>{c.title || 'New session'}</div>
                    <div className="text-[11px] whitespace-nowrap" style={{ color: '#6B7280' }}>{formatWhen(getLastTimestamp(c))}</div>
                  </div>
                  <div className="text-xs mt-1 truncate" style={{ color: '#374151' }}>
                    {ellipsize(stripMarkdown(formatPreview(c)))}
                  </div>
                </button>
              ))}
            </div>
            <div className="pt-2 p-4">
              <div style={{ height: 1, background: '#ECECEC', margin: '8px 0 12px 0' }} />
              <UserMenuDropup />
            </div>
          </>
        ) : (
          <div className="mt-auto p-2 flex items-end justify-center">
            <UserMenuDropup compact />
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      <MobileDrawerLeft open={open} onClose={onClose}>
        <div className="flex items-center justify-between mb-4">
          <img src={new URL('../../assets/nirvana_bird.png', import.meta.url).toString()} alt="Nirvana" width={24} height={24} className="block" />
          <button 
            type="button" 
            onClick={onCreate} 
            className="px-3 py-1 rounded-lg text-sm font-medium transition-colors" 
            style={{ background: 'var(--colour-standard-pass)', color: '#000' }}
            aria-label="New session"
          >
            New
          </button>
        </div>
        <div className="flex-1 overflow-auto pr-0">
          {[...(chats || [])]
            .sort((a, b) => {
              const ts = (c: ChatSummary) => {
                const u = c.updated_at ? new Date(c.updated_at).getTime() : 0;
                const l = c.last_message?.created_at ? new Date(c.last_message.created_at).getTime() : 0;
                const cr = c.created_at ? new Date(c.created_at).getTime() : 0;
                return Math.max(u || 0, l || 0, cr || 0);
              };
              return ts(b) - ts(a);
            })
            .map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelect(c.id);
                if (onClose) onClose();
              }}
              className={`w-full text-left p-3 rounded-lg mb-2 transition-all duration-200 border-l-4`}
              style={{ background: activeId === c.id ? 'var(--colour-surface)' : 'transparent', borderLeftColor: activeId === c.id ? 'var(--colour-standard-pass)' : 'transparent', color: 'var(--colour-text-primary)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--colour-text-primary)' }}>{c.title || 'New session'}</div>
                <div className="text-[11px] whitespace-nowrap" style={{ color: 'var(--colour-text-muted)' }}>{formatWhen(getLastTimestamp(c))}</div>
              </div>
              <div className="text-xs mt-1 truncate" style={{ color: 'var(--colour-text-secondary)' }}>
                {ellipsize(stripMarkdown(formatPreview(c)))}
              </div>
            </button>
          ))}
        </div>
        <div className="pt-2">
          <div style={{ height: 1, background: '#ECECEC', margin: '8px 0 12px 0' }} />
          <UserMenuDropup onAction={onClose} />
        </div>
      </MobileDrawerLeft>
    </>
  );
};

export default React.memo(TalksSidebar);


