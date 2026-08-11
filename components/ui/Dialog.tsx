"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children, title, description }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fc-dialog-overlay" onClick={onClose}>
      <div className="fc-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="fc-dialog-header">
          {title && <h3 className="fc-dialog-title">{title}</h3>}
          {description && <p className="fc-dialog-description">{description}</p>}
        </div>
        <div className="fc-dialog-content">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
