import React from "react";
import { Icon } from "./Icon";

export interface MetricProps {
  title: string;
  value?: string | number;
  delta?: {
    value: string;
    trend: "up" | "down" | "neutral";
    text?: string;
  };
  loading?: boolean;
  error?: string;
  blocked?: string;
  empty?: boolean;
  className?: string;
}

export const Metric: React.FC<MetricProps> = ({
  title,
  value,
  delta,
  loading,
  error,
  blocked,
  empty,
  className = "",
}) => {
  let wrapperClass = `fc-metric ${className}`;
  if (blocked) wrapperClass += " fc-metric--blocked";

  if (loading) {
    return (
      <div className={wrapperClass}>
        <div className="fc-metric-title">{title}</div>
        <div className="fc-skeleton-rect" style={{ width: "55%", height: "8px", borderRadius: "4px", marginTop: "12px" }} />
        <div className="fc-skeleton-rect" style={{ width: "72%", height: "22px", borderRadius: "6px", marginTop: "12px" }} />
        <div className="fc-skeleton-rect" style={{ width: "45%", height: "8px", borderRadius: "4px", marginTop: "auto" }} />
      </div>
    );
  }

  if (empty) {
    return (
      <div className={wrapperClass}>
        <div className="fc-metric-title">{title}</div>
        <div className="fc-metric-value fc-metric-value--empty">—</div>
        <div className="fc-metric-empty-text">Sin datos en este rango.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={wrapperClass}>
        <div className="fc-metric-title">{title}</div>
        <div className="fc-metric-value fc-metric-value--empty">—</div>
        <div className="fc-metric-error">
          <Icon name="alerta" size={12} className="fc-metric-error-icon" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className="fc-metric-title">{title}</div>
      <div className={`fc-metric-value ${blocked ? "fc-metric-value--blocked" : ""}`}>
        {value}
      </div>
      
      {blocked ? (
        <div className="fc-metric-blocked-text">{blocked}</div>
      ) : delta ? (
        <div className={`fc-metric-delta fc-metric-delta--${delta.trend}`}>
          {delta.trend === "up" && <Icon name="subida" size={10} />}
          {delta.trend === "down" && <Icon name="bajada" size={10} />}
          {delta.trend === "neutral" && <span>&bull;</span>}
          <span>{delta.value} {delta.text}</span>
        </div>
      ) : null}
    </div>
  );
};
