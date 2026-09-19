import { useEffect, useState } from 'react';
import { Video, LogOut, Plus, ArrowRight, Clock, Users, Copy, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type MeetingHistory } from '@/lib/supabase';

type Props = {
  onJoinRoom: (roomId: string, topic: string) => void;
};

export function Lobby({ onJoinRoom }: Props) {
  const { profile, user, signOut } = useAuth();
  const [joinId, setJoinId] = useState('');
  const [topic, setTopic] = useState('');
  const [history, setHistory] = useState<MeetingHistory[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const { data } = await supabase
        .from('meeting_history')
        .select('id, user_id, room_id, topic, joined_at, left_at, duration_seconds')
        .order('joined_at', { ascending: false })
        .limit(20);
      setHistory((data as MeetingHistory[]) ?? []);
      setLoadingHistory(false);
    }
    fetchHistory();
  }, []);

  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 9; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6, 9)}`;
  };

  const handleCreate = () => {
    const roomId = generateRoomId();
    onJoinRoom(roomId, topic.trim() || 'Instant Meeting');
  };

  const handleJoin = () => {
    const trimmed = joinId.trim().toLowerCase();
    if (trimmed) onJoinRoom(trimmed, 'Joined Meeting');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (secs: number | null) => {
    if (!secs) return '—';
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <header className="border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Video className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Pulse_Link</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-semibold">
                {(profile?.display_name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white leading-tight">
                  {profile?.display_name || 'User'}
                </p>
                <p className="text-xs text-slate-400 leading-tight">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Create / Join */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Start or join a meeting</h2>
              <p className="text-slate-400 text-sm">Create a new room or enter an ID to join an existing one.</p>
            </div>

            {/* Create card */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">New Meeting</h3>
                  <p className="text-xs text-slate-400">Generate a room and invite others</p>
                </div>
              </div>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={60}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all mb-3"
                placeholder="Meeting topic (optional)"
              />
              <button
                onClick={handleCreate}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium rounded-lg hover:from-blue-500 hover:to-cyan-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                Create Meeting
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Join card */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Join with Code</h3>
                  <p className="text-xs text-slate-400">Enter a room ID shared with you</p>
                </div>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  className="flex-1 px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all font-mono text-sm"
                  placeholder="abc-def-ghi"
                />
                <button
                  onClick={handleJoin}
                  disabled={!joinId.trim()}
                  className="px-5 py-2.5 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Right: History */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              <h2 className="text-xl font-bold text-white">Recent Meetings</h2>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
              {loadingHistory ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading history…</div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center">
                  <Video className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No meetings yet. Create or join one to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/40">
                  {history.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 hover:bg-slate-700/20 transition-colors cursor-pointer group"
                      onClick={() => onJoinRoom(m.room_id, m.topic || 'Resumed Meeting')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium text-sm truncate">{m.topic || 'Untitled Meeting'}</p>
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                            <span className="font-mono">{m.room_id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(m.room_id);
                              }}
                              className="text-slate-500 hover:text-cyan-400 transition-colors"
                            >
                              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </p>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-xs text-slate-400">{formatDate(m.joined_at)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{formatDuration(m.duration_seconds)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
