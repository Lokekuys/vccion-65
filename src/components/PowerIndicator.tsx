import { Power } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PowerIndicatorProps {
  isOn: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PowerIndicator({ isOn, size = 'md', showLabel = false }: PowerIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center justify-center rounded-full transition-all duration-300',
          isOn 
            ? 'text-energy shadow-[0_0_12px_hsl(var(--energy)/0.4)]' 
            : 'text-power-off'
        )}
      >
        <Power className={sizeClasses[size]} strokeWidth={2.5} />
      </div>
      {showLabel && (
        <span className={cn(
          'text-sm font-medium',
          isOn ? 'text-energy' : 'text-muted-foreground'
        )}>
          {isOn ? 'ON' : 'OFF'}
        </span>
      )}
    </div>
  );
}
