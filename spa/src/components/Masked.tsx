import { ReactNode, useMemo } from 'react';
import { useCompliance } from '../context/ComplianceContext';

type Props = {
  children: ReactNode;
  className?: string;
  inline?: boolean;
  blur?: boolean;
  scramble?: boolean;
  force?: boolean; // force masking regardless of acceptance
  skeleton?: boolean; // render subtle skeleton bar instead of blur text
  blurPx?: number; // override blur strength in px
};

// Session-stable digit offset for numeric-like scrambling
const DIGIT_OFFSET: number = (() => {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const v = (buf[0] % 9) + 1; // 1..9
    return v;
  } catch {
    return 7;
  }
})();

function scrambleText(input: string): string {
  // For digits: shift by session-stable offset so it still looks like numbers
  // For letters: use fullwidth; keep punctuation as-is
  const punct: Record<string, string> = { '-': '−', '%': '%', '.': '.', ',': ',', ' ': ' ' };
  const toFullwidth = (ch: string): string => {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(0xFF21 + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCharCode(0xFF41 + (code - 97));
    return '█';
  };
  return input.split('').map((ch) => {
    if (ch >= '0' && ch <= '9') {
      const d = ch.charCodeAt(0) - 48;
      return String(((d + DIGIT_OFFSET) % 10));
    }
    if (punct[ch] != null) return punct[ch];
    return toFullwidth(ch);
  }).join('');
}

export default function Masked({ children, className, inline, blur = true, scramble = true, force = false, skeleton = false, blurPx }: Props) {
  const { state } = useCompliance();

  const shouldMask = force || !state.accepted;

  if (!shouldMask) {
    return <>{children}</>;
  }

  const text = useMemo(() => {
    if (!scramble) return '';
    const raw = typeof children === 'string' ? children : '';
    return scrambleText(raw || '████');
  }, [children, scramble]);

  const Wrapper = inline ? 'span' : 'div';
  if (skeleton) {
    const style: React.CSSProperties = {
      display: inline ? 'inline-block' as any : 'block',
      height: '1em',
      lineHeight: '1',
      borderRadius: '8px',
      background: 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.16), rgba(255,255,255,0.06))',
      color: 'transparent',
      userSelect: 'none',
      width: '100%',
    };
    return (
      <Wrapper className={className} style={style} aria-hidden>
        {scramble ? text : ' '}
      </Wrapper>
    );
  }

  const style = blur ? { filter: `blur(${Number.isFinite(blurPx as any) ? blurPx : 3}px)`, userSelect: 'none' as const } : undefined;
  return <Wrapper className={className} style={style}>{scramble ? text : ' '}</Wrapper>;
}


