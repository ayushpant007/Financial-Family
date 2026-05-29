"use client";

import * as React from "react";
import { useState, useRef, useLayoutEffect, useCallback } from "react";

export interface TabItem {
  label: string;
  icon: React.ReactNode;
  color: string;
  count?: number;
}

export interface AnimatedTabBarProps {
  items: TabItem[];
  defaultIndex?: number;
  onTabChange?: (index: number) => void;
}

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  items,
  defaultIndex = 0,
  onTabChange,
}) => {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const menuRef = useRef<HTMLElement>(null);
  const menuBorderRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const offsetMenuBorder = useCallback(() => {
    const activeItem = itemRefs.current[activeIndex];
    const menu = menuRef.current;
    const menuBorder = menuBorderRef.current;

    if (activeItem && menu && menuBorder) {
      const offsetActiveItem = activeItem.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const left = Math.floor(
        offsetActiveItem.left -
          menuRect.left -
          (menuBorder.offsetWidth - offsetActiveItem.width) / 2
      );
      menuBorder.style.transform = `translate3d(${left}px, 0, 0)`;
    }
  }, [activeIndex]);

  useLayoutEffect(() => {
    offsetMenuBorder();
    const handleResize = () => {
      if (menuRef.current) {
        menuRef.current.style.setProperty("--timeOut", "none");
      }
      offsetMenuBorder();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [offsetMenuBorder]);

  const handleItemClick = (index: number) => {
    if (menuRef.current) {
      menuRef.current.style.removeProperty("--timeOut");
    }
    if (activeIndex === index) return;
    setActiveIndex(index);
    onTabChange?.(index);
  };

  // Sync external defaultIndex changes
  React.useEffect(() => {
    setActiveIndex(defaultIndex);
  }, [defaultIndex]);

  return (
    <div className="asset-tab-bar-wrapper">
      <nav className="asset-tab-menu" ref={menuRef}>
        {items.map((item, index) => (
          <button
            key={index}
            ref={(el) => { itemRefs.current[index] = el; }}
            className={`asset-tab-item ${activeIndex === index ? "active" : ""}`}
            style={{ "--tab-color": item.color } as React.CSSProperties}
            onClick={() => handleItemClick(index)}
            aria-label={item.label}
            title={item.label}
          >
            <span className="asset-tab-icon">{item.icon}</span>
            <span className="asset-tab-label">{item.label}</span>
            {item.count !== undefined && (
              <span
                className="asset-tab-count"
                style={{ backgroundColor: item.color }}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
        <div className="asset-tab-border" ref={menuBorderRef} />
      </nav>
    </div>
  );
};
