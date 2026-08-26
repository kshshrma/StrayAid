import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { MessageSquare, Heart, Share2, Send, ShieldCheck, HeartHandshake } from "lucide-react";

interface Comment {
  author: string;
  content: string;
  time: string;
}

interface Post {
  id: string;
  author: string;
  avatar: string;
  role: string;
  isVerified: boolean;
  category: "Success Story" | "Adoption" | "Advice" | "Alert";
  content: string;
  image?: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  time: string;
}

export default function Community() {
  const [filter, setFilter] = useState<"All" | "Success Story" | "Adoption" | "Advice" | "Alert">("All");

  const [posts, setPosts] = useState<Post[]>([
    {
      id: "1",
      author: "Sneha Sharma",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
      role: "Verified Rescuer",
      isVerified: true,
      category: "Success Story",
      content: "Meet Sheru! Found him shivering near a metro station with a leg injury. After two weeks of foster care and veterinary help from VetCare Noida, he is fully healed and running around! Thanks everyone who coordinated.",
      image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600",
      likes: 42,
      liked: false,
      comments: [
        { author: "Amit Verma", content: "This is amazing! Sheru looks so happy.", time: "2h ago" },
        { author: "Dr. K. Patel", content: "Great post-op care, Sneha. The leg looks perfectly aligned.", time: "1h ago" }
      ],
      time: "3 hours ago"
    },
    {
      id: "2",
      author: "Paws & Claws NGO",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150",
      role: "NGO Partner",
      isVerified: true,
      category: "Adoption",
      content: "URGENT ADOPTION: Three sibling kittens found abandoned near Sector 15. They are about 6 weeks old, litter-trained, vaccinated for their age, and extremely playful. We would love to adopt them out together or in pairs. Please reach out!",
      image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600",
      likes: 28,
      liked: false,
      comments: [],
      time: "5 hours ago"
    },
    {
      id: "3",
      author: "Rohan Das",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
      role: "Street Guardian",
      isVerified: false,
      category: "Advice",
      content: "Quick tip for local feeders: With temperatures rising in Noida/NCR, please place shallow earthen bowls filled with clean drinking water outside your houses or local parks. Change the water twice daily to keep it fresh and prevent mosquitoes.",
      likes: 67,
      liked: true,
      comments: [
        { author: "Kriti Sen", content: "Already doing this! The local birds and dogs visit every afternoon.", time: "4h ago" }
      ],
      time: "8 hours ago"
    }
  ]);

  // Form states
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<"Success Story" | "Adoption" | "Advice" | "Alert">("Success Story");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Active commenting post state
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");

  const filteredPosts = filter === "All" ? posts : posts.filter(p => p.category === filter);

  function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newPost: Post = {
      id: Date.now().toString(),
      author: "Guest Guardian",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
      role: "Street Guardian",
      isVerified: false,
      category: newCategory,
      content: newContent,
      image: newImageUrl.trim() ? newImageUrl.trim() : undefined,
      likes: 0,
      liked: false,
      comments: [],
      time: "Just now"
    };

    setPosts(prev => [newPost, ...prev]);
    setNewContent("");
    setNewImageUrl("");
    setIsCreating(false);
  }

  function handleLike(postId: string) {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            liked: !p.liked,
            likes: p.liked ? p.likes - 1 : p.likes + 1
          };
        }
        return p;
      })
    );
  }

  function handleAddComment(postId: string) {
    if (!commentInput.trim()) return;
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [
              ...p.comments,
              { author: "Guest Guardian", content: commentInput, time: "Just now" }
            ]
          };
        }
        return p;
      })
    );
    setCommentInput("");
  }

  const categories: ("All" | "Success Story" | "Adoption" | "Advice" | "Alert")[] = [
    "All",
    "Success Story",
    "Adoption",
    "Advice",
    "Alert"
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-5 pb-28">
      <h1 className="mb-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
        <HeartHandshake className="text-green-600" size={32} /> Community Hub
      </h1>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* CREATE POST BOX */}
        <Card className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
          {!isCreating ? (
            <div className="flex gap-3 items-center">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
              <button
                onClick={() => setIsCreating(true)}
                className="flex-1 text-left bg-slate-50 border border-slate-200 hover:bg-slate-100 transition rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-400 cursor-pointer"
              >
                Share a story, adoption alert, or advisory...
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">Create New Post</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold transition"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {(["Success Story", "Adoption", "Advice", "Alert"] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`text-[10px] px-2.5 py-1 font-bold rounded-lg border transition ${
                        newCategory === cat
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Post Content</label>
                <textarea
                  placeholder="Tell the community what is on your mind..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="Paste a photo link (Unsplash or web address)"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl transition text-xs shadow-md shadow-green-100"
              >
                Publish Post
              </Button>
            </form>
          )}
        </Card>

        {/* CATEGORY FILTER TABS */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 py-1.5 px-3 rounded-full text-xs font-bold transition border cursor-pointer ${
                filter === cat
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FEED POSTS */}
        <div className="space-y-5">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-10 bg-white border border-slate-100 rounded-3xl text-slate-400 text-xs">
              No posts found in this category.
            </div>
          ) : (
            filteredPosts.map(post => {
              const catColors = {
                "Success Story": "bg-green-50 text-green-700 border-green-200",
                "Adoption": "bg-blue-50 text-blue-700 border-blue-200",
                "Advice": "bg-purple-50 text-purple-700 border-purple-200",
                "Alert": "bg-red-50 text-red-700 border-red-200"
              };

              return (
                <Card key={post.id} className="p-0 overflow-hidden bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow transition-all">
                  
                  {/* Post Header */}
                  <div className="p-5 flex gap-3 items-center">
                    <img
                      src={post.avatar}
                      alt={post.author}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-950">{post.author}</span>
                        {post.isVerified && (
                          <ShieldCheck size={14} className="text-blue-500 fill-blue-500/10" />
                        )}
                      </div>
                      <div className="flex gap-2 items-center text-[10px] text-slate-400 font-semibold mt-0.5">
                        <span>{post.role}</span>
                        <span>•</span>
                        <span>{post.time}</span>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${catColors[post.category]}`}>
                      {post.category}
                    </span>
                  </div>

                  {/* Post Body */}
                  <div className="px-5 pb-4 space-y-3">
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {post.content}
                    </p>
                    {post.image && (
                      <div className="overflow-hidden rounded-2xl border border-slate-50">
                        <img
                          src={post.image}
                          alt="Post attachment"
                          className="w-full max-h-72 object-cover hover:scale-102 transition duration-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Post Actions Bar */}
                  <div className="px-5 py-3.5 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between text-slate-500 text-xs">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 font-bold transition hover:text-red-500 cursor-pointer ${
                        post.liked ? "text-red-500 font-extrabold" : ""
                      }`}
                    >
                      <Heart size={16} className={post.liked ? "fill-red-500 text-red-500" : ""} />
                      <span>{post.likes} Likes</span>
                    </button>

                    <button
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      className={`flex items-center gap-1.5 font-bold transition hover:text-blue-500 cursor-pointer ${
                        activeCommentPostId === post.id ? "text-blue-500 font-extrabold" : ""
                      }`}
                    >
                      <MessageSquare size={16} />
                      <span>{post.comments.length} Comments</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Check out this post from StrayAid by ${post.author}!`);
                        alert("Link copied to clipboard!");
                      }}
                      className="flex items-center gap-1.5 font-bold transition hover:text-green-500 cursor-pointer"
                    >
                      <Share2 size={16} />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Comments Section (Toggled) */}
                  {activeCommentPostId === post.id && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/20 space-y-4">
                      {/* Comments Feed */}
                      {post.comments.length > 0 && (
                        <div className="space-y-3">
                          {post.comments.map((comment, i) => (
                            <div key={i} className="flex gap-2 items-start text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold shrink-0">
                                {comment.author[0]}
                              </div>
                              <div className="flex-1 space-y-0.5">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-slate-900">{comment.author}</span>
                                  <span className="text-[9px] text-slate-400">{comment.time}</span>
                                </div>
                                <p className="text-slate-600 text-xs font-medium leading-relaxed">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleAddComment(post.id);
                            }
                          }}
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}