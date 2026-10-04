import { config } from '../config';

export interface Citation {
  n: number;
  title: string;
  section: string;
  url: string;
  source: string;
}

export interface ChatMeta {
  citations: Citation[];
  suggest_booking: boolean;
  suggest_contact: boolean;
  intent?: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamHandlers {
  onMeta: (meta: ChatMeta) => void;
  onToken: (text: string) => void;
  onDone: (mode: string) => void;
}

/** Thrown for anything that should show the "assistant unavailable" fallback. */
export class ChatUnavailableError extends Error {
  readonly rateLimited: boolean;

  constructor(message: string, rateLimited = false) {
    super(message);
    this.name = 'ChatUnavailableError';
    this.rateLimited = rateLimited;
  }
}

export const chatEnabled = Boolean(config.aiBaseUrl);

/**
 * POSTs a question and parses the Server-Sent Events stream.
 * (EventSource only supports GET, so this reads the fetch body stream directly.)
 */
export async function streamChat(
  message: string,
  history: ChatHistoryItem[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  if (!chatEnabled) throw new ChatUnavailableError('Chat is not configured');

  let res: Response;
  try {
    res = await fetch(`${config.aiBaseUrl}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ChatUnavailableError('Network error');
  }
  if (res.status === 429) throw new ChatUnavailableError('Rate limited', true);
  if (!res.ok || !res.body) throw new ChatUnavailableError(`HTTP ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let finished = false;

  const handleEvent = (raw: string) => {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) return;
    const data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
    switch (event) {
      case 'meta':
        handlers.onMeta(data as unknown as ChatMeta);
        break;
      case 'token':
        handlers.onToken(String(data.text ?? ''));
        break;
      case 'done':
        finished = true;
        handlers.onDone(String(data.mode ?? ''));
        break;
      case 'error':
        throw new ChatUnavailableError(String(data.message ?? 'Assistant error'));
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value.replace(/\r\n/g, '\n');
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      handleEvent(raw);
    }
  }
  if (buffer.trim()) handleEvent(buffer);
  if (!finished) throw new ChatUnavailableError('Stream ended unexpectedly');
}
