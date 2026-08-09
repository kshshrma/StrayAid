import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Rescue API is working",
  });
});

export default router;