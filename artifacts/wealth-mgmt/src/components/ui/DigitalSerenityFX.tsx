import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const DigitalSerenityFX: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, opacity: 0 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY, opacity: 1 });
    };
    const handleMouseLeave = () => {
      setMousePos((prev) => ({ ...prev, opacity: 0 }));
    };
    const handleClick = (e: MouseEvent) => {
      const id = Date.now();
      setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Mouse Gradient Glow */}
      <div
        id="mouse-gradient-react"
        style={{
          position: "fixed",
          left: mousePos.x,
          top: mousePos.y,
          opacity: mousePos.opacity * 0.15,
          background: "radial-gradient(circle, rgba(201, 168, 76, 0.4), transparent 70%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(100px)",
          transition: "opacity 0.5s ease",
        }}
      />

      {/* Ripple Effects */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: ripple.x,
              top: ripple.y,
              width: "100px",
              height: "100px",
              margin: "-50px 0 0 -50px",
              border: "1px solid rgba(201, 168, 76, 0.3)",
              borderRadius: "50%",
              zIndex: 0,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Corner Brackets */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5, duration: 1 }}
        className="absolute inset-8 border-l border-t border-gold/15 w-12 h-12"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5, duration: 1 }}
        className="absolute right-8 top-8 border-r border-t border-gold/15 w-12 h-12"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5, duration: 1 }}
        className="absolute left-8 bottom-8 border-l border-b border-gold/15 w-12 h-12"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5, duration: 1 }}
        className="absolute right-8 bottom-8 border-r border-b border-gold/15 w-12 h-12"
      />

      {/* SVG Grid Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path
              d="M 100 0 L 0 0 0 100"
              fill="none"
              stroke="rgba(201, 168, 76, 0.4)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
};
