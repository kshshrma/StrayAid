import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(userId: string) {
  const s = getSocket();
  s.connect();
  s.off("connect");
  s.on("connect", () => {
    s.emit("join_user_room", userId);
    console.log(`🔌 Socket.IO connected and joined room: user:${userId}`);
  });
  
  if (s.connected) {
    s.emit("join_user_room", userId);
    console.log(`🔌 Socket.IO joined room: user:${userId}`);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    console.log("🔌 Socket.IO disconnected");
  }
}
