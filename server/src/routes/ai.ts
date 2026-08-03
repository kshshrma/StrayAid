import { Router } from "express";
import { analyzeAnimal } from "../controllers/aiController";

const router = Router();

router.post("/analyze", analyzeAnimal);

export default router;