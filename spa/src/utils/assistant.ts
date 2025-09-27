export type NirAssistant =
  | { action: 'matches'; query?: string; symbol?: string; loss_tolerance_pct?: number; assistant_text?: string }
  | { action: 'candidates'; query?: string; assistant_text?: string }
  | { action: 'summary'; symbol: string; assistant_text?: string }
  | { action: 'ask_tol'; assistant_text?: string }
  | { action: 'clarify'; assistant_text?: string }
  | { action: 'weather'; query: string; assistant_text?: string }
  | { action: 'help'; assistant_text?: string }
  | { action: 'comment'; assistant_text?: string };

/**
 * Parse assistant free-text into structured JSON if present.
 * Strategy:
 * 1) Try fenced json block ```json ...```
 * 2) Try whole text as JSON
 * 3) Try first {...} substring
 * Fallback: return comment with original text.
 */
export function parseAssistantText(raw: string): NirAssistant {
  const text = (raw ?? '').trim();
  if (!text) return { action: 'help', assistant_text: '' };

  const candidates: string[] = [];
  const fence = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  if (fence && fence[1]) candidates.push(fence[1]);
  candidates.push(text);
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace && brace[0]) candidates.push(brace[0]);

  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      if (obj && typeof obj === 'object' && typeof (obj as any).action === 'string') {
        return obj as NirAssistant;
      }
    } catch {}
  }

  return { action: 'comment', assistant_text: text };
}


