// Severity → color. Keys mirror `WeatherAlert['severity']` values produced by
// normalizeWeather ('minor' | 'moderate' | 'severe' | 'extreme'); unknown
// severities fall back to gray.
const COLORS: Record<string, string> = {
  minor: 'bg-yellow-500',
  moderate: 'bg-orange-500',
  severe: 'bg-red-600',
  extreme: 'bg-purple-700',
}

export function RiskChip({ severity, label }: { severity: string; label: string }) {
  return (
    <span
      className={`min-h-8 inline-flex items-center rounded px-2 py-1 text-xs font-medium text-white ${COLORS[severity] ?? 'bg-gray-500'}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </span>
  )
}
