import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import aiRoutes from "./routes/ai";
import { ai } from "./services/gemini";
import rescueRoutes from "./routes/rescue";
import adminRoutes from "./routes/admin";
import reportRoutes from "./routes/report";
import messageRoutes from "./routes/message";
import connectRoutes from "./routes/connect";
import { supabase } from "./services/supabase";
import http from "http";
import { Server } from "socket.io";
import { dispatchReport } from "./services/dispatch";

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/ai", aiRoutes);
app.use("/api/rescue", rescueRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/connect", connectRoutes);

// Home Route
app.get("/", (_, res) => {
  res.send("🚀 StrayAid Backend Running");
});

// TEMPORARY: List available Gemini models
app.get("/models", async (_, res) => {
  try {
    const models = await ai.models.list();

    const availableModels: string[] = [];

    for await (const model of models) {
      availableModels.push(model.name ?? "Unknown");
    }

    res.json({
      success: true,
      models: availableModels,
    });
  } catch (error: any) {
    console.error("Models Error:");
    console.dir(error, { depth: null });

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Expiration Sweep Loop
function startExpirationSweep() {
  console.log("⏱️ Expiration sweep worker started");

  setInterval(async () => {
    try {
      const nowIso = new Date().toISOString();

      // Find pending assignments that have expired
      const { data: expiredAssignments, error } = await supabase
        .from("rescue_assignments")
        .select("id, report_id, guardian_id")
        .eq("status", "pending")
        .lt("expires_at", nowIso);

      if (error) {
        console.error("[Sweep] Error querying expired assignments:", error);
        return;
      }

      if (!expiredAssignments || expiredAssignments.length === 0) {
        return;
      }

      console.log(`[Sweep] Sweep found ${expiredAssignments.length} expired pending assignments`);

      for (const assignment of expiredAssignments) {
        // Mark current assignment as expired
        const { error: updateError } = await supabase
          .from("rescue_assignments")
          .update({
            status: "expired",
            updated_at: nowIso,
          })
          .eq("id", assignment.id);

        if (updateError) {
          console.error(`[Sweep] Failed to update assignment ${assignment.id} to expired:`, updateError);
          continue;
        }

        // Fetch the report details to run fallback dispatch
        const { data: report, error: reportError } = await supabase
          .from("reports")
          .select("id, latitude, longitude, severity")
          .eq("id", assignment.report_id)
          .single();

        if (reportError || !report) {
          console.error(`[Sweep] Failed to find report for assignment ${assignment.id}:`, reportError);
          continue;
        }

        if (report.latitude !== null && report.longitude !== null) {
          console.log(`[Sweep] Triggering fallback dispatch for report ${report.id}`);
          
          const newAssignment = await dispatchReport(
            report.id,
            report.latitude,
            report.longitude,
            report.severity || "Medium"
          );

          if (!newAssignment) {
            console.log(`[Sweep] No alternative Guardian found for report ${report.id}. Escalating.`);
            
            await supabase
              .from("reports")
              .update({
                status: "escalated",
              })
              .eq("id", report.id);
          }
        }
      }
    } catch (sweepErr) {
      console.error("[Sweep] Background sweep exception occurred:", sweepErr);
    }
  }, 15000);
}

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on("join_user_room", (userId: string) => {
    if (userId) {
      const roomName = `user:${userId}`;
      socket.join(roomName);
      console.log(`👤 Socket ${socket.id} joined room: ${roomName}`);
    }
  });

  socket.on("join_conversation_room", (conversationId: string) => {
    if (conversationId) {
      const roomName = `conversation:${conversationId}`;
      socket.join(roomName);
      console.log(`👤 Socket ${socket.id} joined conversation room: ${roomName}`);
    }
  });

  socket.on("leave_conversation_room", (conversationId: string) => {
    if (conversationId) {
      const roomName = `conversation:${conversationId}`;
      socket.leave(roomName);
      console.log(`👤 Socket ${socket.id} left conversation room: ${roomName}`);
    }
  });

  socket.on("typing_start", ({ conversationId, userId, userName }) => {
    if (conversationId) {
      socket.to(`conversation:${conversationId}`).emit("typing_start", { conversationId, userId, userName });
    }
  });

  socket.on("typing_stop", ({ conversationId, userId }) => {
    if (conversationId) {
      socket.to(`conversation:${conversationId}`).emit("typing_stop", { conversationId, userId });
    }
  });

  // NGO Socket.IO Room Handlers
  socket.on("join_ngo_room", (organizationId: string) => {
    if (organizationId) {
      const roomName = `org:${organizationId}`;
      socket.join(roomName);
      console.log(`🏢 Socket ${socket.id} joined NGO room: ${roomName}`);
    }
  });

  socket.on("join_ngo_conversation", (conversationId: string) => {
    if (conversationId) {
      const roomName = `ngo_conv:${conversationId}`;
      socket.join(roomName);
      console.log(`💬 Socket ${socket.id} joined NGO conversation room: ${roomName}`);
    }
  });

  socket.on("leave_ngo_conversation", (conversationId: string) => {
    if (conversationId) {
      const roomName = `ngo_conv:${conversationId}`;
      socket.leave(roomName);
      console.log(`💬 Socket ${socket.id} left NGO conversation room: ${roomName}`);
    }
  });

  socket.on("ngo_typing_start", ({ conversationId, senderName }) => {
    if (conversationId) {
      socket.to(`ngo_conv:${conversationId}`).emit("ngo_typing_start", { conversationId, senderName });
    }
  });

  socket.on("ngo_typing_stop", ({ conversationId }) => {
    if (conversationId) {
      socket.to(`ngo_conv:${conversationId}`).emit("ngo_typing_stop", { conversationId });
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startExpirationSweep();
});