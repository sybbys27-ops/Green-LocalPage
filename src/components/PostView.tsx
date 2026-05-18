import { useState, useEffect } from "react";
import { Edit2, Trash2, Heart, Eye, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { cn } from "../lib/utils";

export default function PostView({ postId, isAdmin, onEdit, onDeleted }: any) {
  const [post, setPost] = useState<any>(null);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setPost(d.data);
      });
  }, [postId]);

  const deletePost = async () => {
    if (!confirm("Delete this post? This is irreversible.")) return;
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      window.location.reload();
      return;
    }
    if (res.ok) onDeleted();
  };

  const toggleLike = async () => {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setLiked(data.liked);
      setPost(prev => ({
        ...prev,
        like_count: data.liked ? prev.like_count + 1 : Math.max(0, prev.like_count - 1)
      }));
    }
  };

  if (!post) return <div className="p-10 text-center text-slate-500">Loading document...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="p-8 max-w-4xl mx-auto py-12 relative"
      key={postId}
    >
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {isAdmin && (
          <>
            <button onClick={onEdit} className="glass-button p-3 rounded-md text-emerald-400 hover:text-white border-[rgba(16,185,129,0.3)] shadow-[0_0_10px_rgba(16,185,129,0.1)]" title="Edit">
              <Edit2 size={16} />
            </button>
            <button onClick={deletePost} className="glass-button p-3 rounded-md text-red-500 hover:text-white" title="Delete">
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      <div className="mb-10">
        <div className="text-[10px] mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded inline-block mb-4">
          FOLDER: {post.category_name}
        </div>
        <h1 className="text-5xl font-semibold tracking-tighter text-white mb-6 leading-tight">{post.title}</h1>
        
        <div className="flex border-t border-[rgba(255,255,255,0.08)] pt-6 gap-6 text-[10px] mono tracking-widest text-gray-500 uppercase items-center">
          <span>{format(new Date(post.created_at), "PPP")}</span>
          <span className="flex items-center gap-1.5"><Eye size={12}/> {post.view_count} views</span>
          <span className="flex items-center gap-1.5"><Heart size={12}/> {post.like_count} likes</span>
        </div>
      </div>

      <div 
        className="editor-content prose prose-invert mx-auto w-full text-gray-300 leading-relaxed text-base font-sans"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <div className="mt-20 pt-10 border-t border-[rgba(255,255,255,0.08)] flex justify-center">
        <button 
          onClick={toggleLike}
          className={cn(
            "glass-button px-6 py-2 rounded-sm flex items-center gap-3 text-xs uppercase tracking-widest font-bold transition group",
            liked ? "text-emerald-500 border-emerald-500/50 bg-emerald-500/10" : ""
          )}
        >
          <Heart size={16} className={cn("transition", liked && "fill-emerald-500")} />
          {liked ? "Liked!" : "Love this?"}
        </button>
      </div>
    </motion.div>
  );
}
