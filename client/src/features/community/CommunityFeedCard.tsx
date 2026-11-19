import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  ShieldCheck,
  Send,
  MoreHorizontal,
  Trash2,
  Copy,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import type { CommunityPost } from "../../services/community/communityService";

interface CommunityFeedCardProps {
  post: CommunityPost;
  currentUserId: string | null;
  currentUserAvatar?: string;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
  onSave: (postId: string) => void;
  onDelete: (postId: string) => void;
}

export default function CommunityFeedCard({
  post,
  currentUserId,
  currentUserAvatar,
  onLike,
  onComment,
  onSave,
  onDelete,
}: CommunityFeedCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isOwner = currentUserId && post.authorId === currentUserId;

  const categoryStyles: Record<string, { bg: string; text: string; border: string }> = {
    "Success Story": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    Adoption: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
    Advice: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    Alert: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    "Rescue Update": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  };

  const style = categoryStyles[post.category] || categoryStyles["Success Story"];

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(post.id, commentText.trim());
    setCommentText("");
  }

  function handleCopyShareLink() {
    const url = `${window.location.origin}/community#${post.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowMoreMenu(false);
    }, 1800);
  }

  return (
    <>
      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Full view"
              className="max-h-[85vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* Main Story Card */}
      <motion.article
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        id={post.id}
        className="rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
      >
        {/* Post Header */}
        <div className="p-4 sm:p-5 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={post.avatar}
              alt={post.author}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
              loading="lazy"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-slate-900 tracking-tight truncate">
                  {post.author}
                </span>
                {post.isVerified && (
                  <span
                    className="inline-flex items-center text-blue-500"
                    title="Verified Rescuer / Guardian"
                  >
                    <ShieldCheck size={15} className="fill-blue-500/15" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <span className="truncate">{post.role}</span>
                <span>•</span>
                <span>{post.timeFormatted}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Category Tag */}
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}
            >
              {post.category}
            </span>

            {/* More Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
                title="More options"
              >
                <MoreHorizontal size={18} />
              </button>

              {showMoreMenu && (
                <div
                  className="absolute right-0 top-9 z-20 w-44 rounded-2xl bg-white border border-slate-100 shadow-xl p-1.5 space-y-0.5 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleCopyShareLink}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition"
                  >
                    {copiedLink ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-slate-500" />
                        <span>Copy Story Link</span>
                      </>
                    )}
                  </button>

                  {isOwner && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        onDelete(post.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 transition"
                    >
                      <Trash2 size={14} />
                      <span>Delete Story</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Story Text Content */}
        <div className="px-4 sm:px-5 pb-3">
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line break-words">
            {post.content}
          </p>
        </div>

        {/* Story Attached Image */}
        {post.image && (
          <div className="px-4 sm:px-5 pb-3">
            <div
              onClick={() => setPreviewImage(post.image || null)}
              className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 max-h-[460px] cursor-pointer group"
            >
              <img
                src={post.image}
                alt="Story photo"
                className="w-full h-full max-h-[460px] object-cover group-hover:scale-[1.02] transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition-opacity shadow-lg flex items-center gap-1.5">
                  <ExternalLink size={12} />
                  <span>Click to expand</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Interaction Action Bar */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Like button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => onLike(post.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                post.liked
                  ? "bg-rose-50 text-rose-600 font-black"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Heart
                size={16}
                className={post.liked ? "fill-rose-500 text-rose-500" : ""}
              />
              <span>{post.likes}</span>
              <span className="hidden sm:inline">Likes</span>
            </motion.button>

            {/* Comment button */}
            <button
              onClick={() => setShowComments((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                showComments
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <MessageSquare size={16} />
              <span>{post.comments.length}</span>
              <span className="hidden sm:inline">Comments</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Bookmark / Save */}
            <button
              onClick={() => onSave(post.id)}
              className={`p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition ${
                post.saved ? "text-emerald-600 font-bold bg-emerald-50" : ""
              }`}
              title={post.saved ? "Saved to your stories" : "Save story"}
            >
              <Bookmark size={16} className={post.saved ? "fill-emerald-600 text-emerald-600" : ""} />
            </button>

            {/* Share */}
            <button
              onClick={handleCopyShareLink}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              title="Share story link"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Expandable Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 space-y-4"
            >
              {/* Comment Input */}
              {currentUserId ? (
                <form onSubmit={handleCommentSubmit} className="flex gap-2.5 items-center">
                  <img
                    src={currentUserAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"}
                    alt="Current user"
                    className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                  />
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a supportive comment..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center justify-center shrink-0 disabled:opacity-40"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-xs text-slate-500 text-center py-1">
                  Please sign in to join the discussion and post comments.
                </p>
              )}

              {/* Comments Feed */}
              {post.comments.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                  {post.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex gap-2.5 items-start bg-white p-3 rounded-2xl border border-slate-100 text-xs"
                    >
                      <img
                        src={comment.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"}
                        alt={comment.authorName}
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {comment.authorName}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {comment.timeFormatted || "Recently"}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2 italic">
                  Be the first to leave a kind comment for {post.author}!
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    </>
  );
}
