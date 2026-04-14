import { useState, useEffect } from 'react';
import { Settings, ChevronRight, Wifi, WifiOff, AlertTriangle, Pencil, Hand, Calendar, Brain, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SmartPlug } from '@/types/device';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { StatusIndicator } from './StatusIndicator';
import { PowerIndicator } from './PowerIndicator';
import { computeConnectionStatus, formatLastSeen, STATUS_CONFIG } from '@/lib/deviceStatus';
import {
  OccupancyDisplay,
  LightLevelDisplay,
  OnDurationDisplay,
} from './SensorDisplay';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from './CountdownTimer';
import { ScheduleCountdown } from './ScheduleCountdown';
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { getScheduleStatus, getScheduleLabel } from '@/lib/scheduleUtils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeviceCardProps {
  device: SmartPlug;
  onToggle: (deviceId: string) => void;
  onSelect: (device: SmartPlug) => void;
  countdownEndsAt?: number;
}

export function DeviceCard({ device, onToggle, onSelect, countdownEndsAt }: DeviceCardProps) {