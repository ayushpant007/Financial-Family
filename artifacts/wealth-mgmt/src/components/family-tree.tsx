import React from "react";
import { motion } from "framer-motion";
import { User, Users, Baby, Heart, Plus, Minus, Pencil, Trash2, Lock, Unlock } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Asset, Liability, FamilyMember } from "@workspace/api-client-react";

const MemberCard = React.memo(({ 
  member, 
  isPrimary = false,
  isSelected = false,
  financials,
  readOnly,
  onSelectMember,
  onEditMember,
  onDeleteMember,
  formatCurrency
}: { 
  member: FamilyMember | { id: number; name: string; relation?: string; dob?: string | null }; 
  isPrimary?: boolean;
  isSelected?: boolean;
  financials: { netWorth: number; totalAssets: number };
  readOnly: boolean;
  onSelectMember: (m: FamilyMember | null) => void;
  onEditMember: (m: FamilyMember) => void;
  onDeleteMember: (id: number) => void;
  formatCurrency: (val: number) => string;
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative flex flex-col items-center p-6 rounded-2xl border transition-all cursor-pointer w-56 backdrop-blur-md ${
        isSelected 
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
          : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50 shadow-sm"
      }`}
      onClick={() => onSelectMember(isPrimary ? null : member as FamilyMember)}
      style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
    >
      <div className={`p-4 rounded-2xl mb-4 ${isPrimary ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}`}>
        {isPrimary ? <User size={28} /> : (member.relation === "Spouse" ? <Heart size={28} /> : (member.relation === "Parent" ? <Users size={28} /> : <Baby size={28} />))}
      </div>
      <h3 className="font-bold text-base text-center truncate w-full mb-0.5 text-slate-900">{member.name}</h3>
      <Badge variant="secondary" className={`text-[10px] uppercase tracking-widest mb-3 px-2 h-5 font-black ${isPrimary ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>
        {isPrimary ? "Primary Client" : (member as any).relation?.toUpperCase()}
      </Badge>
      
      {member.dob && (
        <p className="text-[11px] text-slate-400 font-medium mb-4">DOB: {member.dob}</p>
      )}
      
      <div className="w-full space-y-2 pt-3 border-t border-slate-100">
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-slate-400 font-bold">Net Worth</span>
          <span className={`font-black ${financials.netWorth >= 0 ? "text-primary" : "text-rose-500"}`}>
            {formatCurrency(financials.netWorth)}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
           <div 
             className="h-full bg-primary transition-all duration-700 ease-out" 
             style={{ width: financials.totalAssets > 0 ? `${Math.min(100, (financials.netWorth / financials.totalAssets) * 100)}%` : '0%' }}
           />
        </div>
      </div>

      {!isPrimary && !readOnly && (
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-primary hover:text-white" onClick={(e) => { e.stopPropagation(); onEditMember(member as FamilyMember); }}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm border border-slate-200 text-rose-500 hover:bg-rose-500 hover:text-white" onClick={(e) => { e.stopPropagation(); onDeleteMember(member.id); }}>
            <Trash2 size={14} />
          </Button>
        </div>
      )}
      
      {isSelected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-[9px] text-white rounded-full uppercase font-black tracking-[0.2em] shadow-xl">
          Active
        </div>
      )}
    </motion.div>
  );
});
MemberCard.displayName = "MemberCard";

export function FamilyTree({
  client,
  familyMembers,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onSelectMember,
  selectedMemberId,
  assets,
  liabilities,
  readOnly = false,
}: FamilyTreeProps) {
  const SCALE_STEP = 0.1;
  const MIN_SCALE = 0.4;
  const MAX_SCALE = 2;

  const spouse = React.useMemo(() => familyMembers.find((m) => m.relation === "Spouse"), [familyMembers]);
  const parents = React.useMemo(() => familyMembers.filter((m) => m.relation === "Parent"), [familyMembers]);
  const children = React.useMemo(() => familyMembers.filter((m) => m.relation === "Child"), [familyMembers]);

  const getMemberFinancials = React.useCallback((memberId: number | null) => {
    const memberAssets = assets.filter((a) => Number(a.familyMemberId ?? 0) === Number(memberId ?? 0));
    const memberLiabilities = liabilities.filter((l) => Number(l.familyMemberId ?? 0) === Number(memberId ?? 0));
    const totalAssets = memberAssets.reduce((sum, a) => sum + Number(a.value || 0), 0);
    const totalLiabilities = memberLiabilities.reduce((sum, l) => sum + Number(l.outstandingAmount || 0), 0);
    return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
  }, [assets, liabilities]);

  const formatCurrency = React.useCallback((val: number) => 
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val), []);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const zoomRef = React.useRef<HTMLDivElement>(null);
  const memberRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [paths, setPaths] = React.useState<string[]>([]);
  const [scale, setScale] = React.useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 0.45 : 0.9);

  const getPos = React.useCallback((id: string) => {
    const el = memberRefs.current[id];
    const container = zoomRef.current;
    if (!el || !container) return null;
    
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate unscaled coordinates relative to the content container
    return {
      x: (rect.left - containerRect.left + rect.width / 2) / scale,
      y: (rect.top - containerRect.top + rect.height / 2) / scale,
      top: (rect.top - containerRect.top) / scale,
      bottom: (rect.bottom - containerRect.top) / scale,
      left: (rect.left - containerRect.left) / scale,
      right: (rect.right - containerRect.left) / scale,
      width: rect.width / scale,
      height: rect.height / scale
    };
  }, [scale]);

  const [marriageMid, setMarriageMid] = React.useState<{ x: number; y: number } | null>(null);

  const calculatePaths = React.useCallback(() => {
    const zoomEl = zoomRef.current;
    if (!zoomEl) return;
    
    const clientPos = getPos("client");
    const spousePos = spouse ? getPos(`member-${spouse.id}`) : null;

    if (!clientPos) return;

    const newPaths: string[] = [];
    const newMidpoint: { x: number, y: number } | null = null;

    // 1. Parent Connection (Shankar)
    parents.forEach(p => {
      const pPos = getPos(`member-${p.id}`);
      if (pPos) {
        if (spousePos) {
          // FORKED Connection: Parent -> (Stem) -> Branches to BOTH Ayush & Sridevi
          const midY = (pPos.bottom + Math.min(clientPos.top, spousePos.top)) / 2;
          
          // Stem down from Parent
          newPaths.push(`M ${pPos.x} ${pPos.bottom} L ${pPos.x} ${midY}`);
          
          // Curve to Client (Ayush)
          newPaths.push(`M ${pPos.x} ${midY} C ${pPos.x} ${midY + 20}, ${clientPos.x} ${clientPos.top - 20}, ${clientPos.x} ${clientPos.top}`);
          
          // Curve to Spouse (Sridevi)
          newPaths.push(`M ${pPos.x} ${midY} C ${pPos.x} ${midY + 20}, ${spousePos.x} ${spousePos.top - 20}, ${spousePos.x} ${spousePos.top}`);
        } else {
          // Direct line to Client
          const midY = (pPos.bottom + clientPos.top) / 2;
          newPaths.push(`M ${pPos.x} ${pPos.bottom} L ${pPos.x} ${midY} L ${clientPos.x} ${midY} L ${clientPos.x} ${clientPos.top}`);
        }
      }
    });

    // 2. Marriage Line (Ayush <-> Sridevi)
    let marriageMid: { x: number, y: number } | null = null;
    if (spousePos) {
      const leftNode = clientPos.x < spousePos.x ? clientPos : spousePos;
      const rightNode = clientPos.x < spousePos.x ? spousePos : clientPos;
      
      newPaths.push(`M ${leftNode.right} ${leftNode.y} L ${rightNode.left} ${rightNode.y}`);
      
      marriageMid = {
        x: (leftNode.right + rightNode.left) / 2,
        y: leftNode.y
      };
    }

    // 3. Child Line (from Heart Center)
    const sourceX = marriageMid ? marriageMid.x : clientPos.x;
    const sourceY = marriageMid ? marriageMid.y : clientPos.bottom;
    const stemLength = 100;

    if (children.length > 0 || !readOnly) {
       const stemBottomY = sourceY + stemLength;
       // Vertical stem down from marriage center
       newPaths.push(`M ${sourceX} ${sourceY} L ${sourceX} ${stemBottomY}`);
       
       children.forEach(c => {
         const cPos = getPos(`member-${c.id}`);
         if (cPos) {
           const midY = (stemBottomY + cPos.top) / 2;
           newPaths.push(`M ${sourceX} ${stemBottomY} C ${sourceX} ${midY}, ${cPos.x} ${midY}, ${cPos.x} ${cPos.top}`);
         }
       });

       if (!readOnly) {
          const addPos = getPos("add-child");
          if (addPos) {
            const midY = (stemBottomY + addPos.top) / 2;
            newPaths.push(`M ${sourceX} ${stemBottomY} C ${sourceX} ${midY}, ${addPos.x} ${midY}, ${addPos.x} ${addPos.top}`);
          }
       }
    }

    setPaths(newPaths);
    setMarriageMid(marriageMid);
  }, [spouse, parents, children, readOnly, getPos]);

  const handleZoom = (direction: "in" | "out") => {
    setScale(prev => {
      const next = direction === "in" ? prev + SCALE_STEP : prev - SCALE_STEP;
      return Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    });
  };

  React.useLayoutEffect(() => {
    calculatePaths();
    
    let rafId: number;
    const sync = () => {
      calculatePaths();
      rafId = requestAnimationFrame(sync);
    };
    
    rafId = requestAnimationFrame(sync);
    window.addEventListener("resize", calculatePaths);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", calculatePaths);
    };
  }, [calculatePaths]);

  return (
    <div 
      ref={containerRef} 
      className="p-2 md:p-10 bg-transparent rounded-2xl md:rounded-[3rem] overflow-hidden relative min-h-[500px] md:min-h-[850px] border border-slate-200 select-none shadow-inner"
    >
      <style>{`
        @keyframes lightTravel {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        .animated-path {
          stroke-dasharray: 10 30;
          animation: lightTravel 2s linear infinite;
        }
      `}</style>

      {/* Mobile Hint */}
      <div className="md:hidden absolute top-4 left-4 z-50 pointer-events-none">
        <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Pinch & Drag to explore
        </Badge>
      </div>

      <div className="absolute bottom-4 md:top-12 right-4 md:right-12 z-50 flex flex-row md:flex-col gap-2 md:gap-3">
        <div className="flex flex-row md:flex-col bg-white/80 backdrop-blur-md rounded-xl md:rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-none border-r md:border-r-0 md:border-b border-slate-100 hover:bg-slate-50 text-slate-600" onClick={() => handleZoom("in")}><Plus size={18} /></Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-none border-r md:border-r-0 md:border-b border-slate-100 hover:bg-slate-50 text-slate-600" onClick={() => handleZoom("out")}><Minus size={18} /></Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-none hover:bg-slate-50 text-slate-600" onClick={() => { setScale(window?.innerWidth < 768 ? 0.6 : 1); }}><Users size={18} /></Button>
        </div>
        <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 bg-white/80 backdrop-blur-md rounded-xl md:rounded-2xl shadow-xl border border-slate-200 hover:bg-slate-50">
          {readOnly ? <Lock size={18} className="text-slate-400" /> : <Unlock size={18} className="text-amber-500 animate-pulse" />}
        </Button>
      </div>

      <div className="hidden md:flex absolute bottom-12 right-12 z-50 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200 shadow-xl flex-col gap-4 min-w-[160px]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(139,92,246,0.3)]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Parent</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-1 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.3)]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Spouse</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-1 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.3)]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Child</span>
        </div>
      </div>

      <motion.div 
        ref={zoomRef}
        drag
        dragConstraints={containerRef}
        dragElastic={0.1}
        animate={{ scale }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex flex-col items-center justify-start min-h-full min-w-full cursor-grab active:cursor-grabbing pt-8 md:pt-16 px-4 pb-24"
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
          <defs>
            <linearGradient id="parentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {paths.map((d, i) => (
            <React.Fragment key={`path-group-${i}`}>
              <path d={d} fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
              <path 
                d={d} 
                fill="none" 
                stroke={d.includes('M') && d.split('M').length > 2 ? "url(#parentGradient)" : "#8b5cf6"} 
                strokeWidth="3" 
                strokeLinecap="round" 
                className="animated-path"
                style={{ filter: "url(#pathGlow)" }}
              />
            </React.Fragment>
          ))}
          
          {spouse && marriageMid && (
            <g transform={`translate(${marriageMid.x - 16}, ${marriageMid.y - 16})`}>
              <circle cx="16" cy="16" r="16" fill="white" stroke="#f43f5e" strokeWidth="2" style={{ filter: "drop-shadow(0 4px 6px rgba(244, 63, 94, 0.15))" }} />
              <path 
                d="M16 24.5c-.2 0-.4-.1-.5-.2-1.8-1.8-5-4.5-6.5-6.5-1.5-2-1.5-4.5 0-6s4.5-1.5 6 0c1.5-1.5 4.5-1.5 6 0s1.5 4 0 6c-1.5 2-4.7 4.7-6.5 6.5-.1.1-.3.2-.5.2z" 
                fill="#f43f5e" 
              />
            </g>
          )}
        </svg>

        <div className="flex flex-col items-center gap-16 md:gap-24 relative z-10 py-10 md:py-20">
          <div className="flex gap-12 md:gap-20">
            {parents.map(p => (
              <div key={p.id} ref={el => { memberRefs.current[`member-${p.id}`] = el; }}>
                <MemberCard 
                  member={p} 
                  isSelected={selectedMemberId === p.id}
                  financials={getMemberFinancials(p.id)}
                  readOnly={readOnly}
                  onSelectMember={onSelectMember}
                  onEditMember={onEditMember}
                  onDeleteMember={onDeleteMember}
                  formatCurrency={formatCurrency}
                />
              </div>
            ))}
            {parents.length === 0 && (
              <div className="w-56 h-40 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-200 italic text-sm bg-slate-50">
                <Users size={32} className="mb-2 opacity-50" />
                Parents
              </div>
            )}
          </div>

          <div className="flex gap-16 md:gap-32 items-center">
            <div ref={el => { memberRefs.current["client"] = el; }}>
              <MemberCard 
                member={client} 
                isPrimary 
                isSelected={selectedMemberId === null}
                financials={getMemberFinancials(null)}
                readOnly={readOnly}
                onSelectMember={onSelectMember}
                onEditMember={onEditMember}
                onDeleteMember={onDeleteMember}
                formatCurrency={formatCurrency}
              />
            </div>
            {spouse ? (
              <div ref={el => { memberRefs.current[`member-${spouse.id}`] = el; }}>
                <MemberCard 
                  member={spouse} 
                  isSelected={selectedMemberId === spouse.id}
                  financials={getMemberFinancials(spouse.id)}
                  readOnly={readOnly}
                  onSelectMember={onSelectMember}
                  onEditMember={onEditMember}
                  onDeleteMember={onDeleteMember}
                  formatCurrency={formatCurrency}
                />
              </div>
            ) : (
              !readOnly && (
                <Button 
                  variant="outline" 
                  className="w-56 h-48 border-dashed border-2 flex flex-col gap-4 rounded-[2.5rem] bg-slate-50 hover:bg-slate-100 hover:border-primary/50 transition-all group shadow-sm border-slate-200"
                  onClick={() => onAddMember("Spouse")}
                >
                  <div className="p-5 bg-white group-hover:bg-primary/10 group-hover:text-primary rounded-2xl transition-all shadow-sm text-slate-300 border border-slate-100"><Plus size={28} /></div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 group-hover:text-primary">Add Spouse</span>
                </Button>
              )
            )}
          </div>

          <div className="flex gap-8 md:gap-16">
            {children.map(c => (
              <div key={c.id} ref={el => { memberRefs.current[`member-${c.id}`] = el; }}>
                <MemberCard 
                  member={c} 
                  isSelected={selectedMemberId === c.id}
                  financials={getMemberFinancials(c.id)}
                  readOnly={readOnly}
                  onSelectMember={onSelectMember}
                  onEditMember={onEditMember}
                  onDeleteMember={onDeleteMember}
                  formatCurrency={formatCurrency}
                />
              </div>
            ))}
            {!readOnly && (
              <div ref={el => { memberRefs.current["add-child"] = el; }}>
                <Button 
                  variant="outline" 
                  className="w-56 h-48 border-dashed border-2 flex flex-col gap-4 rounded-[2.5rem] bg-slate-50 hover:bg-slate-100 hover:border-primary/50 transition-all group shadow-sm border-slate-200"
                  onClick={() => onAddMember("Child")}
                >
                  <div className="p-5 bg-white group-hover:bg-primary/10 group-hover:text-primary rounded-2xl transition-all shadow-sm text-slate-300 border border-slate-100"><Plus size={28} /></div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 group-hover:text-primary">Add Lineage</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface FamilyTreeProps {
  client: { id: number; name: string };
  familyMembers: FamilyMember[];
  onAddMember: (relation?: "Parent" | "Spouse" | "Child") => void;
  onEditMember: (member: FamilyMember) => void;
  onDeleteMember: (id: number) => void;
  onSelectMember: (member: FamilyMember | null) => void;
  selectedMemberId?: number | null;
  assets: Asset[];
  liabilities: Liability[];
  readOnly?: boolean;
}
