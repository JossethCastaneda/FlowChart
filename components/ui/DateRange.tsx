import React from "react";
import { Icon } from "./Icon";

export interface DateRangeProps {
  from: string | Date;
  to: string | Date;
  compare?: string | Date;
  className?: string;
}

export const DateRange: React.FC<DateRangeProps> = ({ from, to, compare, className = "" }) => {
  const formatDate = (date: string | Date) => {
    if (typeof date === "string") return date;
    return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className={`fc-daterange ${className}`}>
      <Icon name="rango" size={16} className="fc-daterange-icon" />
      <span className="fc-daterange-text">
        {formatDate(from)} - {formatDate(to)}
      </span>
      {compare && (
        <span className="fc-daterange-compare">
          vs {formatDate(compare)}
        </span>
      )}
    </div>
  );
};
