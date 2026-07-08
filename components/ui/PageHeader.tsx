"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  iconColor?: string;
}

export function PageHeader({ title, description, subtitle, icon, action, iconColor }: PageHeaderProps) {
  if (!action) return null;
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 mb-2 page-enter relative z-40">
      <div className="flex items-center gap-2">{action}</div>
    </div>
  );
}
