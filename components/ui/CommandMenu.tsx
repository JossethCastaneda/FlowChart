"use client";

import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { createPortal } from "react-dom";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", down);
    }
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fc-dialog-overlay" onClick={() => setOpen(false)}>
      <div 
        className="fc-command-menu"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="fc-cmd-root" label="Global Command Menu">
          <div className="fc-cmd-input-wrapper">
            <Icon name="buscar" size={16} className="fc-cmd-search-icon" />
            <Command.Input 
              placeholder="Buscar comandos, usuarios o flujos..." 
              className="fc-cmd-input"
              autoFocus
            />
          </div>
          
          <Command.List className="fc-cmd-list">
            <Command.Empty className="fc-cmd-empty">No se encontraron resultados.</Command.Empty>

            <Command.Group heading="Navegación" className="fc-cmd-group">
              <Command.Item 
                onSelect={() => { router.push("/dashboard/resumen"); setOpen(false); }}
                className="fc-cmd-item"
              >
                <Icon name="reportes" size={16} /> Resumen
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/flujos"); setOpen(false); }}
                className="fc-cmd-item"
              >
                <Icon name="flujo" size={16} /> Flujos de trabajo
              </Command.Item>
            </Command.Group>
            
            <Command.Group heading="Configuración" className="fc-cmd-group">
              <Command.Item 
                onSelect={() => { router.push("/dashboard/ajustes"); setOpen(false); }}
                className="fc-cmd-item"
              >
                <Icon name="ajustes" size={16} /> Ajustes
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>,
    document.body
  );
}
