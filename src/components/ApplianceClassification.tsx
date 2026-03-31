import { Lightbulb, Fan, Tv, CircuitBoard, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadClassification, ApplianceType } from '@/types/device';
import { Badge } from '@/components/ui/badge';

interface ApplianceClassificationProps {
  classification: LoadClassification;
  compact?: boolean;
}

const typeIcons: Record<ApplianceType, typeof Lightbulb> = {
  resistive: Lightbulb,
  inductive: Fan,
  switching: Tv,
};

const typeLabels: Record<ApplianceType, string> = {
  resistive: 'Resistive Load',
  inductive: 'Inductive Load',
  switching: 'Switching Load',
};

const typeDescriptions: Record<ApplianceType, string> = {
  resistive: 'Incandescent bulbs, heaters',
  inductive: 'Motors, fans, compressors',
  switching: 'Electronics, TVs, chargers',
};

export function ApplianceClassification({ classification, compact = false }: ApplianceClassificationProps) {
  const Icon = typeIcons[classification.type];
  
  return (
    <div className={cn(
      'rounded-lg border bg-card',
      compact ? 'p-3' : 'p-4'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
            <Icon className={cn('text-primary', compact ? 'w-4 h-4' : 'w-5 h-5')} />
          </div>
          <div className="flex flex-col">
            <span className="data-label">Appliance Type</span>
            <span className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>
              {typeLabels[classification.type]}
            </span>
            {!compact && (
              <span className="text-xs text-muted-foreground mt-0.5">
                {typeDescriptions[classification.type]}
              </span>
            )}
          </div>
        </div>
        
        <Badge 
          variant={classification.pwmCompatible ? 'default' : 'secondary'}
          className={cn(
            'flex items-center gap-1',
            classification.pwmCompatible 
              ? 'bg-energy/10 text-energy hover:bg-energy/20' 
              : 'bg-muted text-muted-foreground'
          )}
        >
          {classification.pwmCompatible ? (
            <>
              <CheckCircle className="w-3 h-3" />
              PWM OK
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3" />
              No PWM
            </>
          )}
        </Badge>
      </div>
      
      {!compact && !classification.pwmCompatible && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs">
          <CircuitBoard className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <span className="text-warning">
            PWM dimming disabled for safety. This load type may be damaged by dimming.
          </span>
        </div>
      )}
    </div>
  );
}
