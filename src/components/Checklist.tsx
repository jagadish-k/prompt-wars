import { useState } from 'react'
import { Checkbox } from '@heroui/react'
import type { PlanChecklistItem } from '@/lib/types'

// Each checklist tracks its own checked state locally (client-only). Gemini's
// schema omits `done`, so every item starts unchecked and the user ticks them
// off. State is keyed by item id to stay stable across re-renders.
export function Checklist({ items }: { items: PlanChecklistItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, false])),
  )

  if (!items.length) return null

  return (
    <ul className="grid gap-1">
      {items.map((i) => (
        <li key={i.id}>
          <Checkbox
            id={i.id}
            isSelected={checked[i.id] ?? false}
            onChange={(sel: boolean) => setChecked((s) => ({ ...s, [i.id]: sel }))}
            className="min-h-12 items-start py-1"
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {i.label}
            </Checkbox.Content>
          </Checkbox>
        </li>
      ))}
    </ul>
  )
}
