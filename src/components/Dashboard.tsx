import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, Eye, FileText, FolderTree } from "lucide-react";

export default function Dashboard({ isAdmin }: { isAdmin: boolean }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats(d.data);
      });
  }, []);

  return (
    <div className="p-10 max-w-5xl mx-auto w-full h-full flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <span className="serif-italic text-2xl text-emerald-400 mb-2 block">System Analytics</span>
        <h1 className="text-5xl font-semibold tracking-tighter text-white">
          Metrics &amp; Insights
        </h1>
        <div className="w-24 h-1 bg-emerald-500 mt-6"></div>
      </motion.div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Today's Visits" value={stats.todayVisits} icon={<Eye size={24} className="text-emerald-500"/>} delay={0.1} />
          <StatCard title="Total Visits" value={stats.totalVisits} icon={<Users size={24} className="text-emerald-500"/>} delay={0.2} />
          <StatCard title="Total Posts" value={stats.totalPosts} icon={<FileText size={24} className="text-emerald-500"/>} delay={0.3} />
          <StatCard title="Categories" value={stats.totalCats} icon={<FolderTree size={24} className="text-emerald-500"/>} delay={0.4} />
        </div>
      )}

      <div className="mt-16 p-8 glass-panel rounded-xl border border-[rgba(255,255,255,0.08)] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full border border-emerald-500/30 flex items-center justify-center bg-black/50 mb-6">
          <FileText size={24} className="text-emerald-500" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">Explorer View</h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-md">
          {isAdmin 
            ? "Expand a folder in the sidebar to start organizing your beautiful content. Architecture flow initialized."
            : "Expand a folder in the sidebar to browse published posts."}
        </p>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="glass-panel p-6 rounded-xl flex flex-col items-start relative overflow-hidden group border border-[rgba(255,255,255,0.08)]"
    >
      <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 group-hover:opacity-40 transition-all duration-500">
        {icon}
      </div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold mb-2">{title}</span>
      <span className="text-4xl font-semibold tracking-tighter text-white font-mono">{value}</span>
    </motion.div>
  );
}
