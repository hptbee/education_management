'use client'

interface EmojiIconPickerProps {
  value: string
  onChange: (icon: string) => void
  options: string[]
  label?: string
  allowCustom?: boolean
}

export function EmojiIconPicker({
  value,
  onChange,
  options,
  label = 'Biểu tượng',
  allowCustom = true,
}: EmojiIconPickerProps) {
  const uniqueOptions = [...new Set([value, ...options].filter(Boolean))]

  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-slate-700">{label}</label>
      <div className="grid grid-cols-8 gap-1.5">
        {uniqueOptions.map((emoji) => {
          const isSelected = value === emoji
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              title={emoji}
              className={`flex size-10 items-center justify-center rounded-xl border-2 text-xl transition hover:border-brand-purple/40 ${
                isSelected
                  ? 'border-brand-purple bg-brand-purple/10 shadow-sm'
                  : 'border-transparent bg-slate-50 hover:bg-slate-100'
              }`}
            >
              {emoji}
            </button>
          )
        })}
      </div>

      {allowCustom ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-3xl">
            {value || '❓'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold text-slate-500">Hoặc nhập emoji khác</p>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              maxLength={4}
              placeholder="Emoji..."
              className="w-full max-w-[120px] rounded-xl border border-slate-200 px-3 py-2 text-center text-2xl outline-none focus:border-brand-purple"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
