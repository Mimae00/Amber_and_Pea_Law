import { lazy, Suspense, useCallback, useRef, useState } from 'react';

// The panel (and its logic) loads on first open, keeping the initial page bundle small.
const ChatPanel = lazy(() => import('./ChatPanel'));

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  return (
    <div className="chat-widget">
      {everOpened && (
        <Suspense fallback={null}>
          <ChatPanel open={open} onClose={close} />
        </Suspense>
      )}
      <button
        ref={launcherRef}
        type="button"
        className="chat-launcher"
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => {
          setEverOpened(true);
          setOpen((o) => !o);
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
          <path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          <circle cx="8" cy="11" r="1.4" fill="#1b2a41" />
          <circle cx="12" cy="11" r="1.4" fill="#1b2a41" />
          <circle cx="16" cy="11" r="1.4" fill="#1b2a41" />
        </svg>
        <span>{open ? 'Close chat' : 'Ask a question'}</span>
      </button>
    </div>
  );
}
