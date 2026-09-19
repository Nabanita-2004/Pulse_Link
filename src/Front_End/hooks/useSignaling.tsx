import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type SignalMessage =
  | { type: 'presence'; peerId: string; displayName: string }
  | { type: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit }
  | { type: 'leave'; peerId: string }
  | { type: 'chat'; from: string; displayName: string; text: string; ts: string }
  | { type: 'draw'; from: string; segment: DrawSegment }
  | { type: 'clear-board'; from: string }
  | { type: 'code-sync'; from: string; displayName: string; path: string; content: string }
  | { type: 'code-open'; from: string; displayName: string; path: string }
  | { type: 'code-create'; from: string; path: string; isDir: boolean }
  | { type: 'code-delete'; from: string; path: string }
  | { type: 'code-rename'; from: string; oldPath: string; newPath: string };

export type DrawSegment = {
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

type Listener = (msg: SignalMessage) => void;

export function useSignaling(roomId: string, peerId: string, displayName: string) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const listenersRef = useRef<Set<Listener>>(new Set());
  const [connected, setConnected] = useState(false);

  const subscribe = useCallback((fn: Listener) => {
    listenersRef.current.add(fn);
    return () => { listenersRef.current.delete(fn); };
  }, []);

  const send = useCallback((msg: SignalMessage) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: msg,
    });
  }, []);

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`, {
      config: { broadcast: { ack: false } },
    });

    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        listenersRef.current.forEach((fn) => fn(payload as SignalMessage));
      })
      .on('presence', { event: 'sync' }, () => {
        setConnected(true);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ peerId, displayName });
          setConnected(true);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { type: 'leave', peerId } as SignalMessage,
      });
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, peerId, displayName]);

  return { subscribe, send, connected };
}
