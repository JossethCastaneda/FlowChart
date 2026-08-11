import React from "react";

export type TagVariant = "default" | "success" | "warning" | "danger" | "accent";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  loading?: boolean;
  error?: boolean;
  blocked?: boolean;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className = "", variant = "default", loading, error, blocked, children, ...props }, ref) => {
    
    let tagClass = "fc-tag";
    
    if (variant !== "default") {
      tagClass += ` fc-tag--${variant}`;
    }
    
    if (error) {
      tagClass += " fc-tag--error";
    }
    
    if (className) {
      tagClass += ` ${className}`;
    }

    if (loading) {
      return (
        <span className={`fc-tag fc-tag--loading ${className}`}>
          <div className="fc-skeleton-rect" style={{ width: "40px", height: "12px", borderRadius: "2px" }} />
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={`${tagClass}${blocked ? " fc-tag--blocked" : ""}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Tag.displayName = "Tag";
