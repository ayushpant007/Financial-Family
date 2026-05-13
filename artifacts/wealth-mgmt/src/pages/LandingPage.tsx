import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AuroraHero } from "@/components/ui/futurastic-hero-section";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setLocation(user.role === "admin" ? "/admin/dashboard" : "/client/dashboard");
    }
  }, [user, setLocation]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AuroraHero onCTAClick={() => setLocation("/login")} />
    </motion.div>
  );
}
