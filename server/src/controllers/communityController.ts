import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../services/supabase";

// Predefined inspiring community stories to ensure a rich, authentic feed from day one
const SEED_STORIES = [
  {
    id: "seed-1",
    authorId: "seed-user-1",
    author: "Sneha Sharma",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    role: "Verified Rescuer",
    isVerified: true,
    category: "Success Story" as const,
    content: "Meet Sheru! Found him shivering near a metro station with a severe leg laceration. After two weeks of foster care and veterinary help from VetCare Noida, he is fully healed and running around! Thanks everyone who coordinated logistics and supported his treatment.",
    image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=1200",
    likes: 42,
    liked: false,
    saved: false,
    comments: [
      {
        id: "c-1",
        authorId: "user-amit",
        authorName: "Amit Verma",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
        content: "This is heartwarming! Sheru looks so joyful and full of life.",
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: "c-2",
        authorId: "user-patel",
        authorName: "Dr. K. Patel",
        avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120",
        content: "Outstanding post-op care, Sneha. The mobility in his hind leg is fully restored.",
        createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    timeFormatted: "3 hours ago",
  },
  {
    id: "seed-2",
    authorId: "seed-user-2",
    author: "Paws & Claws NGO",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200",
    role: "NGO Partner",
    isVerified: true,
    category: "Adoption" as const,
    content: "URGENT ADOPTION: Three sibling kittens found abandoned near Sector 15. They are about 6 weeks old, dewormed, vaccinated for their age, and extremely playful. We would love to adopt them out in pairs or together. Please reach out to provide a loving home!",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=1200",
    likes: 31,
    liked: false,
    saved: false,
    comments: [],
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    timeFormatted: "5 hours ago",
  },
  {
    id: "seed-3",
    authorId: "seed-user-3",
    author: "Rohan Das",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
    role: "Street Guardian",
    isVerified: false,
    category: "Advice" as const,
    content: "Summer reminder for local feeders: With temperatures rising in NCR, please place shallow earthen bowls filled with clean drinking water outside residential gates and parks. Changing water twice daily prevents algae and mosquito breeding while saving street animals from dehydration.",
    image: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=1200",
    likes: 67,
    liked: false,
    saved: false,
    comments: [
      {
        id: "c-3",
        authorId: "user-kriti",
        authorName: "Kriti Sen",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120",
        content: "Already doing this in our lane! Birds and local dogs visit every afternoon.",
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    timeFormatted: "8 hours ago",
  },
];

function formatRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
}

/**
 * GET /api/community/posts
 * Fetch community posts ordered newest first
 */
export async function getCommunityPosts(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    let currentUserId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          currentUserId = user.id;
        }
      } catch (authErr) {
        // Continue unauthenticated
      }
    }

    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("status", "community_story")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[CommunityController] Error loading community posts:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to load community posts",
      });
    }

    const dbPosts = (reports || []).map((row) => {
      let meta: any = {};
      try {
        meta = JSON.parse(row.ai_advice || "{}");
      } catch {
        meta = {};
      }

      const likedBy: string[] = Array.isArray(meta.likedBy) ? meta.likedBy : [];
      const savedBy: string[] = Array.isArray(meta.savedBy) ? meta.savedBy : [];
      const comments: any[] = Array.isArray(meta.comments) ? meta.comments : [];

      return {
        id: row.id,
        authorId: meta.authorId || row.reporter_id || "anonymous",
        author: meta.authorName || "Community Rescuer",
        avatar:
          meta.avatarUrl ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        role: meta.role || "Street Guardian",
        isVerified: Boolean(meta.isVerified),
        category: (meta.category || row.animal_type || "Success Story") as any,
        content: meta.content || "",
        image: row.image_url || meta.imageUrl || undefined,
        likes: typeof meta.likes === "number" ? meta.likes : likedBy.length,
        liked: currentUserId ? likedBy.includes(currentUserId) : false,
        saved: currentUserId ? savedBy.includes(currentUserId) : false,
        comments: comments.map((c: any) => ({
          id: c.id || Math.random().toString(),
          authorId: c.authorId || "",
          authorName: c.authorName || "Member",
          avatarUrl: c.avatarUrl || null,
          content: c.content || "",
          createdAt: c.createdAt || new Date().toISOString(),
          timeFormatted: formatRelativeTime(c.createdAt || new Date().toISOString()),
        })),
        createdAt: row.created_at,
        timeFormatted: formatRelativeTime(row.created_at),
      };
    });

    // Combine seed stories with user-published stories
    const combinedPosts = [...dbPosts, ...SEED_STORIES];

    // Ensure newest stories are first
    combinedPosts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json({
      success: true,
      posts: combinedPosts,
    });
  } catch (err: any) {
    console.error("[CommunityController] Exception in getCommunityPosts:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load community stories",
    });
  }
}

/**
 * POST /api/community/posts
 * Publish a new story to the community
 */
export async function createCommunityPost(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in to share a community story",
      });
    }

    const { content, category, imageUrl } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Story content cannot be empty",
      });
    }

    if (content.trim().length > 1500) {
      return res.status(400).json({
        success: false,
        message: "Story content cannot exceed 1500 characters",
      });
    }

    const validCategories = [
      "Success Story",
      "Adoption",
      "Advice",
      "Alert",
      "Rescue Update",
    ];
    const postCategory = validCategories.includes(category)
      ? category
      : "Success Story";

    // Fetch user profile from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role, city")
      .eq("id", userId)
      .maybeSingle();

    // Check if user has verified Guardian status
    const { data: guardian } = await supabase
      .from("guardians")
      .select("is_verified, total_rescues")
      .eq("user_id", userId)
      .maybeSingle();

    const isVerified = Boolean(guardian?.is_verified);
    let authorRole = "Street Guardian";
    if (isVerified) {
      authorRole = "Verified Rescuer";
    } else if (profile?.role === "ngo") {
      authorRole = "NGO Partner";
    } else if (profile?.city) {
      authorRole = `${profile.city} Guardian`;
    }

    const authorName = profile?.full_name || "Community Member";
    const authorAvatar =
      profile?.avatar_url ||
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";

    const nowIso = new Date().toISOString();

    const metadata = {
      content: content.trim(),
      category: postCategory,
      authorId: userId,
      authorName,
      avatarUrl: authorAvatar,
      role: authorRole,
      isVerified,
      likes: 0,
      likedBy: [],
      savedBy: [],
      comments: [],
    };

    const { data: insertedReport, error: insertError } = await supabase
      .from("reports")
      .insert([
        {
          status: "community_story",
          animal_type: postCategory,
          image_url: imageUrl && imageUrl.trim() ? imageUrl.trim() : null,
          severity: "Normal",
          priority: "Standard",
          latitude: 28.5355,
          longitude: 77.391,
          ai_advice: JSON.stringify(metadata),
          created_at: nowIso,
          updated_at: nowIso,
        },
      ])
      .select()
      .single();

    if (insertError || !insertedReport) {
      console.error("[CommunityController] Failed to insert story:", insertError);
      return res.status(500).json({
        success: false,
        message: insertError?.message || "Failed to publish community story",
      });
    }

    const formattedPost = {
      id: insertedReport.id,
      authorId: userId,
      author: authorName,
      avatar: authorAvatar,
      role: authorRole,
      isVerified,
      category: postCategory,
      content: content.trim(),
      image: insertedReport.image_url || undefined,
      likes: 0,
      liked: false,
      saved: false,
      comments: [],
      createdAt: nowIso,
      timeFormatted: "Just now",
    };

    return res.status(201).json({
      success: true,
      message: "Story published successfully",
      post: formattedPost,
    });
  } catch (err: any) {
    console.error("[CommunityController] Exception in createCommunityPost:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to publish community story",
    });
  }
}

/**
 * POST /api/community/posts/:id/like
 * Toggle like for the authenticated user
 */
export async function toggleLikePost(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({ success: false, message: "Post ID is required" });
    }

    // Check if it's a seed story
    if (id.startsWith("seed-")) {
      return res.status(200).json({
        success: true,
        liked: true,
        likes: 43,
      });
    }

    const { data: report, error } = await supabase
      .from("reports")
      .select("id, ai_advice")
      .eq("id", id)
      .single();

    if (error || !report) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    let meta: any = {};
    try {
      meta = JSON.parse(report.ai_advice || "{}");
    } catch {
      meta = {};
    }

    const likedBy: string[] = Array.isArray(meta.likedBy) ? meta.likedBy : [];
    let isLiked = false;

    if (likedBy.includes(userId)) {
      meta.likedBy = likedBy.filter((uid) => uid !== userId);
      isLiked = false;
    } else {
      meta.likedBy = [...likedBy, userId];
      isLiked = true;
    }

    meta.likes = meta.likedBy.length;

    await supabase
      .from("reports")
      .update({ ai_advice: JSON.stringify(meta) })
      .eq("id", id);

    return res.status(200).json({
      success: true,
      liked: isLiked,
      likes: meta.likes,
    });
  } catch (err: any) {
    console.error("[CommunityController] Exception in toggleLikePost:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to toggle like",
    });
  }
}

/**
 * POST /api/community/posts/:id/comment
 * Add a comment to a story
 */
export async function addCommentToPost(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const id = String(req.params.id || "");
    const { content } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Post ID is required" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Comment cannot be empty" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const newComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      authorId: userId,
      authorName: profile?.full_name || "Community Member",
      avatarUrl: profile?.avatar_url || null,
      content: content.trim(),
      createdAt: nowIso,
      timeFormatted: "Just now",
    };

    if (id.startsWith("seed-")) {
      return res.status(201).json({
        success: true,
        comment: newComment,
      });
    }

    const { data: report, error } = await supabase
      .from("reports")
      .select("id, ai_advice")
      .eq("id", id)
      .single();

    if (error || !report) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    let meta: any = {};
    try {
      meta = JSON.parse(report.ai_advice || "{}");
    } catch {
      meta = {};
    }

    const comments = Array.isArray(meta.comments) ? meta.comments : [];
    meta.comments = [...comments, newComment];

    await supabase
      .from("reports")
      .update({ ai_advice: JSON.stringify(meta) })
      .eq("id", id);

    return res.status(201).json({
      success: true,
      comment: newComment,
    });
  } catch (err: any) {
    console.error("[CommunityController] Exception in addCommentToPost:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to add comment",
    });
  }
}

/**
 * DELETE /api/community/posts/:id
 * Delete a story (author only)
 */
export async function deleteCommunityPost(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({ success: false, message: "Post ID is required" });
    }

    if (id.startsWith("seed-")) {
      return res.status(403).json({
        success: false,
        message: "Featured foundation stories cannot be deleted",
      });
    }

    const { data: report, error } = await supabase
      .from("reports")
      .select("id, ai_advice")
      .eq("id", id)
      .single();

    if (error || !report) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    let meta: any = {};
    try {
      meta = JSON.parse(report.ai_advice || "{}");
    } catch {
      meta = {};
    }

    if (meta.authorId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own stories",
      });
    }

    await supabase.from("reports").delete().eq("id", id);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (err: any) {
    console.error("[CommunityController] Exception in deleteCommunityPost:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete post",
    });
  }
}
