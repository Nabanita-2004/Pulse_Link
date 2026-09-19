# Pulse_Link
Pulse_Link, a complete real-time video conferencing and collaboration app.

# Here's what it does:
*A. Accounts & Home*
1. Sign up and sign in with email/password (secure authentication via Bolt Database)
2. A lobby page where you can create a new meeting (generates a shareable room ID) or join an existing one with a code
3.  Meeting history shows your past calls with timestamps and duration, and you can rejoin any room with one click

*B. Video Conferencing*
1. Multi-party video calling using WebRTC with peer-to-peer mesh networking — video and audio flow directly between participants, encrypted by default via WebRTC's built-in SRTP
2. Signaling (finding and connecting peers) uses Bolt Database Realtime channels, so no separate server is needed
3. Mute/unmute your microphone and turn your camera on/off
4. Screen sharing — share your entire screen or a specific window with everyone in the room
5. Active speaker indicator highlights whoever is currently talking
6. Live timer showing how long the meeting has been going

*C. Collaboration Tools*
1. Shared whiteboard — draw on a canvas with multiple colors and brush sizes; strokes sync in real-time to all participants, and anyone can clear the board
2. Text chat — send messages to everyone in the room, with timestamps and sender names

*D.  Design*
1. Dark, professional theme with blue/cyan accents — no purple defaults
2. Glassmorphism cards, gradient buttons, subtle blur effects
3. Fully responsive — the side panel collapses on smaller screens, and the video grid adapts to participant count

# To test it:
sign up for an account, create a meeting, copy the room ID, and open the same room ID in another browser tab/window to see the video, chat, and whiteboard sync in real-time.
