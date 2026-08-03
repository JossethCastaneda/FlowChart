"use client";

import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search, FolderKanban, Users, Settings, Inbox, LayoutDashboard } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { useSession } from "next-auth/react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 bg-[var(--panel-bg)]  " onClick={() => setOpen(false)}>
      <div 
        className="glass-panel w-full max-w-xl mx-4 overflow-hidden rounded-lg border-2 border-cyan/30 shadow-2xl shadow-cyan/20"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full bg-transparent text-foreground">
          <div className="flex items-center border-b border-border px-4 py-3">
            <Search className="w-5 h-5 text-cyan mr-3" />
            <Command.Input 
              placeholder="Escribe un comando o busca algo..." 
              className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-text-muted"
              autoFocus
            />
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-text-muted">No se encontraron resultados.</Command.Empty>

            <Command.Group heading="Navegación Rápida" className="text-xs font-semibold text-text-muted px-2 py-1 uppercase tracking-wider">
              <Command.Item 
                onSelect={() => { router.push("/dashboard/resumen"); setOpen(false); }}
                className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer hover:bg-cyan/10 hover:text-cyan aria-selected:bg-cyan/10 aria-selected:text-cyan"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Resumen (Dashboard)
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/proyectos"); setOpen(false); }}
                className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer hover:bg-cyan/10 hover:text-cyan aria-selected:bg-cyan/10 aria-selected:text-cyan"
              >
                <FolderKanban className="w-4 h-4 mr-2" /> Proyectos Activos
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/inbox"); setOpen(false); }}
                className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer hover:bg-cyan/10 hover:text-cyan aria-selected:bg-cyan/10 aria-selected:text-cyan"
              >
                <Inbox className="w-4 h-4 mr-2" /> Inbox de Conversaciones
              </Command.Item>
            </Command.Group>

            <Command.Separator className="h-px bg-border my-2" />

            <Command.Group heading="Administración" className="text-xs font-semibold text-text-muted px-2 py-1 uppercase tracking-wider">
              <Command.Item 
                onSelect={() => { router.push("/dashboard/integraciones"); setOpen(false); }}
                className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer hover:bg-cyan/10 hover:text-cyan aria-selected:bg-cyan/10 aria-selected:text-cyan"
              >
                <Settings className="w-4 h-4 mr-2" /> Integraciones (Meta, Google)
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/miembros"); setOpen(false); }}
                className="flex items-center px-3 py-2 mt-1 rounded-md cursor-pointer hover:bg-cyan/10 hover:text-cyan aria-selected:bg-cyan/10 aria-selected:text-cyan"
              >
                <Users className="w-4 h-4 mr-2" /> Miembros de Equipo
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
