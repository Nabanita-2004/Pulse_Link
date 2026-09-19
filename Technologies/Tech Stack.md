# Pulse_Link — Technology Stack

## Overview

Pulse_Link is a real-time video conferencing and collaboration platform built with a modern web stack. The app combines peer-to-peer video calling, shared whiteboard, live code editing, and text chat — all synced in real time.

---

## Frontend

The entire user interface runs in the browser as a single-page application.

| Technology | Purpose |
|---|---|
| **React 18** | UI framework — component-based architecture with hooks |
| **TypeScript** | Type-safe JavaScript for fewer runtime errors |
| **Vite** | Build tool and dev server — fast hot-module reloading |
| **Tailwind CSS** | Utility-first CSS framework for styling |
| **Lucide React** | Icon library (mic, video, chat, code icons) |

### Key Frontend Libraries

- **@monaco-editor/react** — VS Code's Monaco editor engine, powering the collaborative code editor
- **WebRTC API** — Browser-native peer-to-peer video, audio, and data channels
- **Canvas API** — HTML5 canvas for the shared whiteboard drawing surface

---

## Backend

The backend is powered by Supabase (PostgreSQL + realtime + auth).

| Technology | Purpose |
|---|---|
| **Supabase Auth** | Email/password authentication and session management |
| **PostgreSQL** | Relational database for user profiles and meeting history |
| **Row Level Security (RLS)** | Database-level access control — users can only see their own data |
| **Supabase Realtime Channels** | Broadcast messaging for WebRTC signaling, chat, whiteboard, and code sync |

### Database Tables

- **profiles** — display name and avatar for each user
- **meeting_history** — room ID, topic, join/leave timestamps, and duration

### Migrations

All schema changes live in `Backend/migrations/` and are applied via the Supabase MCP tools.

---

## Real-Time Communication

| Layer | Technology |
|---|---|
| **Video / Audio** | WebRTC peer-to-peer mesh (RTCPeerConnection) |
| **Screen Sharing** | `getDisplayMedia()` API |
| **Signaling** | Supabase Realtime broadcast channels |
| **Chat** | Supabase Realtime broadcast messages |
| **Whiteboard Sync** | Canvas coordinates sent via broadcast |
| **Code Sync** | File content broadcast over realtime channels |
| **Encryption** | WebRTC built-in DTLS/SRTP encryption |

### ICE Servers

STUN servers (Google public STUN) are used for NAT traversal. For production with larger groups, a TURN server and SFU (Selective Forwarding Unit) would be added.

---

## Security

| Area | Approach |
|---|---|
| **Authentication** | Supabase email/password with JWT sessions |
| **Database Access** | Row Level Security on every table |
| **Media Encryption** | WebRTC SRTP (built-in, no custom code) |
| **Transport Security** | HTTPS/WSS for all server traffic |
| **Input Validation** | Client-side sanitization of room IDs and user inputs |

---

## Project Structure

```
Frontend/           React application (TypeScript + Vite)
  App.tsx           Root component with auth routing
  main.tsx          Application entry point
  index.css         Global styles (Tailwind directives)
  components/       Reusable UI components
    ChatPanel.tsx       Meeting chat sidebar
    Whiteboard.tsx      Shared canvas with draw/erase tools
    FileExplorer.tsx    VS Code-style file tree
    CodeEditor.tsx      Monaco-based code editor
    CodePanel.tsx       Combined file explorer + editor
  hooks/            Custom React hooks
    useAuth.tsx         Authentication context
    useSignaling.ts     Supabase Realtime channel wrapper
    useWebRTC.ts        WebRTC peer connection management
  lib/              Utilities and configuration
    supabase.ts         Supabase client + type definitions
    fileSystem.ts       Virtual file tree for code editor
  pages/            Full-screen views
    AuthPage.tsx        Sign in / sign up
    Lobby.tsx           Home — create or join meetings
    MeetingRoom.tsx     Video call with all collaboration tools

Backend/            Database schema and migrations
  migrations/       SQL migration files (applied via Supabase MCP)

Technologies/       Tech stack documentation
```
