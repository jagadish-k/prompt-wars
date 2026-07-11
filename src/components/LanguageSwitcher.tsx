import { useTranslation } from 'react-i18next'
import { Button, Dropdown, Label, type Selection } from '@heroui/react'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = LANGS.find((l) => l.code === i18n.language)?.label ?? 'English'
  const selectedKeys: Selection = new Set([i18n.language])

  return (
    <Dropdown>
      <Button variant="secondary" aria-label="Select language">
        {current}
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={selectedKeys}
          onAction={(key) => {
            if (typeof key === 'string') void i18n.changeLanguage(key)
          }}
        >
          {LANGS.map((lang) => (
            <Dropdown.Item key={lang.code} id={lang.code} textValue={lang.label}>
              <Dropdown.ItemIndicator />
              <Label>{lang.label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
