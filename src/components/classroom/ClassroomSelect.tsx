'use client'

import {
  Children,
  isValidElement,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'
import { ClassroomMenuSelect, type ClassroomMenuOption } from './ClassroomMenuSelect'

const variantClasses = {
  inline:
    'min-h-0 rounded-sm bg-transparent px-0 py-0 text-sm font-semibold text-slate-700',
  field:
    'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700',
  filter:
    'min-h-0 cursor-pointer rounded-sm bg-transparent px-0 py-0 text-sm font-bold text-slate-800',
} as const

export type ClassroomSelectVariant = keyof typeof variantClasses

export interface ClassroomSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  variant?: ClassroomSelectVariant
}

function textFromNode(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textFromNode).join('')
  if (isValidElement(node) && node.props && typeof node.props === 'object' && 'children' in node.props) {
    return textFromNode((node.props as { children?: ReactNode }).children)
  }
  return ''
}

function optionsFromChildren(children: ReactNode): ClassroomMenuOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== 'option') return []
    const props = child.props as { value?: string | number; children?: ReactNode }
    const value = String(props.value ?? '')
    return [{
      value,
      label: textFromNode(props.children) || value,
    }]
  })
}

export function ClassroomSelect({
  variant = 'inline',
  className,
  children,
  value,
  onChange,
  disabled,
  id,
  'aria-label': ariaLabel,
}: ClassroomSelectProps) {
  const options = optionsFromChildren(children)
  const stringValue = value == null ? '' : String(value)

  return (
    <ClassroomMenuSelect
      id={id}
      value={stringValue}
      disabled={disabled}
      aria-label={ariaLabel ?? 'Chọn'}
      options={options}
      className={variant === 'field' ? 'w-full' : undefined}
      triggerClassName={cn(variantClasses[variant], className)}
      onChange={(next) => {
        onChange?.({
          target: { value: next },
          currentTarget: { value: next },
        } as ChangeEvent<HTMLSelectElement>)
      }}
    />
  )
}
