import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Link2,
  X,
  Send,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  createCommunityPost,
  uploadCommunityImage,
  type StoryCategory,
  type CommunityPost,
} from "../../services/community/communityService";

interface CommunityStoryComposerProps {
  currentUser: {
    id: string;
    name: string;
    avatarUrl: string;
    role: string;
  };
  onPostCreated: (post: CommunityPost) => void;
}

const CATEGORIES: { label: StoryCategory; emoji: string; color: string }[] = [
  { label: "Success Story", emoji: "💚", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Adoption", emoji: "🐾", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { label: "Advice", emoji: "💡", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { label: "Alert", emoji: "🚨", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { label: "Rescue Update", emoji: "🚑", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

export default function CommunityStoryComposer({
  currentUser,
  onPostCreated,
}: CommunityStoryComposerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<StoryCategory>("Success Story");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size should be under 10MB.");
      return;
    }

    setSelectedFile(file);
    setImageUrl("");
    setShowUrlInput(false);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setSelectedFile(null);
    setImagePreview(null);
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      let finalImageUrl = imageUrl.trim();

      // If user picked a file, upload to Supabase storage first
      if (selectedFile) {
        try {
          finalImageUrl = await uploadCommunityImage(selectedFile);
        } catch (uploadErr: any) {
          console.warn("[Composer] File upload fallback:", uploadErr);
          // If storage bucket is not configured, fall back to data URI or alert
          if (imagePreview) {
            finalImageUrl = imagePreview;
          }
        }
      }

      const post = await createCommunityPost({
        content: content.trim(),
        category,
        imageUrl: finalImageUrl || undefined,
      });

      onPostCreated(post);

      // Reset form state on success
      setContent("");
      setImageUrl("");
      setSelectedFile(null);
      setImagePreview(null);
      setIsExpanded(false);
      setShowUrlInput(false);
    } catch (err: any) {
      console.error("[Composer] Submission failed:", err);
      // Retain draft content so user doesn't lose what they wrote
      setError(err.message || "Failed to publish story. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const charCount = content.length;
  const isOverLimit = charCount > 1500;

  return (
    <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-4 sm:p-5 transition-all duration-200">
      {/* Top Welcome Bar */}
      <div className="flex items-start gap-3">
        <img
          src={currentUser.avatarUrl}
          alt={currentUser.name}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-100 shrink-0"
        />

        <div className="flex-1 min-w-0">
          {!isExpanded ? (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-left py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/60 text-slate-400 text-xs sm:text-sm font-medium transition cursor-text flex items-center justify-between group"
            >
              <span className="truncate">
                Share a moment that could inspire someone to help an animal...
              </span>
              <Sparkles
                size={16}
                className="text-emerald-600 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition shrink-0 ml-2"
              />
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Select Story Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setCategory(cat.label)}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                          isSelected
                            ? `${cat.color} ring-2 ring-slate-900/10 shadow-sm`
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share a rescue story, care tip, foster update, or adoption alert with the community..."
                  className={`w-full min-h-[120px] rounded-2xl border p-3.5 text-xs sm:text-sm text-slate-800 bg-slate-50/50 focus:bg-white placeholder:text-slate-400 focus:outline-none transition resize-none ${
                    isOverLimit
                      ? "border-red-400 focus:ring-2 focus:ring-red-400"
                      : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  }`}
                  autoFocus
                />

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium px-1 mt-1">
                  <span>Inspire with kind, respectful words</span>
                  <span className={isOverLimit ? "text-red-500 font-bold" : ""}>
                    {charCount} / 1500
                  </span>
                </div>
              </div>

              {/* Image Preview Box */}
              <AnimatePresence>
                {(imagePreview || imageUrl) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-64 flex items-center justify-center group"
                  >
                    <img
                      src={imagePreview || imageUrl}
                      alt="Story preview"
                      className="max-h-64 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition shadow-lg"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* URL Input Box (Toggled) */}
              {showUrlInput && !imagePreview && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste web photo address (https://...)"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(false)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Composer Action Bar */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  {/* File Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="story-image-upload"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200/80 transition"
                  >
                    <ImageIcon size={15} className="text-emerald-600" />
                    <span>Add Photo</span>
                  </button>

                  {/* Web Image Link Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowUrlInput((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200/80 transition"
                    title="Paste web link for image"
                  >
                    <Link2 size={15} className="text-blue-500" />
                    <span className="hidden sm:inline">Image URL</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded(false);
                      setError(null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!content.trim() || submitting || isOverLimit}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <span>Share Story</span>
                        <Send size={13} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
