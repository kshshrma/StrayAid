import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  dispatchCase,
  getNearbyGuardians,
  handleGuardianDispatchResponse,
} from "../services/dispatchService";

export async function triggerDispatchHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId } = req.params;
    const tier = req.body?.tier ? Number(req.body.tier) : 1;

    const result = await dispatchCase(caseId as string, tier);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`case:${caseId}`).emit("case_dispatched", {
        caseId,
        tier: result.tier,
        notifiedCount: result.notifiedCount,
      });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Dispatch failed" });
  }
}

export async function escalateDispatchHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId } = req.params;
    const result = await dispatchCase(caseId as string, 2);

    const io = req.app.get("io");
    if (io) {
      io.to(`case:${caseId}`).emit("case_escalating", {
        caseId,
        tier: 2,
        notification: {
          title: `Rescue Status — ${caseId}`,
          body: "We're finding another responder for this case. Your rescue request is still active.",
        },
      });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Escalation failed" });
  }
}

export async function getNearbyGuardiansHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : 28.4721;
    const lng = req.query.lng ? Number(req.query.lng) : 77.5098;
    const radius = req.query.radius ? Number(req.query.radius) : 5;
    const species = req.query.species as string | undefined;

    const candidates = await getNearbyGuardians(lat, lng, radius, species);
    return res.json({ success: true, guardians: candidates });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to fetch nearby guardians" });
  }
}

export async function respondGuardianDispatchHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId } = req.params;
    const { accepted, guardianName } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await handleGuardianDispatchResponse(
      caseId as string,
      userId,
      guardianName || "Field Guardian",
      Boolean(accepted)
    );

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`case:${caseId}`).emit(accepted ? "volunteer_assigned" : "volunteer_declined", {
        caseId,
        guardianId: userId,
        guardianName,
      });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to process response" });
  }
}
