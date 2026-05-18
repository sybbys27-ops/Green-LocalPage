import { useState } from "react";
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export default function Sidebar({ treeData, isAdmin, onSelectPost, onRefresh, onCreatePost, selectedPostId }: any) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [newCatName, setNewCatName] = useState("");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  const toggleCat = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const createCat = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewCatName("");
        setIsCreatingCat(false);
        onRefresh();
      } else {
        alert("카테고리 생성 실패: " + (data.message || "서버 오류"));
      }
    } catch (err) {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  const deleteCat = async (id: number) => {
    if (!confirm("Delete category?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.message);
    } else {
      onRefresh();
    }
  };

  return (
    <nav className="flex flex-col gap-1 w-full pb-10">
      {isAdmin && (
        <div className="mb-4 px-6">
          {isCreatingCat ? (
            <div className="flex items-center gap-2 mb-2 p-3 bg-[#1A1A1A] rounded border border-[rgba(255,255,255,0.08)]">
              <input 
                autoFocus
                className="bg-transparent border-b border-emerald-500/50 outline-none w-full text-xs py-1 transition-colors focus:border-emerald-500"
                placeholder="Category name..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    createCat();
                  }
                }}
              />
              <button onClick={() => setIsCreatingCat(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreatingCat(true)}
              className="flex items-center gap-2 w-full p-2 text-xs text-emerald-500 hover:bg-white/5 rounded transition font-mono uppercase tracking-wider"
            >
              <Plus size={14} /> New Category
            </button>
          )}
        </div>
      )}

      {treeData.map((cat: any) => (
        <div key={cat.id} className="flex flex-col w-full">
          <div className="group flex items-center justify-between px-6 py-3 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition select-none">
            <div className="flex items-center gap-3 flex-1" onClick={() => toggleCat(cat.id)}>
              <span className="opacity-50">
                {expanded[cat.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              </span>
              <span className="font-semibold text-gray-300 tracking-wide text-xs uppercase">{cat.name}</span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => onCreatePost(cat.id)} className="text-emerald-500 hover:text-emerald-400"><Plus size={14}/></button>
                <button onClick={() => deleteCat(cat.id)} className="text-red-500 hover:text-red-400"><Trash2 size={14}/></button>
              </div>
            )}
          </div>
          
          <AnimatePresence>
            {expanded[cat.id] && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden flex flex-col"
              >
                {cat.posts.length === 0 ? (
                  <div className="text-[10px] text-gray-600 px-12 py-2 mono uppercase">Empty</div>
                ) : (
                  cat.posts.map((post: any) => {
                    const isActive = selectedPostId === post.id;
                    return (
                    <div 
                      key={post.id}
                      onClick={() => onSelectPost(post.id)}
                      className={cn(
                        "sidebar-item px-10 py-2.5 flex items-center gap-3 justify-start relative",
                        isActive ? "active-nav" : "opacity-60"
                      )}
                    >
                      <FileText size={14} className={isActive ? "text-emerald-400" : "text-gray-400"} />
                      <span className={cn("truncate text-sm", isActive ? "text-emerald-500 font-medium" : "text-gray-300")}>{post.title}</span>
                    </div>
                  )})
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </nav>
  );
}
