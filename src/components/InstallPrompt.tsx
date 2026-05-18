import { useState } from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";

export default function InstallPrompt({ onInstalled }: { onInstalled: () => void }) {
  const [password, setPassword] = useState("");

  const handleInstall = async () => {
    if (password.length < 4) return alert("Password must be at least 4 chars.");
    const res = await fetch("/api/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (res.ok) {
      alert("Admin initialized.");
      onInstalled();
    } else {
      alert("Failed or already installed.");
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0A0A] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel max-w-sm w-full p-8 rounded-xl flex flex-col items-center border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A]"
      >
        <div className="w-16 h-16 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <Lock size={28} className="text-emerald-500" />
        </div>
        <h2 className="text-xl tracking-tighter font-bold text-white mb-2">Welcome to Explorer</h2>
        <p className="text-gray-400 text-center mb-8 text-sm leading-relaxed">
          Set up your master administrator password to get started. You will be the sole owner.
        </p>
        
        <input 
          type="password"
          className="glass-input w-full p-3 rounded-md mb-4 outline-none text-center tracking-widest text-lg bg-[#0A0A0A]"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button 
          onClick={handleInstall}
          className="w-full bg-emerald-500 text-black font-bold py-3 rounded-md hover:bg-emerald-400 transition shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-widest text-xs active:scale-[0.98]"
        >
          Initialize System
        </button>
      </motion.div>
    </div>
  );
}
