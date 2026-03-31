import { useState } from 'react';
import { toast } from 'sonner';
import { Clock, ArrowRight } from 'lucide-react';
import { DayOfWeek, ScheduleEntry } from '@/types/device';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScheduleStatus } from '@/lib/scheduleUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS: DayOfWeek[] = ['Sat', 'Sun'];
const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'Th', Fri: 'F', Sat: 'Sa', Sun: 'Su',
};

interface ScheduleEditorProps {
  schedule?: ScheduleEntry;
  onChange: (schedule: ScheduleEntry) => void;
  scheduleStatus?: ScheduleStatus;
  statusLabel?: string | null;
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function condenseDays(days: DayOfWeek[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && WEEKDAYS.every(d => days.includes(d)) && !days.includes('Sat') && !days.includes('Sun')) return 'Weekdays';
  if (days.length === 2 && days.includes('Sat') && days.includes('Sun')) return 'Weekends';
  return days.join(', ');
}

export function ScheduleEditor({ schedule, onChange, scheduleStatus, statusLabel }: ScheduleEditorProps) {
  const current: ScheduleEntry = {
    enabled: true,
    days: schedule?.days ?? [],
    startTime: schedule?.startTime ?? '08:00',
    endTime: schedule?.endTime ?? '18:00',
  };

  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [editStart, setEditStart] = useState(current.startTime);
  const [editEnd, setEditEnd] = useState(current.endTime);
  const [pendingTime, setPendingTime] = useState<{ startTime: string; endTime: string } | null>(null);

  const openTimeDialog = () => {
    setEditStart(current.startTime);
    setEditEnd(current.endTime);
    setTimeDialogOpen(true);
  };

  const handleTimeSave = () => {
    if (editStart >= editEnd) {
      toast.error('Start time must be before end time.');
      return;
    }
    setTimeDialogOpen(false);
    setPendingTime({ startTime: editStart, endTime: editEnd });
  };

  const confirmTimeChange = () => {
    if (pendingTime) {
      onChange({ ...current, ...pendingTime });
      setPendingTime(null);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    const days = current.days.includes(day)
      ? current.days.filter((d) => d !== day)
      : [...current.days, day];
    onChange({ ...current, days });
  };

  const selectWeekdays = () => onChange({ ...current, days: [...WEEKDAYS] });
  const selectWeekends = () => onChange({ ...current, days: [...WEEKENDS] });
  const selectEveryDay = () => onChange({ ...current, days: [...ALL_DAYS] });

  const isWeekdaysSelected = current.days.length === 5 && WEEKDAYS.every(d => current.days.includes(d)) && !current.days.includes('Sat') && !current.days.includes('Sun');
  const isWeekendsSelected = current.days.length === 2 && current.days.includes('Sat') && current.days.includes('Sun');
  const isEveryDaySelected = current.days.length === 7;

  return (
    <div className="space-y-4 rounded-xl bg-muted/50 p-4">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <Label className="font-medium text-sm">Schedule</Label>
        {statusLabel && (
          <Badge variant="outline" className={cn(
            'text-xs',
            scheduleStatus === 'active' ? 'text-energy border-energy/30 bg-energy/10' : 'text-muted-foreground border-muted-foreground/30'
          )}>
            {statusLabel}
          </Badge>
        )}
      </div>

      {/* Day selector */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Repeat on</Label>
        <div className="flex gap-1.5 justify-between">
          {ALL_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                'w-9 h-9 rounded-full text-xs font-semibold transition-all flex items-center justify-center',
                current.days.includes(day)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background text-muted-foreground border border-border hover:bg-accent hover:text-foreground'
              )}
            >
              {DAY_SHORT_LABELS[day]}
            </button>
          ))}
        </div>

        {/* Quick select */}
        <div className="flex gap-2">
          <Button type="button" variant={isWeekdaysSelected ? "default" : "outline"} size="sm" className="text-xs h-7 rounded-full" onClick={selectWeekdays}>
            Weekdays
          </Button>
          <Button type="button" variant={isWeekendsSelected ? "default" : "outline"} size="sm" className="text-xs h-7 rounded-full" onClick={selectWeekends}>
            Weekends
          </Button>
          <Button type="button" variant={isEveryDaySelected ? "default" : "outline"} size="sm" className="text-xs h-7 rounded-full" onClick={selectEveryDay}>
            Every day
          </Button>
        </div>
      </div>

      {/* Time range - tappable display */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Active hours</Label>
        <button
          type="button"
          onClick={openTimeDialog}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-lg bg-background border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer"
        >
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">Start</span>
            <span className="text-lg font-semibold text-foreground">{formatTime12(current.startTime)}</span>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">End</span>
            <span className="text-lg font-semibold text-foreground">{formatTime12(current.endTime)}</span>
          </div>
        </button>
      </div>

      {/* Summary bar */}
      {current.days.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 text-primary">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <p className="text-xs font-medium">
            {condenseDays(current.days)} · {formatTime12(current.startTime)} – {formatTime12(current.endTime)}
          </p>
        </div>
      )}

      {/* Time picker dialog */}
      <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Active Hours</DialogTitle>
            <DialogDescription>Choose the start and end time for this schedule.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Time</Label>
              <Input
                type="time"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="font-mono text-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Time</Label>
              <Input
                type="time"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="font-mono text-lg h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTimeSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time change confirmation dialog */}
      <AlertDialog open={!!pendingTime} onOpenChange={(open) => !open && setPendingTime(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Schedule Hours?</AlertDialogTitle>
            <AlertDialogDescription>
              Change active hours to{' '}
              <span className="font-semibold text-foreground">
                {formatTime12(pendingTime?.startTime ?? current.startTime)} – {formatTime12(pendingTime?.endTime ?? current.endTime)}
              </span>
              ? The device will follow the new schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTimeChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
