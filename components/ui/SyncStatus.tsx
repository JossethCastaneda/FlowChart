import React from "react";
import { Icon } from "./Icon";

export type SyncStatusType = "syncing" | "success" | "error" | "offline";

export interface SyncStatusProps {
  status: SyncStatusType;
  time?: string;
  className?: string;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ status, time, className = "" }) => {
  return (
    <div className={`fc-sync-status fc-sync-status--${status} ${className}`}>
      {status === "syncing" && <Icon name="integracion" size={14} className="fc-sync-icon-spin" />}
      {status === "success" && <Icon name="verificado" size={14} />}
      {status === "error" && <Icon name="alerta" size={14} />}
      {status === "offline" && <Icon name="alerta" size={14} />}
      
      <span className="fc-sync-text">
        {status === "syncing" && "Sincronizando..."}
        {status === "success" && `Actualizado ${time}`}
        {status === "error" && "Error de sincronización"}
        {status === "offline" && "Sin conexión"}
      </span>
    </div>
  );
};
