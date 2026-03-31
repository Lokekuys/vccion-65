import { Wifi, WifiOff, Radio, RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SystemStatus } from '@/types/device';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SystemStatusBarProps {
  status: SystemStatus;
  onRefresh: () => void;
}

export function SystemStatusBar({ status, onRefresh }: SystemStatusBarProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-card border p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* ESP-NOW Status */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            status.espNowConnected ? 'bg-energy/10' : 'bg-destructive/10'
          )}>
            <Radio className={cn(
              'w-4 h-4',
              status.espNowConnected ? 'text-energy' : 'text-destructive'
            )} />
          </div>
          <div className="flex flex-col">
            <span className="data-label">ESP-NOW</span>
            <span className={cn(
              'text-sm font-medium',
              status.espNowConnected ? 'text-energy' : 'text-destructive'
            )}>
              {status.espNowConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Wi-Fi Status */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            status.wifiConnected ? 'bg-primary/10' : 'bg-muted'
          )}>
            {status.wifiConnected ? (
              <Wifi className="w-4 h-4 text-primary" />
            ) : (
              <WifiOff className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="data-label">Wi-Fi</span>
            <span className={cn(
              'text-sm font-medium',
              status.wifiConnected ? 'text-primary' : 'text-muted-foreground'
            )}>
              {status.wifiConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Device Count */}
        <Badge variant="secondary" className="text-sm">
          {status.deviceCount} Device{status.deviceCount !== 1 ? 's' : ''}
        </Badge>

        {/* Last Sync */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Last sync: {formatTime(status.lastSync)}</span>
        </div>
      </div>

      <Button 
        variant="outline" 
        size="sm"
        onClick={onRefresh}
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </Button>
    </div>
  );
}
