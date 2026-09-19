import { useCallback, useEffect, useRef, useState } from 'react';
import type { SignalMessage, DrawSegment } from '@/hooks/useSignaling';

type RemotePeer = {
  peerId: string;
  displayName: string;
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
};

export type ChatMessage = {
  id: string;
  from: string;
  displayName: string;
  text: string;
  ts: string;
  self: boolean;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useWebRTC(
  roomId: string,
  peerId: string,
  displayName: string,
  onRemoteLeave: (peerId: string) => void
) {
  const { subscribe, send, connected } = useSignalingBridge(roomId, peerId, displayName);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const peersRef = useRef<Map<string, RemotePeer>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const sendersRef = useRef<Map<string, RTCRtpSender[]>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const updatePeerState = useCallback(() => {
    setRemotePeers(new Map(peersRef.current));
  }, []);

  const createPeer = useCallback(
    async (remotePeerId: string, remoteName: string, isInitiator: boolean) => {
      if (peersRef.current.has(remotePeerId)) return;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      const peer: RemotePeer = {
        peerId: remotePeerId,
        displayName: remoteName,
        pc,
        stream: null,
        screenStream: null,
        isScreenSharing: false,
      };
      peersRef.current.set(remotePeerId, peer);
      updatePeerState();

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({
            type: 'ice',
            from: peerId,
            to: remotePeerId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (e) => {
        const existing = peersRef.current.get(remotePeerId);
        if (!existing) return;
        if (e.streams[0]) {
          // Check if this is a screen share track (we use stream id naming convention)
          const isScreen = e.track.kind === 'video' && e.streams[0].id.includes('screen');
          if (isScreen) {
            existing.screenStream = e.streams[0];
            existing.isScreenSharing = true;
          } else {
            existing.stream = e.streams[0];
          }
          updatePeerState();
        }
      };

      // Add local tracks
      const stream = localStreamRef.current;
      if (stream) {
        const senders: RTCRtpSender[] = [];
        stream.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, stream);
          senders.push(sender);
        });
        sendersRef.current.set(remotePeerId, senders);
      }

      // If already screen sharing, add those tracks too
      const screenStream = localScreenStreamRef.current;
      if (screenStream) {
        screenStream.getVideoTracks().forEach((track) => {
          pc.addTrack(track, screenStream);
        });
      }

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: 'offer', from: peerId, to: remotePeerId, sdp: offer });
      }
    },
    [peerId, send, updatePeerState]
  );

  // Handle incoming signals
  useEffect(() => {
    const unsub = subscribe(async (msg: SignalMessage) => {
      switch (msg.type) {
        case 'presence': {
          // A new peer announced themselves; if our ID is "less", we initiate
          if (msg.peerId !== peerId) {
            const shouldInitiate = peerId < msg.peerId;
            await createPeer(msg.peerId, msg.displayName, shouldInitiate);
          }
          break;
        }
        case 'offer': {
          if (msg.to !== peerId) return;
          let peer = peersRef.current.get(msg.from);
          if (!peer) {
            await createPeer(msg.from, 'Guest', false);
            peer = peersRef.current.get(msg.from);
          }
          if (peer) {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await peer.pc.createAnswer();
            await peer.pc.setLocalDescription(answer);
            send({ type: 'answer', from: peerId, to: msg.from, sdp: answer });
            // Flush pending ICE
            const pending = pendingIceRef.current.get(msg.from);
            if (pending) {
              for (const c of pending) {
                try {
                  await peer.pc.addIceCandidate(new RTCIceCandidate(c));
                } catch { /* ignore */ }
              }
              pendingIceRef.current.delete(msg.from);
            }
          }
          break;
        }
        case 'answer': {
          if (msg.to !== peerId) return;
          const peer = peersRef.current.get(msg.from);
          if (peer) {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const pending = pendingIceRef.current.get(msg.from);
            if (pending) {
              for (const c of pending) {
                try {
                  await peer.pc.addIceCandidate(new RTCIceCandidate(c));
                } catch { /* ignore */ }
              }
              pendingIceRef.current.delete(msg.from);
            }
          }
          break;
        }
        case 'ice': {
          if (msg.to !== peerId) return;
          const peer = peersRef.current.get(msg.from);
          if (peer && peer.pc.remoteDescription) {
            try {
              await peer.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch { /* ignore */ }
          } else {
            const arr = pendingIceRef.current.get(msg.from) ?? [];
            arr.push(msg.candidate);
            pendingIceRef.current.set(msg.from, arr);
          }
          break;
        }
        case 'leave': {
          const peer = peersRef.current.get(msg.peerId);
          if (peer) {
            peer.pc.close();
            peersRef.current.delete(msg.peerId);
            sendersRef.current.delete(msg.peerId);
            updatePeerState();
            onRemoteLeave(msg.peerId);
          }
          break;
        }
        case 'chat': {
          if (msg.from !== peerId) {
            setChatMessages((prev) => [
              ...prev,
              {
                id: `${msg.from}-${msg.ts}`,
                from: msg.from,
                displayName: msg.displayName,
                text: msg.text,
                ts: msg.ts,
                self: false,
              },
            ]);
          }
          break;
        }
        // draw and clear-board handled by whiteboard component via subscribe
        default:
          break;
      }
    });
    return unsub;
  }, [subscribe, peerId, createPeer, send, updatePeerState, onRemoteLeave]);

  // Announce presence when connected
  useEffect(() => {
    if (connected) {
      send({ type: 'presence', peerId, displayName });
    }
  }, [connected, peerId, displayName, send]);

  // Start local media
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (err) {
      console.error('Failed to get user media:', err);
      // Try audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCamOn(false);
      } catch (err2) {
        console.error('Failed to get audio:', err2);
      }
    }
  }, []);

  // Toggle mic
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setMicOn(stream.getAudioTracks().every((t) => t.enabled));
    }
  }, []);

  // Toggle camera
  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setCamOn(stream.getVideoTracks().every((t) => t.enabled));
    }
  }, []);

  // Screen share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share
      const screenStream = localScreenStreamRef.current;
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      localScreenStreamRef.current = null;
      setLocalScreenStream(null);
      setIsScreenSharing(false);

      // Replace screen senders with camera tracks
      peersRef.current.forEach((peer, remoteId) => {
        const senders = peer.pc.getSenders();
        const camStream = localStreamRef.current;
        if (camStream) {
          const camVideoTrack = camStream.getVideoTracks()[0];
          if (camVideoTrack) {
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender) videoSender.replaceTrack(camVideoTrack);
          }
        }
      });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        localScreenStreamRef.current = screenStream;
        setLocalScreenStream(screenStream);
        setIsScreenSharing(true);

        // Replace camera video track with screen track on all peers
        peersRef.current.forEach((peer) => {
          const senders = peer.pc.getSenders();
          const screenTrack = screenStream.getVideoTracks()[0];
          if (screenTrack) {
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender) videoSender.replaceTrack(screenTrack);
          }
        });

        screenStream.getVideoTracks()[0].onended = () => {
          localScreenStreamRef.current = null;
          setLocalScreenStream(null);
          setIsScreenSharing(false);
          peersRef.current.forEach((peer) => {
            const senders = peer.pc.getSenders();
            const camStream = localStreamRef.current;
            if (camStream) {
              const camTrack = camStream.getVideoTracks()[0];
              if (camTrack) {
                const videoSender = senders.find((s) => s.track?.kind === 'video');
                if (videoSender) videoSender.replaceTrack(camTrack);
              }
            }
          });
        };
      } catch (err) {
        console.error('Screen share failed:', err);
      }
    }
  }, [isScreenSharing]);

  // Send chat
  const sendChat = useCallback(
    (text: string) => {
      const ts = new Date().toISOString();
      setChatMessages((prev) => [
        ...prev,
        { id: `${peerId}-${ts}`, from: peerId, displayName, text, ts, self: true },
      ]);
      send({ type: 'chat', from: peerId, displayName, text, ts });
    },
    [peerId, displayName, send]
  );

  // Send draw segment
  const sendDraw = useCallback(
    (segment: DrawSegment) => {
      send({ type: 'draw', from: peerId, segment });
    },
    [peerId, send]
  );

  // Send clear board
  const sendClearBoard = useCallback(() => {
    send({ type: 'clear-board', from: peerId });
  }, [peerId, send]);

  // Send code file content change
  const sendCodeSync = useCallback(
    (path: string, content: string) => {
      send({ type: 'code-sync', from: peerId, displayName, path, content });
    },
    [peerId, displayName, send]
  );

  // Send code file opened
  const sendCodeOpen = useCallback(
    (path: string) => {
      send({ type: 'code-open', from: peerId, displayName, path });
    },
    [peerId, displayName, send]
  );

  // Send file/folder created
  const sendCodeCreate = useCallback(
    (path: string, isDir: boolean) => {
      send({ type: 'code-create', from: peerId, path, isDir });
    },
    [peerId, send]
  );

  // Send file/folder deleted
  const sendCodeDelete = useCallback(
    (path: string) => {
      send({ type: 'code-delete', from: peerId, path });
    },
    [peerId, send]
  );

  // Send file/folder renamed
  const sendCodeRename = useCallback(
    (oldPath: string, newPath: string) => {
      send({ type: 'code-rename', from: peerId, oldPath, newPath });
    },
    [peerId, send]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      peersRef.current.forEach((p) => p.pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    localStream,
    localScreenStream,
    isScreenSharing,
    remotePeers,
    micOn,
    camOn,
    chatMessages,
    connected,
    subscribe,
    startMedia,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    sendChat,
    sendDraw,
    sendClearBoard,
    sendCodeSync,
    sendCodeOpen,
    sendCodeCreate,
    sendCodeDelete,
    sendCodeRename,
  };
}

// Re-export the signaling hook to avoid circular deps
import { useSignaling } from '@/hooks/useSignaling';

function useSignalingBridge(roomId: string, peerId: string, displayName: string) {
  return useSignaling(roomId, peerId, displayName);
}
