"use client";
 
import { useState } from "react";
import CircularNavigation from "@/components/ui/cicular-navigation-bar";
import {
  Home,
  Film,
  Music,
  Trophy,
  FileText,
  Settings,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
 
const navItems = [
  { name: "Home", icon: Home, href: "/" },
  { name: "Movies", icon: Film, href: "/movies" },
  { name: "Music", icon: Music, href: "/music" },
  { name: "Sports", icon: Trophy, href: "/sports" },
  { name: "News", icon: FileText, href: "/news" },
  { name: "Settings", icon: Settings, href: "/settings" },
  { name: "Search", icon: Search, href: "/search" },
];
 
export default function CircularNav() {
  const [isOpen, setIsOpen] = useState(false);
 
  const toggleMenu = () => setIsOpen(!isOpen);
 
  return (
    <>
      <div className="h-screen w-full flex items-center justify-center">
        <Button onClick={toggleMenu}>Open Navigation</Button>
      </div>
      <CircularNavigation
        navItems={navItems}
        isOpen={isOpen}
        toggleMenu={toggleMenu}
      />
    </>
  );
}
