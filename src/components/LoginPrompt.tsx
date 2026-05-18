import { useState } from "react";
import { motion } from "motion/react";
import { KeyRound, X } from "lucide-react";

export default function LoginPrompt({ onLogin, onCancel }: any) {
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (res.ok) {
      onLogin();
    } else {
      alert("Invalid Password");
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0A]/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel max-w-sm w-full p-8 rounded-xl relative border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A]"
      >
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <KeyRound size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-xl tracking-tighter font-bold text-white mb-2">System Access</h2>
          <p className="text-gray-400 text-center mb-8 text-sm leading-relaxed">
            Enter the master password to unlock editing capabilities.
          </p>
          
          <input 
            type="password"
            autoFocus
            className="glass-input w-full p-3 rounded-md mb-4 outline-none text-center tracking-widest text-lg focus:border-emerald-500 bg-[#0A0A0A]"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
          <button 
            onClick={handleLogin}
            className="w-full bg-emerald-500 text-black font-bold py-3 rounded-md hover:bg-emerald-400 transition shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-widest text-xs active:scale-[0.98]"
          >
            Authenticate
          </button>
        </div>
      </motion.div>
    </div>
  );
}
