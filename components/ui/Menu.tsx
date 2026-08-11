"use client";
import React, { useState, useRef, useEffect } from "react";

export interface MenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}

export const Menu: React.FC<MenuProps> = ({ trigger, children, align = "left" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="fc-menu-wrapper" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className={`fc-menu fc-menu--${align}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export const MenuItem: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = "", ...props }) => (
  <button className={`fc-menu-item ${className}`} {...props}>
    {children}
  </button>
);
