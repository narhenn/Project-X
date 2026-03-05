'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ChatMessage = { role: 'user' | 'model'; text: string };

type ChatbotModalProps = {
  open: boolean;
  onClose: () => void;
  segmentIndex?: number;
  currentTimeSeconds?: number;
  segmentCount?: number;
  moduleTopic?: string;
  segmentTitle?: string;
};

export function ChatbotModal({
  open,
  onClose,
  segmentIndex = 0,
  currentTimeSeconds = 0,
  segmentCount = 1,
  moduleTopic = '',
  segmentTitle = '',
}: ChatbotModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const systemInstructionRef = useRef<string>('');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!open) return;
    setMessages([]);
    setError(null);
    setInput('');

    const topicContext = [moduleTopic, segmentTitle].filter(Boolean).join('. ');
    const context = topicContext
      ? `You are a tutor helping a student with ONE specific video lecture. The subject of this video is ONLY: ${topicContext}. Current segment (${segmentIndex + 1} of ${segmentCount}): "${segmentTitle}". Video time: about ${Math.floor(currentTimeSeconds / 60)}:${String(currentTimeSeconds % 60).padStart(2, '0')}. They clicked "I'm lost". RULES: Answer ONLY about this video's topic (e.g. computer/software security, format strings, vulnerabilities). Do NOT mention or discuss any other subject (no biology, no mathematics/differentiation, no chemistry, no unrelated topics). If the student asks about something outside this video, politely redirect to the current topic. Be concise and helpful.`
      : `The student is watching a learning video. They are on segment ${segmentIndex + 1} of ${segmentCount} (about ${Math.floor(currentTimeSeconds / 60)}:${String(currentTimeSeconds % 60).padStart(2, '0')} in). They clicked "I'm lost". Be concise and helpful.`;
    systemInstructionRef.current = context;

    const greeting = segmentTitle
      ? `Hi! You're on Segment ${segmentIndex + 1}: ${segmentTitle}. ${moduleTopic ? `This module is about: ${moduleTopic}. ` : ''}Ask me anything about this video or the material—I'm here to help.`
      : `Hi! You're on segment ${segmentIndex + 1}. Ask me anything about the video or the material—I'm here to help.`;
    setMessages([{ role: 'model', text: greeting }]);
  }, [open, segmentIndex, segmentCount, currentTimeSeconds, moduleTopic, segmentTitle]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const chatMessages = [...messages, { role: 'user' as const, text }];
      const apiMessages = chatMessages.map((m) => ({
        role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          systemInstruction: systemInstructionRef.current,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }
      const reply = data.text ?? "I couldn't generate a response. Try rephrasing.";
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setMessages((prev) => [...prev, { role: 'model', text: message }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Ask for help</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {error && (
            <p className="text-red-400 text-sm px-1">{error}</p>
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400">
                Thinking…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="flex-1 rounded-lg bg-gray-700 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
