import { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import type { ChatMessage } from '@/hooks/useWebRTC';

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
};

export function ChatPanel({ messages, onSend }: Props) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed);
      setText('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50 bg-slate-800/40">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-white">Chat</span>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 text-sm mt-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'}`}>
              {!msg.self && (
                <span className="text-xs text-cyan-400 font-medium mb-0.5">{msg.displayName}</span>
              )}
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                  msg.self
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-br-md'
                    : 'bg-slate-700/60 text-slate-100 rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {new Date(msg.ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t border-slate-700/50 bg-slate-800/40">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            maxLength={500}
            placeholder="Type a message…"
            className="flex-1 px-3.5 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="p-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:from-blue-500 hover:to-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
