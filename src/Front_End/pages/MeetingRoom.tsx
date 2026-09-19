import { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Phone, Users, MessageSquare, PenTool, LayoutGrid, Copy, Check,
  Volume2, Code2,
} from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Whiteboard } from '@/components/Whiteboard';
import { ChatPanel } from '@/components/ChatPanel';
import { CodePanel } from '@/components/CodePanel';
import { supabase } from '@/lib/supabase';

type Props = {
  roomId: string;
  topic: string;
  displayName: string;
  onLeave: () => void;
};

type Panel = 'none' | 'chat' | 'whiteboard' | 'code';

export function MeetingRoom({ roomId, topic, displayName, onLeave }: Props) {
  const peerId = useRef(crypto.randomUUID()).current;
  const [panel, setPanel] = useState<Panel>('none');
  const [copied, setCopied] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [brushWidth, setBrushWidth] = useState(3);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const joinTimeRef = useRef<Date>(new Date());
  const [elapsed, setElapsed] = useState('00:00');

  const {
    localStream, localScreenStream, isScreenSharing,
    remotePeers, micOn, camOn, chatMessages, connected,
    subscribe, startMedia, toggleMic, toggleCam, toggleScreenShare,
    sendChat, sendDraw, sendClearBoard,
    sendCodeSync, sendCodeOpen, sendCodeCreate, sendCodeDelete,
  } = useWebRTC(roomId, peerId, displayName, () => {});

  // Start media on mount
  useEffect(() => {
    startMedia();
  }, [startMedia]);

  // Record meeting in history on join
  useEffect(() => {
    const recordMeeting = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('meeting_history').insert({
          room_id: roomId,
          topic,
        });
      }
    };
    recordMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - joinTimeRef.current.getTime()) / 1000);
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      setElapsed(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simple audio level detection for active speaker
  useEffect(() => {
    if (!localStream) return;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(localStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const check = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      if (avg > 20) setSpeakingId('local');
      else if (speakingId === 'local') setSpeakingId(null);
    }, 300);

    return () => {
      clearInterval(check);
      audioContext.close();
    };
  }, [localStream, speakingId]);

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    const secs = Math.floor((Date.now() - joinTimeRef.current.getTime()) / 1000);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase
        .from('meeting_history')
        .update({ left_at: new Date().toISOString(), duration_seconds: secs })
        .eq('room_id', roomId)
        .order('joined_at', { ascending: false })
        .limit(1);
    }
    onLeave();
  };

  const peerCount = remotePeers.size + 1;
  const allPeers = [
    { id: 'local', name: displayName + ' (You)', stream: localScreenStream || localStream, isScreen: isScreenSharing, isLocal: true },
    ...Array.from(remotePeers.values()).map((p) => ({
      id: p.peerId,
      name: p.displayName,
      stream: p.screenStream || p.stream,
      isScreen: p.isScreenSharing,
      isLocal: false,
    })),
  ];

  const isPinned = allPeers.length > 2;

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
            <Video className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">{topic}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <button
                onClick={handleCopyRoom}
                className="flex items-center gap-1 hover:text-cyan-400 transition-colors font-mono"
              >
                {roomId}
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono tabular-nums">{elapsed}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg">
            <Users className="w-3.5 h-3.5" />
            {peerCount}
          </div>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className={`flex-1 overflow-hidden ${panel !== 'none' ? 'lg:flex-none lg:w-1/2 xl:w-3/5' : 'w-full'}`}>
          <div className={`h-full p-3 ${isPinned ? 'grid' : 'flex items-center justify-center'}`}
            style={isPinned ? {
              gridTemplateColumns: `repeat(${Math.min(allPeers.length, 2)}, 1fr)`,
              gridAutoRows: 'minmax(0, 1fr)',
              gap: '0.75rem',
            } : undefined}
          >
            {allPeers.map((peer) => (
              <VideoTile
                key={peer.id}
                stream={peer.stream}
                name={peer.name}
                isScreen={peer.isScreen}
                isLocal={peer.isLocal}
                camOn={peer.isLocal ? camOn : undefined}
                speaking={speakingId === peer.id}
                fill={allPeers.length <= 2}
              />
            ))}
            {allPeers.length === 1 && (
              <div className="flex flex-col items-center justify-center text-slate-500 w-full">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-slate-600" />
                </div>
                <p className="text-sm">Waiting for others to join…</p>
                <p className="text-xs text-slate-600 mt-1">Share the room ID: <span className="font-mono text-cyan-400">{roomId}</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        {panel !== 'none' && (
          <aside className="w-full lg:w-1/2 xl:w-2/5 border-l border-slate-800 bg-slate-900/60 flex flex-col">
            <div className="flex items-center border-b border-slate-800">
              <button
                onClick={() => setPanel('chat')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  panel === 'chat' ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setPanel('whiteboard')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  panel === 'whiteboard' ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                Whiteboard
              </button>
              <button
                onClick={() => setPanel('code')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  panel === 'code' ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setPanel('none')}
                className="px-4 py-2.5 text-slate-400 hover:text-white"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {panel === 'chat' && <ChatPanel messages={chatMessages} onSend={sendChat} />}
              {panel === 'whiteboard' && (
                <Whiteboard
                  subscribe={subscribe}
                  onDraw={sendDraw}
                  onClear={sendClearBoard}
                  color={color}
                  setColor={setColor}
                  brushWidth={brushWidth}
                  setBrushWidth={setBrushWidth}
                />
              )}
              {panel === 'code' && (
                <CodePanel
                  subscribe={subscribe}
                  onCodeSync={sendCodeSync}
                  onCodeOpen={sendCodeOpen}
                  onCodeCreate={sendCodeCreate}
                  onCodeDelete={sendCodeDelete}
                  displayName={displayName}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Controls bar */}
      <footer className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900/80 border-t border-slate-800 flex-shrink-0">
        <ControlButton
          active={micOn}
          onClick={toggleMic}
          onIcon={<Mic className="w-5 h-5" />}
          offIcon={<MicOff className="w-5 h-5" />}
          label={micOn ? 'Mute' : 'Unmute'}
        />
        <ControlButton
          active={camOn}
          onClick={toggleCam}
          onIcon={<Video className="w-5 h-5" />}
          offIcon={<VideoOff className="w-5 h-5" />}
          label={camOn ? 'Stop Video' : 'Start Video'}
        />
        <ControlButton
          active={!isScreenSharing}
          onClick={toggleScreenShare}
          onIcon={<Monitor className="w-5 h-5" />}
          offIcon={<MonitorOff className="w-5 h-5" />}
          label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
          highlight={isScreenSharing}
        />
        <div className="w-px h-8 bg-slate-700 mx-1" />
        <ControlButton
          active={panel !== 'whiteboard'}
          onClick={() => setPanel(panel === 'whiteboard' ? 'none' : 'whiteboard')}
          onIcon={<PenTool className="w-5 h-5" />}
          offIcon={<PenTool className="w-5 h-5" />}
          label="Whiteboard"
          highlight={panel === 'whiteboard'}
        />
        <ControlButton
          active={panel !== 'chat'}
          onClick={() => setPanel(panel === 'chat' ? 'none' : 'chat')}
          onIcon={<MessageSquare className="w-5 h-5" />}
          offIcon={<MessageSquare className="w-5 h-5" />}
          label="Chat"
          highlight={panel === 'chat'}
          badge={chatMessages.filter((m) => !m.self).length > 0 && panel !== 'chat'}
        />
        <ControlButton
          active={panel !== 'code'}
          onClick={() => setPanel(panel === 'code' ? 'none' : 'code')}
          onIcon={<Code2 className="w-5 h-5" />}
          offIcon={<Code2 className="w-5 h-5" />}
          label="Code"
          highlight={panel === 'code'}
        />
        <div className="w-px h-8 bg-slate-700 mx-1" />
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-red-600/20"
        >
          <Phone className="w-5 h-5 rotate-[135deg]" />
          Leave
        </button>
      </footer>
    </div>
  );
}

function ControlButton({
  active, onClick, onIcon, offIcon, label, highlight, badge,
}: {
  active: boolean;
  onClick: () => void;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  label: string;
  highlight?: boolean;
  badge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all ${
        highlight
          ? 'bg-blue-600 text-white'
          : active
          ? 'bg-slate-800 text-white hover:bg-slate-700'
          : 'bg-red-600/90 text-white hover:bg-red-500'
      }`}
      title={label}
    >
      {active ? onIcon : offIcon}
      <span className="text-[10px] mt-0.5 hidden sm:block">{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cyan-400 rounded-full border-2 border-slate-900" />
      )}
    </button>
  );
}

function VideoTile({
  stream, name, isScreen, isLocal, camOn, speaking, fill,
}: {
  stream: MediaStream | null;
  name: string;
  isScreen: boolean;
  isLocal: boolean;
  camOn?: boolean;
  speaking: boolean;
  fill: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [stream]);

  const showVideo = isScreen || (camOn !== false && stream?.getVideoTracks().some((t) => t.enabled));

  return (
    <div
      className={`relative bg-slate-800 rounded-xl overflow-hidden border-2 transition-all ${
        speaking ? 'border-cyan-400 shadow-lg shadow-cyan-500/20' : 'border-transparent'
      } ${fill ? 'w-full h-full max-h-[80vh]' : 'h-full'}`}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isScreen ? 'object-contain bg-slate-950' : ''} ${isLocal && !isScreen ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xl font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-medium drop-shadow-lg">{name}</span>
          {isLocal && !isScreen && camOn === false && <VideoOff className="w-3 h-3 text-slate-300" />}
        </div>
        {!isLocal && <Volume2 className="w-3.5 h-3.5 text-slate-300" />}
      </div>
    </div>
  );
}
