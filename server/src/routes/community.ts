import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getCommunityPosts,
  createCommunityPost,
  toggleLikePost,
  toggleSavePost,
  addCommentToPost,
  deleteCommunityPost,
} from "../controllers/communityController";

const router = Router();

// Public / optionally authenticated feed
router.get("/posts", getCommunityPosts);

// Authenticated interactions
router.post("/posts", requireAuth, createCommunityPost);
router.post("/posts/:id/like", requireAuth, toggleLikePost);
router.post("/posts/:id/save", requireAuth, toggleSavePost);
router.post("/posts/:id/comment", requireAuth, addCommentToPost);
router.delete("/posts/:id", requireAuth, deleteCommunityPost);

export default router;
