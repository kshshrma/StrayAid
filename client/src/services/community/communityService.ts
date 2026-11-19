import { supabase } from "../../lib/supabase";
import { uploadImage } from "../storage/uploadImage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export type StoryCategory =
  | "Success Story"
  | "Adoption"
  | "Advice"
  | "Alert"
  | "Rescue Update";

export interface CommunityComment {
  id: string;
  authorId: string;
  authorName: string;
  avatarUrl?: string | null;
  content: string;
  createdAt: string;
  timeFormatted?: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  author: string;
  avatar: string;
  role: string;
  isVerified: boolean;
  category: StoryCategory;
  content: string;
  image?: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: CommunityComment[];
  createdAt: string;
  timeFormatted: string;
}

// Fallback seed stories in case of initial empty state
const FALLBACK_SEED_STORIES: CommunityPost[] = [
  {
    id: "seed-1",
    authorId: "seed-user-1",
    author: "Sneha Sharma",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    role: "Verified Rescuer",
    isVerified: true,
    category: "Success Story",
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
        timeFormatted: "2h ago",
      },
      {
        id: "c-2",
        authorId: "user-patel",
        authorName: "Dr. K. Patel",
        avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120",
        content: "Outstanding post-op care, Sneha. The mobility in his hind leg is fully restored.",
        createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        timeFormatted: "1h ago",
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
    category: "Adoption",
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
    category: "Advice",
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
        timeFormatted: "4h ago",
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
 * Fetch all community posts
 */
export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id || null;

  // 1. Try Backend API first
  try {
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`${API_URL}/api/community/posts`, {
      method: "GET",
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        return data.posts;
      }
    }
  } catch (apiErr) {
    console.warn("[CommunityService] Backend fetch failed, falling back to direct Supabase:", apiErr);
  }

  // 2. Direct Supabase Query Fallback
  try {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("status", "community_story")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[CommunityService] Direct Supabase query error:", error);
      return FALLBACK_SEED_STORIES;
    }

    const dbPosts: CommunityPost[] = (reports || []).map((row) => {
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
        author: meta.authorName || "Community Member",
        avatar:
          meta.avatarUrl ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        role: meta.role || "Street Guardian",
        isVerified: Boolean(meta.isVerified),
        category: (meta.category || row.animal_type || "Success Story") as StoryCategory,
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

    const combined = [...dbPosts, ...FALLBACK_SEED_STORIES];
    combined.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return combined;
  } catch (err) {
    console.error("[CommunityService] Fallback exception:", err);
    return FALLBACK_SEED_STORIES;
  }
}

/**
 * Create a new community post
 */
export async function createCommunityPost(input: {
  content: string;
  category: StoryCategory;
  imageUrl?: string;
}): Promise<CommunityPost> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Please sign in to share a community story.");
  }

  const userId = session.user.id;

  // 1. Try Backend API
  try {
    const res = await fetch(`${API_URL}/api/community/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(input),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.post) {
        return data.post;
      }
    }
  } catch (apiErr) {
    console.warn("[CommunityService] Backend create failed, trying direct Supabase:", apiErr);
  }

  // 2. Direct Supabase Fallback
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, city")
    .eq("id", userId)
    .maybeSingle();

  const { data: guardian } = await supabase
    .from("guardians")
    .select("is_verified")
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
    content: input.content.trim(),
    category: input.category,
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
        animal_type: input.category,
        image_url: input.imageUrl && input.imageUrl.trim() ? input.imageUrl.trim() : null,
        severity: "Normal",
        priority: "Standard",
        latitude: 28.5355,
        longitude: 77.391,
        ai_advice: JSON.stringify(metadata),
        created_at: nowIso,
      },
    ])
    .select()
    .single();

  if (insertError || !insertedReport) {
    throw new Error(insertError?.message || "Failed to publish community story");
  }

  return {
    id: insertedReport.id,
    authorId: userId,
    author: authorName,
    avatar: authorAvatar,
    role: authorRole,
    isVerified,
    category: input.category,
    content: input.content.trim(),
    image: insertedReport.image_url || undefined,
    likes: 0,
    liked: false,
    saved: false,
    comments: [],
    createdAt: nowIso,
    timeFormatted: "Just now",
  };
}

/**
 * Toggle like for a post
 */
export async function toggleLikePost(postId: string): Promise<{ liked: boolean; likes: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Please sign in to like stories.");
  }

  const userId = session.user.id;

  // 1. Try Backend API
  try {
    const res = await fetch(`${API_URL}/api/community/posts/${postId}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return { liked: data.liked, likes: data.likes };
    }
  } catch (apiErr) {
    console.warn("[CommunityService] Backend like toggle failed, falling back:", apiErr);
  }

  // 2. Direct Supabase Fallback
  if (postId.startsWith("seed-")) {
    return { liked: true, likes: 43 };
  }

  const { data: report, error } = await supabase
    .from("reports")
    .select("ai_advice")
    .eq("id", postId)
    .single();

  if (error || !report) {
    throw new Error("Story not found");
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
    .eq("id", postId);

  return { liked: isLiked, likes: meta.likes };
}

/**
 * Add comment to a post
 */
export async function addCommentToPost(
  postId: string,
  content: string
): Promise<CommunityComment> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Please sign in to comment.");
  }

  const userId = session.user.id;

  // 1. Try Backend API
  try {
    const res = await fetch(`${API_URL}/api/community/posts/${postId}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.comment) {
        return data.comment;
      }
    }
  } catch (apiErr) {
    console.warn("[CommunityService] Backend comment failed, falling back:", apiErr);
  }

  // 2. Direct Supabase Fallback
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const newComment: CommunityComment = {
    id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    authorId: userId,
    authorName: profile?.full_name || "Community Member",
    avatarUrl: profile?.avatar_url || null,
    content: content.trim(),
    createdAt: nowIso,
    timeFormatted: "Just now",
  };

  if (!postId.startsWith("seed-")) {
    const { data: report } = await supabase
      .from("reports")
      .select("ai_advice")
      .eq("id", postId)
      .single();

    if (report) {
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
        .eq("id", postId);
    }
  }

  return newComment;
}

/**
 * Delete a post (author only)
 */
export async function deleteCommunityPost(postId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // 1. Try Backend API
  try {
    const res = await fetch(`${API_URL}/api/community/posts/${postId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (res.ok) {
      return;
    }
  } catch (apiErr) {
    console.warn("[CommunityService] Backend delete failed, falling back:", apiErr);
  }

  // 2. Direct Supabase Fallback
  if (!postId.startsWith("seed-")) {
    await supabase.from("reports").delete().eq("id", postId);
  }
}

/**
 * Upload an image file for a community story
 */
export async function uploadCommunityImage(file: File): Promise<string> {
  return uploadImage(file);
}
