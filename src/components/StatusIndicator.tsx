import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  label?: string;
}

export function StatusIndicator({ 
  status, 
  size = 'md', 
  pulse = true,
  label 
}: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusClasses = {
    online: 'bg-energy',
    offline: 'bg-power-off',
    warning: 'bg-warning',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'rounded-full transition-all duration-300',
          sizeClasses[size],
          statusClasses[status],
          pulse && status === 'online' && 'animate-pulse-glow',
          status === 'online' && 'shadow-[0_0_8px_hsl(var(--energy))]'
        )}
      />
      {label && (
        <span className="text-sm text-muted-foreground capitalize">
          {label === 'Online' ? 'Connected' : label}
        </span>
      )}
    </div>
  );
}
