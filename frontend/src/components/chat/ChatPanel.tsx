import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ChatUnavailableError,
  streamChat,
  type ChatHistoryItem,
  type Citation,
} from '../../api/chatClient';
import { firm } from '../../content/firm';
import { ChatLeadForm } from './ChatLeadForm';

type MessageStatus = 'streaming' | 'done' | 'unavailable' | 'rate-limited';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  status: MessageStatus;
  citations: Citation[];
  suggestBooking: boolean;
  suggestContact: boolean;
}

const MAX_LENGTH = 1000;
const HISTORY_LIMIT = 10;
const STARTERS = ['Is the first consultation free?', 'What are your office hours?', 'Do you handle child custody?'];

const WELCOME: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: `Hi, I'm the ${firm.name} assistant. I can answer general questions about our services, fees, hours and location. I can't give legal advice.`,
  status: 'done',
  citations: [],
  suggestBooking: false,
  suggestContact: false,
};

function citationLabel(c: Citation): string {
  return c.section ? `${c.title}: ${c.section}` : c.title;
}

/** Unique citations (same page and section only once). */
function uniqueCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = `${c.url}|${c.section}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function Fallback({ rateLimited }: { rateLimited: boolean }) {
  return (
    <div className="chat-fallback">
      <p>
        {rateLimited
          ? 'You’ve sent a lot of messages in a short time. Please wait a minute and try again.'
          : 'Sorry, our assistant is unavailable right now.'}
      </p>
      <p>
        You can call us at <a href={firm.phoneHref}>{firm.phoneDisplay}</a> or <Link to="/book">book a free consultation</Link>.
      </p>
    </div>
  );
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatPanel({ open, onClose }: ChatPanelProps) {
  const uid = useId();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, showLeadForm]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const update = (id: number, patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)));

  async function send(text: string) {
    const question = text.trim().slice(0, MAX_LENGTH);
    if (!question || busy) return;

    const history: ChatHistoryItem[] = messages
      .filter((m) => m.id !== 0 && m.status === 'done' && m.text)
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.text }));

    const userMsg: ChatMessage = { ...WELCOME, id: nextId.current++, role: 'user', text: question };
    const reply: ChatMessage = { ...WELCOME, id: nextId.current++, text: '', status: 'streaming' };
    setMessages((list) => [...list, userMsg, reply]);
    setInput('');
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat(
        question,
        history,
        {
          onMeta: (meta) =>
            update(reply.id, {
              citations: meta.citations ?? [],
              suggestBooking: meta.suggest_booking,
              suggestContact: meta.suggest_contact,
            }),
          onToken: (t) => update(reply.id, (m) => ({ text: m.text + t })),
          onDone: () => update(reply.id, { status: 'done' }),
        },
        controller.signal,
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      const rateLimited = err instanceof ChatUnavailableError && err.rateLimited;
      update(reply.id, { status: rateLimited ? 'rate-limited' : 'unavailable', text: '' });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  }

  function onPanelKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }

  const lastUserQuestion = [...messages].reverse().find((m) => m.role === 'user')?.text ?? '';
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const offerContact = !leadSent && !showLeadForm && lastAssistant?.status === 'done' && lastAssistant.suggestContact;

  return (
    <section
      id="chat-panel"
      className="chat-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${uid}-title`}
      hidden={!open}
      onKeyDown={onPanelKeyDown}
    >
      <div className="chat-panel__header">
        <div>
          <h2 id={`${uid}-title`} className="chat-panel__title">
            Ask {firm.name}
          </h2>
          <p className="chat-panel__subtitle">General information only, not legal advice.</p>
        </div>
        <button type="button" className="chat-panel__close" onClick={onClose}>
          <span className="visually-hidden">Close chat</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="chat-panel__log" ref={logRef} role="log" aria-live="polite" aria-busy={busy} aria-relevant="additions text">
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
            <span className="visually-hidden">{m.role === 'user' ? 'You said:' : 'Assistant:'}</span>
            {m.status === 'unavailable' || m.status === 'rate-limited' ? (
              <Fallback rateLimited={m.status === 'rate-limited'} />
            ) : (
              <>
                <p className="chat-msg__text">
                  {m.text || (m.status === 'streaming' ? <span className="chat-typing">Thinking…</span> : null)}
                </p>
                {m.role === 'assistant' && m.status === 'done' && m.citations.length > 0 && (
                  <div className="chat-msg__sources">
                    <span>Sources:</span>
                    <ul>
                      {uniqueCitations(m.citations).map((c) => (
                        <li key={`${c.n}-${c.source}`}>
                          {c.url.startsWith('/') ? (
                            <Link to={c.url}>{citationLabel(c)}</Link>
                          ) : (
                            <span>{citationLabel(c)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {m.role === 'assistant' && m.status === 'done' && m.suggestBooking && (
                  <div className="chat-msg__actions">
                    <Link to="/book" className="btn btn--primary btn--sm">
                      Book a free consultation
                    </Link>
                    <a href={firm.phoneHref} className="btn btn--ghost btn--sm">
                      Call {firm.phoneDisplay}
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {offerContact && (
          <div className="chat-msg chat-msg--assistant">
            <p className="chat-msg__text">Would you like someone from our team to contact you?</p>
            <div className="chat-msg__actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setShowLeadForm(true)}>
                Yes, leave my details
              </button>
            </div>
          </div>
        )}

        {showLeadForm && (
          <ChatLeadForm
            question={lastUserQuestion}
            onCancel={() => {
              setShowLeadForm(false);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            onSent={() => {
              setLeadSent(true);
              setShowLeadForm(false);
              setMessages((list) => [
                ...list,
                {
                  ...WELCOME,
                  id: nextId.current++,
                  text: 'Thanks, we received your details. Someone from our team will contact you within one business day.',
                },
              ]);
              // The form unmounts; keep keyboard focus inside the panel.
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          />
        )}

        {messages.length === 1 && (
          <div className="chat-starters" aria-label="Suggested questions" role="group">
            {STARTERS.map((q) => (
              <button key={q} type="button" className="chat-starter" onClick={() => void send(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <form className="chat-panel__form" onSubmit={onSubmit}>
        <label htmlFor={`${uid}-input`} className="visually-hidden">
          Your question
        </label>
        <textarea
          id={`${uid}-input`}
          ref={inputRef}
          rows={2}
          maxLength={MAX_LENGTH}
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onInputKeyDown}
          aria-describedby={`${uid}-hint`}
        />
        <button type="submit" className="btn btn--primary" disabled={busy || !input.trim()}>
          Send
        </button>
        <p id={`${uid}-hint`} className="chat-panel__hint">
          Please don’t share confidential details. Press Enter to send.
        </p>
      </form>
    </section>
  );
}
