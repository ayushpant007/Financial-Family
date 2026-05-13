import { useState, useEffect, useRef } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { User, Lock, Eye, EyeOff, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { usePageBackground } from "@/hooks/usePageBackground";

import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin();
  
  usePageBackground('dark');
  useScrollReveal();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0, opacity: 0 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  // Mouse move gradient for left panel
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY, opacity: 1 });
    };
    const handleMouseLeave = () => {
      setMousePos(prev => ({ ...prev, opacity: 0 }));
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

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

  const pageStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400&display=swap');

    :root {
      --text-gold: #C9A84C;
      --text-main: #0F172A;
    }

    @keyframes word-appear {
      0% { opacity: 0; transform: translateY(20px); filter: blur(10px); }
      100% { opacity: 1; transform: translateY(0); filter: blur(0); }
    }

    @keyframes shimmer {
      0% { left: -150%; }
      100% { left: 150%; }
    }

    .animate-appear {
      animation: word-appear 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .shimmer-btn {
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
      z-index: 50; /* Ensure it stays above everything */
    }

    .shimmer-btn::after {
      content: '';
      position: absolute;
      top: 0;
      left: -150%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        rgba(201, 168, 76, 0.2),
        rgba(255, 255, 255, 0.1),
        transparent
      );
      transform: skewX(-20deg);
      pointer-events: none;
    }

    .shimmer-btn:hover:not(:disabled)::after {
      animation: shimmer 1.2s ease-out infinite;
    }

    .shimmer-btn:active:not(:disabled) {
      transform: scale(0.98);
    }

    .glass-input {
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    .glass-input:focus {
      background: rgba(0, 0, 0, 0.04);
      border-color: var(--text-gold);
      box-shadow: 0 0 15px rgba(201, 168, 76, 0.15);
      outline: none;
    }
  `;

  return (
    <>
      <style>{pageStyles}</style>
      <div className="flex flex-col lg:flex-row min-h-screen w-full bg-transparent overflow-x-hidden">
        
        {/* ═══════════════════ LEFT PANEL (Desktop) / TOP SECTION (Mobile) ═══════════════════ */}
        <div className="flex relative w-full lg:w-[55%] flex-col p-8 sm:p-16 xl:p-24 justify-between border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0A0A0B] overflow-hidden" data-reveal>
          
          {/* Mouse Glow */}
          <div 
            style={{
              position: 'fixed',
              left: mousePos.x,
              top: mousePos.y,
              opacity: mousePos.opacity * 0.15,
              background: 'radial-gradient(circle, var(--text-gold), transparent 70%)',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              filter: 'blur(100px)',
              transition: 'opacity 0.5s ease',
              zIndex: 1,
              pointerEvents: 'none'
            }}
          />

          {/* Logo Area */}
          <div className="relative z-10 flex items-center gap-4 animate-appear [animation-delay:100ms]">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center overflow-hidden border border-white/10">
              <img src="/logo.jpg" alt="Financial Family" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="text-[13px] font-bold tracking-[0.25em] text-white uppercase font-['DM_Sans']">Financial Family</div>
              <div className="text-[10px] font-light tracking-[0.2em] text-white/50 uppercase font-['DM_Sans']">Private Office</div>
            </div>
          </div>

          {/* Center Text Area */}
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-[44px] sm:text-[72px] font-light leading-[1.1] sm:leading-[1] text-white font-['Cormorant_Garamond']">
              <span className="block animate-appear [animation-delay:300ms]">Your family's wealth,</span>
              <span className="block animate-appear [animation-delay:450ms] text-[#C9A84C] italic font-medium">one record.</span>
            </h1>
            
            <div className="mt-6 sm:mt-12 space-y-4 animate-appear [animation-delay:600ms]">
              <p className="text-[16px] sm:text-[18px] text-white/60 font-light font-['DM_Sans'] max-w-lg leading-relaxed">
                A private command centre for India's high-net-worth families — tracking every asset, every generation, with bank-grade security.
              </p>
            </div>
          </div>

          {/* Feature Badges (Matches Photo 2) */}
          <div className="relative z-10 flex flex-wrap gap-4 mt-12 animate-appear [animation-delay:800ms]">
            {[
              { label: "AES-256 ENCRYPTED", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
              { label: "LIVE NAV & NSE", icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { label: "MULTI-GEN VAULT", icon: <Users className="w-3.5 h-3.5" /> }
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                <span className="text-[#C9A84C]">{badge.icon}</span>
                <span className="text-[10px] font-bold tracking-[0.1em] text-white/70 uppercase font-['DM_Sans']">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════ RIGHT PANEL (Desktop) / BOTTOM SECTION (Mobile) ═══════════════════ */}
        <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12 xl:p-24 relative bg-white" data-reveal data-reveal-delay="200">
          
          {/* Glass Panel Container */}
          <div className="w-full max-w-[420px] glass-panel p-10 md:p-14 border-slate-200 bg-white/60 shadow-2xl relative overflow-visible">
            
            <div className="mb-12">
              <div className="hidden items-center gap-3 mb-8">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <img src="/logo.jpg" alt="Financial Family" className="w-6 h-6 object-contain" />
                </div>
                <span className="text-[12px] font-bold tracking-[0.1em] uppercase text-slate-900">Financial Family</span>
              </div>
              
              <h2 className="text-[40px] font-normal text-slate-900 font-['Cormorant_Garamond'] animate-appear [animation-delay:100ms]">
                Sign In
              </h2>
              <p className="text-[15px] text-slate-500 mt-2 font-light font-['DM_Sans'] animate-appear [animation-delay:250ms]">
                Access your private family dashboard
              </p>
              <div className="h-px w-full bg-slate-200 mt-8 animate-appear [animation-delay:350ms]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 animate-appear [animation-delay:500ms]">
              
              <div className="space-y-3">
                <label className="block text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold font-['DM_Sans']">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full h-12 pl-12 pr-4 text-[15px] text-slate-900 placeholder-slate-300 font-light font-['DM_Sans'] glass-input rounded-xl"
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
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    className="w-full h-12 pl-12 pr-12 text-[15px] text-slate-900 placeholder-slate-300 font-light font-['DM_Sans'] glass-input rounded-xl"
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
                <div className="text-[13px] text-red-600 font-light font-['DM_Sans'] bg-red-50 p-3 rounded-xl border border-red-100 animate-appear">
                  Invalid credentials. Please contact your advisor.
                </div>
              )}

              <button
                type="submit"
                disabled={login.isPending}
                className="w-full h-[52px] bg-slate-900 text-white hover:bg-[#C9A84C] hover:text-white rounded-xl text-[15px] font-bold tracking-wide font-['DM_Sans'] shimmer-btn shadow-xl shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {login.isPending ? "Authenticating..." : "Sign in to Dashboard"}
              </button>
            </form>

            <div className="mt-16 text-center animate-appear [animation-delay:700ms]">
              <p className="text-[12px] text-slate-400 font-light font-['DM_Sans'] tracking-widest uppercase">
                Bank-Grade Security Enabled
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
