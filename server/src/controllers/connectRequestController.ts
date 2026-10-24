import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  createConnectRequest,
  updateConnectRequest,
  getOrCreateActiveRequest,
  getConnectRequestById,
  getUserConnectRequests,
  getNgoConnectRequests,
  ConnectRequestType,
  ConnectRequestStatus,
  ConnectRequestUrgency,
} from "../services/connectRequestService";
import { supabase } from "../services/supabase";

async function getUserProfileInfo(userId: string): Promise<{ fullName: string; phone?: string | undefined; role: string }> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, role")
      .eq("id", userId)
      .single();

    if (profile) {
      return {
        fullName: profile.full_name || "StrayAid User",
        phone: profile.phone || undefined,
        role: profile.role || "citizen",
      };
    }
  } catch {}
  return { fullName: "StrayAid User", role: "citizen" };
}

/**
 * POST /api/connect/requests
 * User creates or updates a Connect Request as they proceed through bot flows
 */
export async function createOrUpdateConnectRequestHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      requestId,
      organizationId,
      requestType,
      subType,
      status,
      urgency,
      animalType,
      description,
      latitude,
      longitude,
      locationText,
      imageUrl,
      metadata = {},
    } = req.body;

    if (!requestType) {
      return res.status(400).json({ success: false, message: "requestType is required" });
    }

    const userInfo = await getUserProfileInfo(userId);
    const enrichedMetadata = {
      reporter_name: userInfo.fullName,
      reporter_phone: userInfo.phone,
      ...metadata,
    };

    const { request, isNew } = await getOrCreateActiveRequest({
      userId,
      requestId,
      organizationId,
      requestType: requestType as ConnectRequestType,
      subType,
      status: status as ConnectRequestStatus,
      urgency: urgency as ConnectRequestUrgency,
      animalType,
      description,
      latitude,
      longitude,
      locationText,
      imageUrl,
      metadata: enrichedMetadata,
    });

    // Real-time broadcast via Socket.IO
    const io = req.app.get("io");
    if (io) {
      const eventName = isNew ? "new_connect_request" : "update_connect_request";
      // 1. Emit to NGO room
      io.to(`ngo:${request.organizationId}`).emit(eventName, request);
      console.log(`[ConnectRequest] Emitted ${eventName} to room ngo:${request.organizationId}`);

      // 2. Emit to user room
      io.to(`user:${request.userId}`).emit("connect_request_updated", request);
    }

    return res.status(isNew ? 201 : 200).json({
      success: true,
      request,
      isNew,
    });
  } catch (error: any) {
    console.error("[ConnectRequest] createOrUpdate error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process connect request",
    });
  }
}

/**
 * PATCH /api/connect/requests/:id
 * User updates specific request information (e.g. location, transport choice)
 */
export async function updateConnectRequestHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: "Request ID is required" });
    }

    const existing = await getConnectRequestById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const updated = await updateConnectRequest(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Request update failed" });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`ngo:${updated.organizationId}`).emit("update_connect_request", updated);
      io.to(`user:${updated.userId}`).emit("connect_request_updated", updated);
    }

    return res.json({ success: true, request: updated });
  } catch (error: any) {
    console.error("[ConnectRequest] update error:", error);
    return res.status(500).json({ success: false, message: error.message || "Update failed" });
  }
}

/**
 * GET /api/connect/requests
 * Get requests submitted by the logged in user
 */
export async function getUserRequestsHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const requests = await getUserConnectRequests(userId);
    return res.json({ success: true, requests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch user requests" });
  }
}

/**
 * GET /api/connect/requests/:id
 * Retrieve request by ID
 */
export async function getRequestByIdHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ success: false, message: "Request ID is required" });
    }

    const request = await getConnectRequestById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    return res.json({ success: true, request });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch request" });
  }
}

/**
 * GET /api/connect/ngo/requests
 * NGO feed of incoming structured requests
 */
export async function getNgoRequestsHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const targetNgoId =
      (typeof req.query.organizationId === "string" && req.query.organizationId) ||
      (typeof req.query.ngoId === "string" && req.query.ngoId) ||
      "ngo-greater-noida-rescuers";

    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const urgency = typeof req.query.urgency === "string" ? req.query.urgency : undefined;

    const requests = await getNgoConnectRequests(targetNgoId, {
      type,
      status,
      urgency,
    });

    return res.json({ success: true, requests });
  } catch (error: any) {
    console.error("[ConnectRequest] getNgoRequests error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch NGO requests" });
  }
}

/**
 * PATCH /api/connect/ngo/requests/:id
 * NGO updates the status/lifecycle of a request
 */
export async function updateNgoRequestHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { status, notes, assignedVolunteerId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: "Request ID is required" });
    }

    const existing = await getConnectRequestById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (notes) {
      updates.metadata = {
        ...(existing.metadata || {}),
        ngo_notes: notes,
      };
    }
    if (assignedVolunteerId) {
      updates.metadata = {
        ...(existing.metadata || {}),
        assigned_volunteer_id: assignedVolunteerId,
      };
    }

    const updated = await updateConnectRequest(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Failed to update request" });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`ngo:${updated.organizationId}`).emit("update_connect_request", updated);
      io.to(`user:${updated.userId}`).emit("connect_request_updated", updated);
    }

    return res.json({ success: true, request: updated });
  } catch (error: any) {
    console.error("[ConnectRequest] updateNgoRequest error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update NGO request" });
  }
}
