import React from "react";

export type Channel = "meta" | "google" | "tiktok" | "other";

export interface ChannelBadgeProps {
  channel: Channel;
  name: string;
  amount?: string;
  className?: string;
}

const channelColors: Record<Channel, string> = {
  meta: "#0866FF",
  google: "#4285F4",
  tiktok: "#FE2C55",
  other: "var(--fc-text-secondary)",
};

export const ChannelBadge: React.FC<ChannelBadgeProps> = ({ channel, name, amount, className = "" }) => {
  return (
    <div className={`fc-channel-badge ${className}`}>
      <div 
        className="fc-channel-dot" 
        style={{ backgroundColor: channelColors[channel] || channelColors.other }} 
      />
      <div className="fc-channel-name">{name}</div>
      {amount && <div className="fc-channel-amount">{amount}</div>}
    </div>
  );
};
