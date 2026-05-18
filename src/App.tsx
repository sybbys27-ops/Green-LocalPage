import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Editor from "./components/Editor";
import PostView from "./components/PostView";
import InstallPrompt from "./components/InstallPrompt";
import LoginPrompt from "./components/LoginPrompt";
import { LogOut, Trash2 } from "lucide-react";

export default function App() {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [view, setView] = useState<"dashboard" | "login" | "editor" | "post">("dashboard");
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [treeData, setTreeData] = useState([]);
  const [cleaningImages, setCleaningImages] = useState(false);

  const fetchStatus = async () => {
    const res = await fetch("/api/status");
    if (res.ok) {
      const { installed } = await res.json();
      setInstalled(installed);
    }
  };

  const checkSession = async () => {
    const res = await fetch("/api/auth/session");
    if (res.ok) {
      const { is_admin } = await res.json();
      setIsAdmin(is_admin);
    }
  };

  const fetchTree = async () => {
    const res = await fetch("/api/tree");
    if (res.ok) {
      const { data } = await res.json();
      setTreeData(data);
    }
  };

  // Run initial visits API once
  useEffect(() => {
    fetch("/api/stats").catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
    checkSession();
    fetchTree();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
    setView("dashboard");
  };

  const cleanupImages = async () => {
    if (!confirm("Are you sure you want to clean up unused orphan images?")) return;
    setCleaningImages(true);
    try {
      const res = await fetch("/api/cleanup-images", { method: "POST" });
      const data = await res.json();
      alert(`Cleanup Complete.\n\nDeleted: ${data.deleted_count}\nFailed: ${data.failed_count}`);
    } finally {
      setCleaningImages(false);
    }
  };

  if (installed === null) return <div className="h-screen flex items-center justify-center text-slate-400">Loading...</div>;

  if (!installed) {
    return <InstallPrompt onInstalled={() => setInstalled(true)} />;
  }

  return (
    <div className="flex h-screen w-full bg-[#0A0A0A] text-gray-200 font-sans selection:bg-emerald-500/30 overflow-hidden">
      {/* Sidebar Explorer */}
      <aside className="w-[260px] h-full bg-[#121212] border-r border-[rgba(255,255,255,0.08)] flex flex-col shrink-0">
        <div className="p-6 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <button 
              onClick={() => setView("dashboard")} 
              className="text-lg font-bold tracking-tight text-white hover:opacity-80 transition cursor-pointer"
            >
              PLATINUM<span className="font-light opacity-50">CORE</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 custom-scrollbar flex flex-col">
          <div className="px-6 mb-4 flex justify-between items-center">
             <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold">Explorer</p>
             {!isAdmin ? (
               <button onClick={() => setView("login")} className="text-xs text-emerald-500 hover:text-emerald-400">Login</button>
             ) : (
               <div className="flex items-center gap-3">
                 <button 
                   title="Cleanup Images"
                   onClick={cleanupImages} 
                   disabled={cleaningImages}
                   className="text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                 >
                   <Trash2 size={13} />
                 </button>
                 <button onClick={handleLogout} className="text-gray-500 hover:text-emerald-400 transition-colors" title="Logout">
                   <LogOut size={13} />
                 </button>
               </div>
             )}
          </div>
          
          <Sidebar 
            treeData={treeData} 
            isAdmin={isAdmin} 
            selectedPostId={selectedPostId}
            onSelectPost={(id) => {
              setSelectedPostId(id);
              setView("post");
            }}
            onRefresh={fetchTree}
            onCreatePost={(catId) => {
              setSelectedCategoryId(catId);
              setSelectedPostId(null);
              setView("editor");
            }}
          />
        </div>
        
        {isAdmin && (
          <div className="p-6 border-t border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400"></div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Admin Mode</span>
                <span className="text-[10px] opacity-40 mono">v1.0.0-stable</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar flex flex-col">
        {view === "dashboard" && <Dashboard isAdmin={isAdmin} stats={installed !== null ? {} /* placeholder config, real fetch is internal */ : null} />}
        {view === "login" && <LoginPrompt onLogin={() => { setIsAdmin(true); setView("dashboard"); }} onCancel={() => setView("dashboard")} />}
        {view === "post" && selectedPostId !== null && (
          <PostView 
            postId={selectedPostId} 
            isAdmin={isAdmin} 
            onEdit={() => setView("editor")}
            onDeleted={() => {
               fetchTree();
               setView("dashboard");
            }}
          />
        )}
        {view === "editor" && isAdmin && (
          <Editor 
            postId={selectedPostId} 
            categoryId={selectedCategoryId}
            onSaved={(id) => {
              fetchTree();
              setSelectedPostId(id);
              setView("post");
            }}
            onCancel={() => {
              if (selectedPostId) setView("post");
              else setView("dashboard");
            }}
          />
        )}
      </main>
    </div>
  );
}
