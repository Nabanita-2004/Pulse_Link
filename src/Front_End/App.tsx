import { useState } from 'react';
import { Loader2, Video } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/pages/AuthPage';
import { Lobby } from '@/pages/Lobby';
import { MeetingRoom } from '@/pages/MeetingRoom';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [activeRoom, setActiveRoom] = useState<{ roomId: string; topic: string } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Video className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (activeRoom) {
    return (
      <MeetingRoom
        roomId={activeRoom.roomId}
        topic={activeRoom.topic}
        displayName={profile?.display_name || session.user.email || 'User'}
        onLeave={() => setActiveRoom(null)}
      />
    );
  }

  return <Lobby onJoinRoom={(roomId, topic) => setActiveRoom({ roomId, topic })} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
