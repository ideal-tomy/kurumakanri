interface BadgeProps {
  variant?: 'success' | 'warn' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  withDot?: boolean;
}

export function Badge({ variant = 'neutral', children, withDot = true }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {withDot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function priorityVariant(daysLeft: number | null | undefined) {
  if (daysLeft == null) return 'neutral' as const;
  if (daysLeft <= 30) return 'danger' as const;
  if (daysLeft <= 90) return 'warn' as const;
  return 'success' as const;
}
