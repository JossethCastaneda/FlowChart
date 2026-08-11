import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: string;
  variant?: ButtonVariant;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  blocked?: boolean; // mapped to disabled
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", loading, error, empty, blocked, children, disabled, ...props }, ref) => {
    
    const isDisabled = blocked || disabled || loading;
    
    // Base class
    let btnClass = "fc-btn";
    
    // Variant
    if (variant) {
      btnClass += ` fc-btn--${variant}`;
    }

    if (className) {
      btnClass += ` ${className}`;
    }

    // Five states logic
    if (loading) {
      return (
        <button ref={ref} disabled className={`${btnClass} fc-btn--loading`} {...props}>
          <div className="fc-skeleton-rect" style={{ width: "100%", height: "8px", borderRadius: "4px" }} />
        </button>
      );
    }

    if (empty) {
      return (
        <button ref={ref} disabled className={`${btnClass} fc-btn--empty`} {...props}>
          —
        </button>
      );
    }

    if (error) {
      return (
        <button ref={ref} disabled className={`${btnClass} fc-btn--error`} {...props}>
          Error
        </button>
      );
    }

    return (
      <button 
        ref={ref} 
        disabled={isDisabled} 
        className={`${btnClass}${blocked ? " fc-btn--blocked" : ""}`} 
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
