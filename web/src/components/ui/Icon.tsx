interface IconProps {
  name: string
  className?: string
  filled?: boolean
  style?: React.CSSProperties
}

export function Icon({ name, className = "", filled = false, style }: IconProps) {
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
  }

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
    >
      {name}
    </span>
  )
}
