import type { ComponentProps, ReactNode } from 'react'
import { Button as PrimitiveButton } from './ui/button'
import { Input as PrimitiveInput } from './ui/input'
import { Card as PrimitiveCard } from './ui/card'
import { Badge as PrimitiveBadge } from './ui/badge'
import { ToggleGroup as PrimitiveToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import { cn } from '@/lib/utils'

export function Button({ className, ...props }: ComponentProps<typeof PrimitiveButton>) {
  return <PrimitiveButton className={cn('button', className)} {...props} />
}
export function IconButton({ label, children, className, ...props }: ComponentProps<typeof PrimitiveButton> & { label: string; children: ReactNode }) {
  return <PrimitiveButton variant="ghost" size="icon" className={cn('icon-button', className)} aria-label={label} title={label} {...props}>{children}</PrimitiveButton>
}
export function Input({ className, ...props }: ComponentProps<typeof PrimitiveInput>) {
  return <PrimitiveInput className={cn('input', className)} {...props} />
}
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <PrimitiveCard className={cn('card', className)}>{children}</PrimitiveCard>
}
export function Badge({ children }: { children: ReactNode; tone?: string }) {
  return <PrimitiveBadge variant="outline">{children}</PrimitiveBadge>
}
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'
export function ToggleGroup({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (id: string) => void }) {
  return <PrimitiveToggleGroup variant="outline" aria-label={label} value={[value]} onValueChange={values => { if(values[0]) onChange(values[0]) }}>
    {options.map(option => <ToggleGroupItem key={option.id} value={option.id}>{option.label}</ToggleGroupItem>)}
  </PrimitiveToggleGroup>
}
export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <PrimitiveButton variant="secondary" size="sm" onClick={onRemove}>{label}<span aria-hidden="true">×</span><span className="sr-only">Remove {label} filter</span></PrimitiveButton>
}
