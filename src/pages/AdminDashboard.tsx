import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  Zap,
  Activity,
  ArrowLeft,
  Crown,
  UserMinus,
  Clock,
  Plug,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useDevices } from "@/hooks/useDevices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members, activityLogs, setMemberRole, removeMember, logActivity } = useAdmin();
  const {
    devices,
    vecoRate,
    toggleDevice,
    removeDevice,
    updateVecoRate,
    setControlMode,
  } = useDevices();

  const [newVecoRate, setNewVecoRate] = useState<string>(vecoRate.toString());

  const totalTodayKwh = devices?.reduce((sum, d) => sum + (d.powerData?.todayKwh ?? 0), 0) ?? 0;
  const totalWeeklyKwh = totalTodayKwh * 7; // estimated
  const activeDevices = devices?.filter((d) => d.isOn).length ?? 0;
  const totalDevices = devices?.length ?? 0;

  const handleVecoRateUpdate = () => {
    const rate = parseFloat(newVecoRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }
    updateVecoRate(rate);
    logActivity("VECO Rate updated", `Changed rate to ₱${rate.toFixed(2)}/kWh`);
    toast.success(`VECO rate updated to ₱${rate.toFixed(2)}/kWh`);
  };

  const handleForceToggle = (deviceId: string, deviceName: string) => {
    toggleDevice(deviceId);
    logActivity("Admin device toggle", `Toggled ${deviceName}`);
    toast.success(`Toggled ${deviceName}`);
  };

  const handleForceRemove = (deviceId: string, deviceName: string) => {
    removeDevice(deviceId);
    logActivity("Admin device removed", `Removed ${deviceName}`);
    toast.success(`Removed ${deviceName}`);
  };

  const handleRoleChange = (uid: string, email: string, newRole: "admin" | "member") => {
    setMemberRole(uid, newRole);
    toast.success(`${email} is now ${newRole}`);
  };

  const handleRemoveMember = (uid: string, email: string) => {
    removeMember(uid);
    toast.success(`Removed ${email} from household`);
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive text-destructive-foreground">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">Household Management</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* OVERVIEW CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <span className="data-label">Members</span>
                <div className="font-bold text-foreground">{members.length}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Plug className="w-5 h-5 text-primary" />
              <div>
                <span className="data-label">Devices</span>
                <div className="font-bold text-foreground">{activeDevices}/{totalDevices}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="w-5 h-5 text-energy" />
              <div>
                <span className="data-label">Today</span>
                <div className="font-bold font-mono text-foreground">{totalTodayKwh.toFixed(2)} kWh</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-warning" />
              <div>
                <span className="data-label">Weekly Cost</span>
                <div className="font-bold font-mono text-foreground">₱{(totalWeeklyKwh * vecoRate).toFixed(2)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABS */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members"><Users className="w-4 h-4 mr-1.5 hidden sm:inline" />Members</TabsTrigger>
            <TabsTrigger value="devices"><Plug className="w-4 h-4 mr-1.5 hidden sm:inline" />Devices</TabsTrigger>
            <TabsTrigger value="billing"><DollarSign className="w-4 h-4 mr-1.5 hidden sm:inline" />Billing</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="w-4 h-4 mr-1.5 hidden sm:inline" />Logs</TabsTrigger>
          </TabsList>

          {/* MEMBERS TAB */}
          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Household Members</CardTitle>
                <CardDescription>Manage who can access the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.map((m) => (
                  <div
                    key={m.uid}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        {m.role === "admin" ? (
                          <Crown className="w-4 h-4 text-primary" />
                        ) : (
                          <Users className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatTimestamp(m.addedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                        {m.role}
                      </Badge>
                      {m.uid !== user?.uid && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRoleChange(m.uid, m.email, m.role === "admin" ? "member" : "admin")
                            }
                          >
                            {m.role === "admin" ? "Demote" : "Promote"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove {m.email} from the household? They won't be able to control devices.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveMember(m.uid, m.email)}>
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DEVICES TAB */}
          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Device Override Control</CardTitle>
                <CardDescription>Force-toggle or remove any device</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {devices?.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          d.isOn ? "bg-power-on shadow-[0_0_8px_hsl(var(--power-on))]" : "bg-power-off"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.location} · {d.powerData.currentWatts}W · {d.controlMode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForceToggle(d.id, d.name)}
                      >
                        {d.isOn ? (
                          <ToggleRight className="w-4 h-4 mr-1 text-power-on" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 mr-1" />
                        )}
                        {d.isOn ? "Turn Off" : "Turn On"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Device</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently remove {d.name} from the system?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleForceRemove(d.id, d.name)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                {(!devices || devices.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No devices registered</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BILLING TAB */}
          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">VECO Rate Settings</CardTitle>
                <CardDescription>Update electricity rate for cost calculations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label>Rate (₱/kWh)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newVecoRate}
                      onChange={(e) => setNewVecoRate(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleVecoRateUpdate}>Update Rate</Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Current rate: <span className="font-mono font-medium text-foreground">₱{vecoRate.toFixed(2)}/kWh</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usage Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <span className="data-label">Today's Usage</span>
                    <div className="font-bold font-mono text-foreground">{totalTodayKwh.toFixed(2)} kWh</div>
                    <div className="text-xs text-muted-foreground">₱{(totalTodayKwh * vecoRate).toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <span className="data-label">This Week</span>
                    <div className="font-bold font-mono text-foreground">{totalWeeklyKwh.toFixed(2)} kWh</div>
                    <div className="text-xs text-muted-foreground">₱{(totalWeeklyKwh * vecoRate).toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 col-span-2">
                    <span className="data-label">Estimated Monthly</span>
                    <div className="font-bold font-mono text-foreground">
                      {(totalTodayKwh * 30).toFixed(1)} kWh
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ₱{(totalTodayKwh * 30 * vecoRate).toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACTIVITY LOGS TAB */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Logs</CardTitle>
                <CardDescription>Recent actions across the household</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{log.action}</span>
                          <Badge variant="outline" className="text-xs">{log.userEmail}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                        <p className="text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                  {activityLogs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
