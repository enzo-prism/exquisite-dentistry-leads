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
