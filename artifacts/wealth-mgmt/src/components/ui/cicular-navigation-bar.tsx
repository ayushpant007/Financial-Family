"use client";
 
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
 
interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  onClick?: () => void;
}
 
interface CircularNavigationProps {
  navItems: NavItem[];
  isOpen: boolean;
  toggleMenu: () => void;
}
 
export default function CircularNavigation({
  navItems,
  isOpen,
  toggleMenu,
}: CircularNavigationProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
 
  if (typeof window === "undefined" || !isOpen) return null;
 
  return createPortal(
    <div 
      className="fixed inset-0 w-screen h-screen bg-slate-950 flex items-center justify-center z-[99999]"
      onClick={toggleMenu}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="relative aspect-square w-[340px] sm:w-[380px] max-w-[90vw] max-h-[90vh] rounded-full flex items-center justify-center"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow:
            "inset 2px 2px 2px rgba(255,255,255,0.5), inset -1px -1px 1px rgba(255,255,255,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={toggleMenu}
          className="absolute aspect-square flex items-center justify-center w-11 h-11 rounded-full bg-white text-black z-10 cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
 
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const angle = (360 / navItems.length) * index;
 
          return (
            <div
              key={item.name}
              className="absolute"
              style={{
                transform: `rotate(${angle}deg) translate(115px) rotate(-${angle}deg)`,
              }}
            >
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center w-18 h-18 aspect-square rounded-full transition-colors duration-200 no-decoration ${
                  hoveredItem === item.name
                    ? "bg-white text-black"
                    : "text-white"
                }`}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  toggleMenu();
                }}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span
                  className="text-[10px] font-semibold text-center leading-none"
                  style={{ textDecoration: "none" }}
                >
                  {item.name}
                </span>
              </Link>
            </div>
          );
        })}
      </motion.div>
    </div>,
    document.body
  );
}
