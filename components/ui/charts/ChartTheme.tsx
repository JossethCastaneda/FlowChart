/**
 * ChartTheme — Sodare 1A Comando standard SVG defs
 * Use inside any Recharts <defs> block via <ChartTheme />
 */
export function ChartTheme() {
  return (
    <defs>
      {/* ── Area gradients ── */}
      <linearGradient id="colorCyanArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.30} />
        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorEmeraldArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  stopColor="#06d6a0" stopOpacity={0.28} />
        <stop offset="95%" stopColor="#06d6a0" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorAmberArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  stopColor="#ffbe0b" stopOpacity={0.28} />
        <stop offset="95%" stopColor="#ffbe0b" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorPurpleArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  stopColor="#7b61ff" stopOpacity={0.28} />
        <stop offset="95%" stopColor="#7b61ff" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorRedArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  stopColor="#ff2d55" stopOpacity={0.28} />
        <stop offset="95%" stopColor="#ff2d55" stopOpacity={0} />
      </linearGradient>

      {/* ── Bar gradients ── */}
      <linearGradient id="colorCyanBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#00d4ff" />
        <stop offset="100%" stopColor="#0064E0" />
      </linearGradient>
      <linearGradient id="colorEmeraldBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#06d6a0" />
        <stop offset="100%" stopColor="#059e74" />
      </linearGradient>
      <linearGradient id="colorAmberBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#ffbe0b" />
        <stop offset="100%" stopColor="#d99f00" />
      </linearGradient>
      <linearGradient id="colorPurpleBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#7b61ff" />
        <stop offset="100%" stopColor="#5c47d6" />
      </linearGradient>
      <linearGradient id="colorRedBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#ff2d55" />
        <stop offset="100%" stopColor="#d61f42" />
      </linearGradient>

      {/* ── Glow filter (subtle, for line charts) ── */}
      <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );
}
