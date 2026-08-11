"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  ariaLabel?: string;
  position?: "right" | "left" | "bottom";
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, children, title, description, ariaLabel, position = "right", className = "" }) => {
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Portal mounting is an external DOM readiness boundary for SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    if (isOpen && mounted) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusFrame = requestAnimationFrame(() => (focusable || panelRef.current)?.focus());
      return () => {
        cancelAnimationFrame(focusFrame);
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = previousOverflow;
        if (isOpen && mounted) previouslyFocused?.focus();
      };
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (isOpen && mounted) previouslyFocused?.focus();
    };
  }, [isOpen, mounted]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={`fc-dialog-overlay ${className}`.trim()} onClick={() => onCloseRef.current()}>
      <div ref={panelRef} className={`fc-sheet fc-sheet--${position}`} role="dialog" aria-modal="true" aria-label={ariaLabel} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
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
