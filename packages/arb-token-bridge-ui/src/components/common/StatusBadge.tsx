import React from 'react'

interface StatusBadgeProps {
  variant?: 'blue' | 'yellow' | 'green' | 'red' | 'gray'
  children: React.ReactNode
}

const variants: Record<string, string> = {
  blue: 'bg-cyan text-cyan-dark',
  yellow: 'bg-orange text-orange-dark',
  green: 'bg-lime text-lime-dark',
  red: 'bg-brick text-brick-dark border',
  gray: 'bg-gray-5 text-gray-9'
}

export function StatusBadge({
  variant = 'blue',
  children
}: StatusBadgeProps): JSX.Element {
  return (
    <div
      className={`w-max rounded-full px-3 py-1 text-sm ${variants[variant]} flex flex-nowrap items-center gap-1`}
    >
      {children}
    </div>
  )
}
