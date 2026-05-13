import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { DigitalSerenityFX } from "@/components/ui/DigitalSerenityFX";
import { usePageBackground } from "@/hooks/usePageBackground";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin();
  
  usePageBackground('dark');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation(data.user.role === "admin" ? "/admin/dashboard" : "/client/dashboard");
        },
      }
    );
  };

  const words1 = "Your family's wealth,".split(" ");
  const words2 = "one record.".split(" ");

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col lg:flex-row min-h-screen w-full bg-[#1C1C1E] overflow-x-hidden text-slate-200"
    >
      <DigitalSerenityFX />

      {/* ═══════════════════ LEFT PANEL (Desktop) / TOP SECTION (Mobile) ═══════════════════ */}
      <div className="flex relative w-full lg:w-[58%] min-h-[300px] lg:h-full flex-col p-8 sm:p-16 xl:p-24 justify-between border-b border-white/5 lg:border-b-0 lg:border-r backdrop-blur-[2px] z-10">
        
        {/* Logo Area */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-gold/20">
            <img src="/logo.jpg" alt="Financial Family" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <div className="text-[13px] font-bold tracking-[0.25em] text-white uppercase font-['DM_Sans']">Financial Family</div>
            <div className="text-[10px] font-light tracking-[0.2em] text-slate-500 uppercase font-['DM_Sans']">Private Office</div>
          </div>
        </div>

        {/* Center Text Area */}
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-center lg:text-left">
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-2 sm:gap-x-4">
              {words1.map((word, i) => (
                <span
                  key={i}
                  className="word-animate inline-block text-[36px] sm:text-[48px] xl:text-[64px] font-light leading-tight text-white font-['Cormorant_Garamond']"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  {word}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-2 sm:gap-x-4 mt-1 sm:mt-2">
              {words2.map((word, i) => (
                <span
                  key={i}
                  className="word-animate inline-block text-[36px] sm:text-[48px] xl:text-[64px] font-normal leading-tight text-[#C9A84C] font-['Cormorant_Garamond']"
                  style={{ animationDelay: `${(words1.length + i) * 150}ms` }}
                >
                  {word}
                </span>
              ))}
            </div>
          </h1>
          
          <div className="mt-6 sm:mt-12 space-y-4">
            <p className="text-center lg:text-left text-[16px] sm:text-[18px] text-slate-400 font-light font-['DM_Sans'] max-w-lg mx-auto lg:mx-0 leading-relaxed">
              A private command centre for India's high-net-worth families — tracking every asset, every generation, with bank-grade security.
            </p>
          </div>
        </div>

        {/* Features - Stack/Grid on mobile */}
        <div className="relative z-10 flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-8 mt-8 sm:mt-0">
          {[
            { icon: ShieldCheck, text: "AES-256 encrypted" },
            { icon: ShieldCheck, text: "Live NAV & NSE" },
            { icon: ShieldCheck, text: "Multi-gen vault" }
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm">
              <f.icon className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-light font-['DM_Sans'] tracking-wider uppercase">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════ RIGHT PANEL (Desktop) / BOTTOM SECTION (Mobile) ═══════════════════ */}
      <div className="w-full lg:w-[42%] min-h-screen lg:h-full flex items-center justify-center p-8 sm:p-12 xl:p-24 relative bg-[#1C1C1E] z-20">
        

        {/* Form Container */}
        <div className="w-full max-w-[400px]">
          <div className="mb-12">
            <h2 className="text-[40px] font-normal text-white font-['Cormorant_Garamond']">
              Sign In
            </h2>
            <p className="text-[15px] text-slate-400 mt-2 font-light font-['DM_Sans']">
              Access your private family dashboard
            </p>
            <div className="h-px w-full bg-white/5 mt-8" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="block text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold font-['DM_Sans']">
                Username
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-[#C9A84C]" />
                <input
                  type="text"
                  required
                  className="w-full h-12 pl-12 pr-4 text-[15px] text-white placeholder-slate-600 font-light font-['DM_Sans'] bg-white/5 border border-white/10 rounded-lg focus:bg-white/10 focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/20 outline-none transition-all"
                  placeholder="advisor_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold font-['DM_Sans']">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-[#C9A84C]" />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  className="w-full h-12 pl-12 pr-12 text-[15px] text-white placeholder-slate-600 font-light font-['DM_Sans'] bg-white/5 border border-white/10 rounded-lg focus:bg-white/10 focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/20 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#C9A84C] transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {login.isError && (
              <div className="text-[13px] text-red-600 font-light font-['DM_Sans'] bg-red-50 p-3 rounded-lg border border-red-100">
                Invalid credentials. Please contact your advisor.
              </div>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full h-[52px] bg-white/10 text-white hover:bg-[#C9A84C] hover:text-slate-900 rounded-lg text-[15px] font-bold tracking-wide font-['DM_Sans'] transition-all border border-white/5 disabled:opacity-50"
            >
              {login.isPending ? "Authenticating..." : "Sign in to Dashboard"}
            </button>
          </form>

          <div className="mt-16 text-center">
            <p className="text-[11px] text-slate-300 font-light font-['DM_Sans'] tracking-widest uppercase">
              Bank-Grade Security Enabled
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
