import React from "react";

export interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  loading?: boolean;
  error?: boolean;
  blocked?: boolean;
}

export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className = "", loading, error, blocked, disabled, ...props }, ref) => {
    
    const isDisabled = blocked || disabled || loading;
    
    let toggleClass = "fc-toggle";
    
    if (error) {
      toggleClass += " fc-toggle--error";
    }
    
    if (className) {
      toggleClass += ` ${className}`;
    }

    if (loading) {
      return (
        <div className={`fc-toggle fc-toggle--loading ${className}`}>
          <div className="fc-skeleton-rect" style={{ width: "36px", height: "20px", borderRadius: "10px" }} />
        </div>
      );
    }

    return (
      <label className={`fc-toggle-wrapper${blocked ? " fc-toggle--blocked" : ""}`}>
        <input
          type="checkbox"
          ref={ref}
          disabled={isDisabled}
          className="fc-toggle-input"
          {...props}
        />
        <div className={toggleClass}>
          <div className="fc-toggle-thumb" />
        </div>
      </label>
    );
  }
);
Toggle.displayName = "Toggle";
