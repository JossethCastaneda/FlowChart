/**
 * SIcon - Zefirus Standard Icon Wrapper
 * Brand Guide: Lucide - strokeWidth 1.75 - sizes 18px (nav) / 20px (content)
 *
 * Usage:
 *   import { SIcon } from "@/components/ui/SIcon"
 *   import { LayoutDashboard } from "lucide-react"
 *   <SIcon icon={LayoutDashboard} />           // 18px, strokeWidth 1.75
 *   <SIcon icon={LayoutDashboard} size={20} /> // 20px en contenido
 */

import { type LucideIcon } from "lucide-react"

interface SIconProps {
  icon: LucideIcon
  size?: number
  strokeWidth?: number
  className?: string
  color?: string
  style?: React.CSSProperties
}

export function SIcon({
  icon: Icon,
  size = 18,
  strokeWidth = 1.75,
  className,
  color,
  style,
}: SIconProps) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      color={color}
      style={style}
    />
  )
}

