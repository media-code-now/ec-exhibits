import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useProjectSocket } from '../hooks/useProjectSocket.js';

export function ProjectChat({ projectId, token, currentUser }) {
  const { messages, sendMessage, markRead, badge } = useProjectSocket({ projectId, token });
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
    markRead();
  }, [messages, markRead]);

  const handleSubmit = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = form.get('message');
    if (!body) return;
    sendMessage(body);
    event.currentTarget.reset();
  };

  return (
    <section className="flex flex-col rounded-2xl bg-white shadow-sm border border-slate-200">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Project Messaging</h3>
          <p className="text-sm text-slate-500">Real-time chat with your EC team</p>
        </div>
        {badge > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
            {badge} new
          </span>
        )}
      </header>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">No messages yet. Start the conversation!</p>
        )}
        {messages.map(message => {
          const isCurrentUser = message.author?.id === currentUser?.id || message.author?.displayName === 'You';
          return (
            <article
              key={message.id ?? message.clientMessageId}
              className={clsx(
                'max-w-sm rounded-2xl px-4 py-3 text-sm shadow-sm',
                isCurrentUser ? 'ml-auto bg-indigo-500 text-white' : 'bg-slate-100 text-slate-800'
              )}
            >
              <div className="mb-1 flex items-center justify-between text-xs opacity-80">
                <span>{message.author?.displayName ?? 'You'}</span>
                <time>{new Date(message.createdAt ?? Date.now()).toLocaleTimeString()}</time>
              </div>
              <p>{message.body}</p>
              {message.pending && <p className="mt-2 text-[11px] opacity-70">Sending…</p>}
            </article>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-slate-200 px-6 py-4">
        <div className="flex gap-3">
          <input
            name="message"
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Write a message…"
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
