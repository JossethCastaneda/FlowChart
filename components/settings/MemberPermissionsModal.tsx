"use client";

import { useState } from "react";
import { X, Shield, Eye, Pencil, Loader2 } from "lucide-react";

export interface ModuleAccess {
  view: boolean;
  edit: boolean;
}

export interface MemberPermissions {
  ops: ModuleAccess;
  publisher: ModuleAccess;
  inbox: ModuleAccess;
  ads: ModuleAccess;
  analytics: ModuleAccess;
  briefing: ModuleAccess;
}

const DEFAULT_PERMS: MemberPermissions = {
  ops: { view: true, edit: true },
  publisher: { view: true, edit: true },
  inbox: { view: true, edit: true },
  ads: { view: true, edit: true },
  analytics: { view: true, edit: true },
  briefing: { view: true, edit: true },
};

const MODULES: { key: keyof MemberPermissions; label: string }[] = [
  { key: "ops", label: "Ops (Gestión)" },
  { key: "publisher", label: "Publisher" },
  { key: "inbox", label: "Inbox" },
  { key: "ads", label: "Ads Manager" },
  { key: "analytics", label: "Analytics" },
  { key: "briefing", label: "Briefing" },
];

interface Props {
  memberId: string;
  memberName: string;
  initialPerms: MemberPermissions | null;
  onClose: () => void;
  onSave: (memberId: string, perms: MemberPermissions | null) => Promise<void>;
}

export function MemberPermissionsModal({ memberId, memberName, initialPerms, onClose, onSave }: Props) {
  // If no granular perms exist, we start with defaults but track that it's "inherited/default"
  const [useCustom, setUseCustom] = useState<boolean>(initialPerms !== null);
  const [perms, setPerms] = useState<MemberPermissions>(
    initialPerms || { ...DEFAULT_PERMS }
  );
  const [saving, setSaving] = useState(false);

  const toggleView = (mod: keyof MemberPermissions) => {
    setPerms((prev) => {
      const next = { ...prev, [mod]: { ...prev[mod], view: !prev[mod].view } };
      // If view is disabled, edit must be disabled too
      if (!next[mod].view) next[mod].edit = false;
      return next;
    });
  };

  const toggleEdit = (mod: keyof MemberPermissions) => {
    setPerms((prev) => {
      const next = { ...prev, [mod]: { ...prev[mod], edit: !prev[mod].edit } };
      // If edit is enabled, view must be enabled too
      if (next[mod].edit) next[mod].view = true;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(memberId, useCustom ? perms : null);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#0b0e14] border border-[#1e293b] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-[15px]">
            <Shield className="w-5 h-5 text-[#00d4ff]" />
            Permisos de {memberName}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto max-h-[70vh]">
          <p className="text-[13px] text-slate-400 mb-6">
            Configura los permisos específicos de visualización y edición por cada módulo. 
            Estos permisos sobrescribirán la configuración predeterminada del área.
          </p>

          <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-colors mb-6">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="accent-[#00d4ff] w-4 h-4"
            />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-slate-200">
                Usar permisos personalizados
              </div>
              <div className="text-[11px] text-slate-500">
                Si está desactivado, usará los permisos de su área o por defecto.
              </div>
            </div>
          </label>

          <div className={`space-y-3 ${!useCustom ? "opacity-40 pointer-events-none" : ""}`}>
            {MODULES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="text-[13px] font-medium text-slate-300">{label}</div>
                <div className="flex items-center gap-4">
                  {/* Toggle Ver */}
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Ver
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleView(key)}
                      className="w-7 h-4 rounded-full relative transition-colors"
                      style={{ background: perms[key].view ? "#00d4ff" : "rgba(255,255,255,0.1)" }}
                    >
                      <span
                        className="absolute top-[2px] w-3 h-3 rounded-full bg-white transition-all"
                        style={{ left: perms[key].view ? 14 : 2 }}
                      />
                    </button>
                  </label>

                  {/* Toggle Editar */}
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Editar
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleEdit(key)}
                      className="w-7 h-4 rounded-full relative transition-colors"
                      style={{ background: perms[key].edit ? "#06d6a0" : "rgba(255,255,255,0.1)" }}
                    >
                      <span
                        className="absolute top-[2px] w-3 h-3 rounded-full bg-white transition-all"
                        style={{ left: perms[key].edit ? 14 : 2 }}
                      />
                    </button>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-end gap-3 bg-black/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-slate-300 hover:text-white bg-transparent rounded-lg hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-black bg-[#00d4ff] hover:bg-[#00b0d4] rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Guardar Permisos
          </button>
        </div>
      </div>
    </div>
  );
}
