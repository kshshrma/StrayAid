import { useEffect, useState, useMemo } from "react";
import {
  HeartHandshake,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profile/getProfile";
import { getGuardian } from "../services/guardian/getGuardian";
import { getDashboardStats } from "../services/dashboard/getDashboardStats";
import { getMyAcceptedRescues } from "../services/rescue/getMyAcceptedRescues";
import {
  getCommunityPosts,
  toggleLikePost,
  toggleSavePost,
  addCommentToPost,
  deleteCommunityPost,
  type CommunityPost,
} from "../services/community/communityService";

import CommunityLeftSidebar from "../features/community/CommunityLeftSidebar";
import CommunityRightSidebar from "../features/community/CommunityRightSidebar";
import CommunityStoryComposer from "../features/community/CommunityStoryComposer";
import CommunityFeedCard from "../features/community/CommunityFeedCard";
import CommunitySkeleton from "../features/community/CommunitySkeleton";
import CommunityGuidelinesModal from "../features/community/CommunityGuidelinesModal";

export default function Community() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("strayaid_saved_stories");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    avatarUrl: string;
    role: string;
    livesSavedCount: number;
    storiesCount: number;
  }>({
    id: "",
    name: "Guest Rescuer",
    avatarUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
    role: "Community Member",
    livesSavedCount: 0,
    storiesCount: 0,
  });

  // 1. Load User Session and Profile
  async function loadUser() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const userId = session.user.id;
      const profile = await getProfile(userId);
      const guardian = await getGuardian(userId);

      const isVerified = Boolean(guardian?.is_verified);
      let role = "Street Guardian";
      if (isVerified) {
        role = "Verified Rescuer";
      } else if (profile?.role === "ngo") {
        role = "NGO Partner";
      } else if (profile?.city) {
        role = `${profile.city} Guardian`;
      }

      // Fetch accurate real-time lives saved count identical to home page rescue tracking
      let livesSaved = 0;
      try {
        const myRescues = await getMyAcceptedRescues();
        livesSaved = myRescues.livesSavedCount || (myRescues.rescues?.length ?? 0);
      } catch {
        livesSaved = guardian?.total_rescues || 0;
      }

      if (livesSaved === 0) {
        const dashboardStats = await getDashboardStats().catch(() => null);
        if (dashboardStats && typeof dashboardStats.animalsHelped === "number") {
          livesSaved = dashboardStats.animalsHelped;
        } else if (guardian?.total_rescues) {
          livesSaved = guardian.total_rescues;
        }
      }

      setCurrentUser({
        id: userId,
        name: profile?.full_name || session.user.email?.split("@")[0] || "Community Member",
        avatarUrl:
          profile?.avatar_url ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
        role,
        livesSavedCount: livesSaved,
        storiesCount: 0,
      });
    } catch (err) {
      console.warn("[Community] Error loading user details:", err);
    }
  }

  // 2. Load Community Posts
  async function loadPosts(isManualRefresh = false) {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const fetchedPosts = await getCommunityPosts();

      // Retrieve locally saved story IDs and merge with server-persisted saved flags
      let localSaved: string[] = [];
      try {
        const raw = localStorage.getItem("strayaid_saved_stories");
        if (raw) localSaved = JSON.parse(raw);
      } catch {}

      const allSavedIds = new Set([
        ...localSaved,
        ...fetchedPosts.filter((p) => p.saved).map((p) => p.id),
      ]);
      setSavedPostIds(allSavedIds);
      try {
        localStorage.setItem("strayaid_saved_stories", JSON.stringify(Array.from(allSavedIds)));
      } catch {}

      const mappedPosts = fetchedPosts.map((p) => ({
        ...p,
        saved: Boolean(p.saved || allSavedIds.has(p.id)),
      }));

      setPosts(mappedPosts);

      // Count stories authored by current user
      if (currentUser.id) {
        const myCount = mappedPosts.filter((p) => p.authorId === currentUser.id).length;
        setCurrentUser((prev) => ({ ...prev, storiesCount: myCount }));
      }
    } catch (err) {
      console.error("[Community] Error loading posts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadUser();
    loadPosts();

    // Real-time Postgres subscription to reports table (new stories, status changes)
    const reportsChannel = supabase
      .channel("public:reports:community")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          loadUser();
          loadPosts(true);
        }
      )
      .subscribe();

    // Real-time Postgres subscription to rescue_assignments table (lives saved real-time sync)
    const assignmentsChannel = supabase
      .channel("public:rescue_assignments:community")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rescue_assignments" },
        () => {
          loadUser();
          loadPosts(true);
        }
      )
      .subscribe();

    return () => {
      reportsChannel.unsubscribe();
      assignmentsChannel.unsubscribe();
    };
  }, []);

  // Recount user stories when posts or user changes
  useEffect(() => {
    if (currentUser.id && posts.length > 0) {
      const myCount = posts.filter((p) => p.authorId === currentUser.id).length;
      setCurrentUser((prev) => ({ ...prev, storiesCount: myCount }));
    }
  }, [posts, currentUser.id]);

  // Handlers
  function handlePostCreated(newPost: CommunityPost) {
    setPosts((prev) => [newPost, ...prev]);
    setCurrentUser((prev) => ({ ...prev, storiesCount: prev.storiesCount + 1 }));
  }

  async function handleLike(postId: string) {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newLiked = !p.liked;
          return {
            ...p,
            liked: newLiked,
            likes: newLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
          };
        }
        return p;
      })
    );

    try {
      await toggleLikePost(postId);
    } catch (err) {
      console.error("[Community] Failed to toggle like:", err);
    }
  }

  async function handleComment(postId: string, text: string) {
    try {
      const newComment = await addCommentToPost(postId, text);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [...p.comments, newComment],
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error("[Community] Failed to add comment:", err);
    }
  }

  async function handleSave(postId: string) {
    let willBeSaved = false;
    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        willBeSaved = false;
      } else {
        next.add(postId);
        willBeSaved = true;
      }
      try {
        localStorage.setItem("strayaid_saved_stories", JSON.stringify(Array.from(next)));
      } catch (err) {
        console.warn("Could not save to localStorage:", err);
      }
      return next;
    });

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, saved: willBeSaved };
        }
        return p;
      })
    );

    try {
      await toggleSavePost(postId);
    } catch (err) {
      console.error("[Community] Failed to toggle save post:", err);
    }
  }

  async function handleDelete(postId: string) {
    if (!window.confirm("Are you sure you want to delete this story?")) return;

    try {
      await deleteCommunityPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setCurrentUser((prev) => ({
        ...prev,
        storiesCount: Math.max(0, prev.storiesCount - 1),
      }));
    } catch (err: any) {
      alert(err.message || "Failed to delete story");
    }
  }

  // Filter & Search Logic
  const filteredPosts = useMemo(() => {
    let result = posts;

    // Filter tabs
    if (activeFilter === "my-stories") {
      result = result.filter((p) => p.authorId === currentUser.id);
    } else if (activeFilter === "saved") {
      result = result.filter((p) => p.saved || savedPostIds.has(p.id));
    } else if (activeFilter === "Latest") {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (activeFilter !== "all" && activeFilter !== "For You") {
      result = result.filter(
        (p) => p.category.toLowerCase() === activeFilter.toLowerCase()
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [posts, activeFilter, searchQuery, currentUser.id, savedPostIds]);

  const filterTabs = [
    { id: "all", label: "For You" },
    { id: "Latest", label: "Latest" },
    { id: "Success Story", label: "💚 Success Stories" },
    { id: "Adoption", label: "🐾 Adoptions" },
    { id: "Advice", label: "💡 Care Advice" },
    { id: "Alert", label: "🚨 Alerts" },
    { id: "Rescue Update", label: "🚑 Rescue Updates" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28 text-slate-800">
      {/* Community Guidelines Modal */}
      <CommunityGuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center text-xl shadow-xs shrink-0">
              <HeartHandshake size={22} className="text-emerald-600" />
            </span>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                StrayAid Community
              </h1>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Stories, Adoptions & Field Rescue Updates
              </p>
            </div>
          </div>

          {/* Search Input & Refresh Button */}
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block w-64">
              <input
                type="text"
                placeholder="Search stories, tips, rescuers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full bg-slate-100 hover:bg-slate-100/90 focus:bg-white border border-transparent focus:border-emerald-500 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition"
              />
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            <button
              onClick={() => loadPosts(true)}
              disabled={refreshing}
              className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition active:scale-95 disabled:opacity-50"
              title="Refresh stories"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Main 3-Column Responsive Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start justify-center gap-6 lg:gap-8">
          
          {/* LEFT SIDEBAR (Desktop) */}
          <div className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-22 self-start">
            <CommunityLeftSidebar
              currentUser={currentUser}
              activeFilter={activeFilter}
              onSelectFilter={setActiveFilter}
              onOpenGuidelines={() => setIsGuidelinesOpen(true)}
            />
          </div>

          {/* CENTER FEED (Primary Focus) */}
          <section className="flex-1 min-w-0 max-w-2xl space-y-5">
            {/* Story Composer */}
            <CommunityStoryComposer
              currentUser={currentUser}
              onPostCreated={handlePostCreated}
            />

            {/* Feed Filter Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {filterTabs.map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`shrink-0 py-1.5 px-3.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                      isActive
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}

              {/* Mobile-only My Stories & Saved buttons */}
              <button
                onClick={() => setActiveFilter("my-stories")}
                className={`lg:hidden shrink-0 py-1.5 px-3.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  activeFilter === "my-stories"
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ✍️ My Stories
              </button>

              <button
                onClick={() => setActiveFilter("saved")}
                className={`lg:hidden shrink-0 py-1.5 px-3.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  activeFilter === "saved"
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                🔖 Saved
              </button>
            </div>

            {/* Stories Feed List */}
            {loading ? (
              <CommunitySkeleton />
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center space-y-3 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-3xl">
                  🐾
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {searchQuery
                    ? "No stories match your search"
                    : activeFilter === "my-stories"
                    ? "You haven't shared a story yet"
                    : activeFilter === "saved"
                    ? "No saved stories yet"
                    : "No stories in this category yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {searchQuery
                    ? "Try adjusting your keywords or clearing filters to see more community moments."
                    : "Share a heartwarming rescue, pet adoption alert, or street feeding advice to inspire fellow rescuers."}
                </p>

                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setActiveFilter("all");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 transition"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {filteredPosts.map((post) => (
                  <CommunityFeedCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUser.id || null}
                    currentUserAvatar={currentUser.avatarUrl}
                    onLike={handleLike}
                    onComment={handleComment}
                    onSave={handleSave}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>

          {/* RIGHT SIDEBAR (Desktop) */}
          <div className="hidden xl:block w-72 xl:w-80 shrink-0 sticky top-22 self-start">
            <CommunityRightSidebar />
          </div>

        </div>
      </main>
    </div>
  );
}
