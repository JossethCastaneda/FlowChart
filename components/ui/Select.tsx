import React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  loading?: boolean;
  error?: boolean;
  blocked?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", loading, error, blocked, disabled, children, ...props }, ref) => {
    
    const isDisabled = blocked || disabled || loading;
    
    let selectClass = "fc-input fc-select";
    
    if (error) {
      selectClass += " fc-input--error";
    }
    
    if (className) {
      selectClass += ` ${className}`;
    }

    if (loading) {
      return (
        <div className={`fc-input fc-input--loading ${className}`}>
          <div className="fc-skeleton-rect" style={{ width: "100%", height: "16px", borderRadius: "4px" }} />
        </div>
      );
    }

    return (
      <select
        ref={ref}
        disabled={isDisabled}
        className={`${selectClass}${blocked ? " fc-input--blocked" : ""}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
