import { useEffect, useRef, useState } from 'react';
import { apiPost } from '../lib/api';

const SUGGESTED = [
  'Who owes me money?',
  "How's my cash looking?",
  'What was my best job this month?',
  'Draft a payment reminder for [client]',
];

const GREETING = {
  role: 'assistant',
  content:
    "I've got your QuickBooks pulled up. Ask me about your cash, who owes you, or your jobs — or tap one below.",
};

export default function AiAssistant({ connected = true }) {
  const [messages, setMessages] = useState([GREETING]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    try {
      // Send only the real back-and-forth (skip the local greeting).
      const history = next.filter((m, i) => !(i === 0 && m === GREETING));
      const { reply } = await apiPost('/assistant', { messages: history });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const msg =
        err.message && /connect/i.test(err.message)
          ? 'Connect QuickBooks first so I can see your numbers.'
          : `Sorry — ${err.message || 'something went wrong'}.`;
      setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setBusy(false);
    }
  }

  function tapChip(text) {
    // Prompts with a placeholder get dropped into the box to edit; others send.
    if (text.includes('[')) {
      setDraft(text);
      inputRef.current?.focus();
    } else {
      send(text);
    }
  }

  if (!connected) {
    return (
      <div className="card text-center text-sm text-cream-300/80">
        Connect QuickBooks to ask the assistant about your money.
      </div>
    );
  }

  return (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${
              m.role === 'ai' || m.role === 'assistant'
                ? 'bg-ground-800/80 text-cream-200'
                : 'ml-6 bg-amber-500/20 text-amber-100'
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-1 px-3 py-2 text-cream-300/60">
            <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400" />
          </div>
        )}
      </div>

      {/* Suggested prompts (until the conversation gets going) */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => tapChip(s)}
              className="rounded-full border border-amber-900/40 px-3 py-1 text-xs text-cream-200 transition hover:border-amber-500 hover:text-amber-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="border-t border-amber-900/20 p-2"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your money…"
            className="min-w-0 flex-1 rounded-lg border border-amber-900/30 bg-ground-800 px-3 py-2 text-sm text-cream-50 placeholder-cream-300/30 outline-none focus:border-amber-500/70"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-ground-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            &#8594;
          </button>
        </div>
      </form>
    </div>
  );
}
