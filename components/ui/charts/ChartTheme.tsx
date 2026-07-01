export function ChartTheme() {
  return (
    <defs>
      {/* Primary Purple Area Gradient */}
      <linearGradient id="colorPurpleArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
      </linearGradient>

      {/* Emerald Green Area Gradient */}
      <linearGradient id="colorEmeraldArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
      </linearGradient>

      {/* Cyan Area Gradient */}
      <linearGradient id="colorCyanArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
      </linearGradient>

      {/* Amber Area Gradient */}
      <linearGradient id="colorAmberArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
      </linearGradient>

      {/* Solid Purple Bar Gradient (Pill shape) */}
      <linearGradient id="colorPurpleBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#6D28D9" />
      </linearGradient>

      {/* Subtle Glow Filter */}
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );
}
