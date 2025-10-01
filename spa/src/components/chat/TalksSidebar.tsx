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
      <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${animOpen ? 'opacity-100' : 'opacity-0'}`} />
      <div 
        className={`absolute inset-y-0 left-0 w-[85vw] max-w-[340px] bg-black/90 backdrop-blur-md border-r border-white/10 p-4 shadow-2xl h-full overflow-auto transform-gpu will-change-transform transform transition-transform duration-300 ease-in-out ${animOpen ? 'translate-x-0' : '-translate-x-full'}`}
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

export const TalksSidebar: React.FC<Props> = ({ chats, activeId, onSelect, onCreate, open, onClose }) => {
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

  const UserMenuDropup: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
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
          className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 flex items-center justify-between"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="truncate text-sm">{displayName}</span>
          <span className="ml-2 text-xs">{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div
            role="menu"
            className="absolute bottom-full left-0 right-0 mb-2 glass nv-glass--inner-hairline border border-white/10 rounded-lg overflow-hidden shadow-xl z-10 bg-[#212121]"
          >
            <button
              type="button"
              onClick={goAccount}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
              role="menuitem"
            >
              Account
            </button>
            <div className="h-px bg-white/10" />
            <button
              type="button"
              onClick={goLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-white/10"
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
      <div className={`${open ? 'hidden md:flex' : 'hidden'} md:flex-col md:w-64 glass nv-glass--inner-hairline !bg-[#212121] border border-white/10 rounded-2xl p-2 m-2 md:h-[calc(100dvh-1rem)] md:overflow-hidden`}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-medium text-white trajan-text">Sessions</div>
          <button 
            type="button" 
            onClick={onCreate} 
            className="px-3 py-1 rounded-lg bg-[#c19658] hover:bg-[#d1a668] text-sm text-black font-medium transition-colors" 
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
              onClick={() => onSelect(c.id)}
              className={`w-full text-left p-3 rounded-lg mb-2 transition-all duration-200 ${
                activeId === c.id 
                  ? 'bg-white/15 border-l-4 border-[#c19658]' 
                  : 'hover:bg-white/10 border-l-4 border-transparent'
              } text-gray-200`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate">{c.title || 'New session'}</div>
                <div className="text-[11px] text-gray-400 whitespace-nowrap">{formatWhen(getLastTimestamp(c))}</div>
              </div>
              <div className="text-xs text-gray-400 mt-1 truncate">
                {ellipsize(stripMarkdown(formatPreview(c)))}
              </div>
            </button>
          ))}
        </div>
        <div className="pt-2 border-t border-white/10">
          <UserMenuDropup />
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawerLeft open={open} onClose={onClose}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-medium text-white trajan-text">Sessions</div>
          <button 
            type="button" 
            onClick={onCreate} 
            className="px-3 py-1 rounded-lg bg-[#c19658] hover:bg-[#d1a668] text-sm text-black font-medium transition-colors" 
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
              className={`w-full text-left p-3 rounded-lg mb-2 transition-all duration-200 ${
                activeId === c.id 
                  ? 'bg-white/15 border-l-4 border-[#c19658]' 
                  : 'hover:bg-white/10 border-l-4 border-transparent'
              } text-gray-200`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate">{c.title || 'New session'}</div>
                <div className="text-[11px] text-gray-400 whitespace-nowrap">{formatWhen(getLastTimestamp(c))}</div>
              </div>
              <div className="text-xs text-gray-400 mt-1 truncate">
                {ellipsize(stripMarkdown(formatPreview(c)))}
              </div>
            </button>
          ))}
        </div>
        <div className="pt-2 border-t border-white/10">
          <UserMenuDropup onAction={onClose} />
        </div>
      </MobileDrawerLeft>
    </>
  );
};

export default React.memo(TalksSidebar);


