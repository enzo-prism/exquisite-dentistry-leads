import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button data-slot="button" className={`button ${className}`} {...props} />
}

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button data-slot="button" className={`icon-button ${className}`} aria-label={label} title={label} {...props}>{children}</button>
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} data-slot="input" className={`input ${className}`} {...props} />
})

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section data-slot="card" className={`card ${className}`}>{children}</section>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span data-slot="badge" className={`badge badge-${tone}`}>{children}</span>
}

export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div data-slot="table-container" className="table-scroll"><table data-slot="table" className={className}>{children}</table></div>
}

export function TableHeader({ children }: { children: ReactNode }) {
  return <thead data-slot="table-header">{children}</thead>
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody data-slot="table-body">{children}</tbody>
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr data-slot="table-row">{children}</tr>
}

export function TableHead({ children }: { children: ReactNode }) {
  return <th data-slot="table-head">{children}</th>
}

export function TableCell({ children }: { children: ReactNode }) {
  return <td data-slot="table-cell">{children}</td>
}
