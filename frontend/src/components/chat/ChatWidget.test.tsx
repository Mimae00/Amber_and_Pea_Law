import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ChatWidget } from './ChatWidget';

function sseResponse(events: Array<[string, unknown]>): Response {
  const body = events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Split mid-event to exercise the stream parser's buffering.
      const bytes = encoder.encode(body);
      controller.enqueue(bytes.slice(0, 25));
      controller.enqueue(bytes.slice(25));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function renderWidget() {
  return render(
    <MemoryRouter>
      <ChatWidget />
    </MemoryRouter>,
  );
}

async function openAndAsk(question: string) {
  const user = userEvent.setup();
  renderWidget();
  await user.click(screen.getByRole('button', { name: 'Ask a question' }));
  const input = await screen.findByLabelText('Your question');
  await waitFor(() => expect(input).toHaveFocus());
  await user.type(input, `${question}{Enter}`);
  return user;
}

describe('ChatWidget', () => {
  it('opens a labelled dialog and closes with Escape, returning focus to the launcher', async () => {
    const user = userEvent.setup();
    renderWidget();
    const launcher = screen.getByRole('button', { name: 'Ask a question' });
    expect(launcher).toHaveAttribute('aria-expanded', 'false');

    await user.click(launcher);
    expect(await screen.findByRole('dialog', { name: /Ask Amber & Pea Law/ })).toBeVisible();
    expect(launcher).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
  });

  it('shows a friendly fallback with phone and booking links when the AI service is down', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await openAndAsk('What are your hours?');

    expect(await screen.findByText(/assistant is unavailable right now/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '(555) 010-0142' })).toHaveAttribute('href', 'tel:+15550100142');
    expect(screen.getByRole('link', { name: 'book a free consultation' })).toHaveAttribute('href', '/book');
  });

  it('shows the rate-limit message on 429', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 429 }));
    await openAndAsk('hello');
    expect(await screen.findByText(/a lot of messages in a short time/)).toBeInTheDocument();
  });

  it('streams an answer with source links and booking actions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        ['meta', { citations: [{ n: 1, title: 'Office Hours', section: 'Hours', url: '/contact', source: 'o.md' }], suggest_booking: true, suggest_contact: false }],
        ['token', { text: 'We are open ' }],
        ['token', { text: 'Monday to Friday. [1]' }],
        ['done', { mode: 'llm' }],
      ]),
    );
    await openAndAsk('When are you open?');

    expect(await screen.findByText('We are open Monday to Friday. [1]')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Office Hours: Hours' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'Book a free consultation' })).toHaveAttribute('href', '/book');
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'false');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://ai.test/chat/stream');
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ message: 'When are you open?', history: [] });
  });

  it('only sends chatbot contact details after consent', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('/chat/stream')) {
        return sseResponse([
          ['meta', { citations: [], suggest_booking: true, suggest_contact: true }],
          ['token', { text: 'An attorney can help.' }],
          ['done', { mode: 'canned' }],
        ]);
      }
      return new Response(JSON.stringify({ status: 'received' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    });
    const user = await openAndAsk('Can I talk to a lawyer?');

    await user.click(await screen.findByRole('button', { name: 'Yes, leave my details' }));
    await user.type(screen.getByLabelText('Name *'), 'Chat Visitor');
    await user.type(screen.getByLabelText('Email *'), 'visitor@example.com');
    await user.click(screen.getByRole('button', { name: 'Send my details' }));
    expect(await screen.findByText('Please confirm we may contact you.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/api/leads'))).toBe(false);

    await user.click(screen.getByRole('checkbox', { name: /may contact me/ }));
    await user.click(screen.getByRole('button', { name: 'Send my details' }));
    expect(await screen.findByText(/we received your details/)).toBeInTheDocument();

    const leadCall = fetchMock.mock.calls.find(([u]) => String(u) === 'http://api.test/api/leads')!;
    const body = JSON.parse(String((leadCall[1] as RequestInit).body));
    expect(body).toMatchObject({ source: 'CHATBOT', consent: true, email: 'visitor@example.com', message: 'Chat question: Can I talk to a lawyer?' });
  });
});
