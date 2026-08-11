import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  loading?: boolean;
  error?: boolean;
  blocked?: boolean; // mapped to disabled + opacity
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", loading, error, blocked, disabled, ...props }, ref) => {
    
    const isDisabled = blocked || disabled || loading;
    
    let inputClass = "fc-input";
    
    if (error) {
      inputClass += " fc-input--error";
    }
    
    if (className) {
      inputClass += ` ${className}`;
    }

    if (loading) {
      return (
        <div className={`fc-input fc-input--loading ${className}`}>
          <div className="fc-skeleton-rect" style={{ width: "100%", height: "16px", borderRadius: "4px" }} />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        disabled={isDisabled}
        className={`${inputClass}${blocked ? " fc-input--blocked" : ""}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
