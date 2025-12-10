import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Clock, FileText, Shield, AlertTriangle, Plus, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Personnel {
  id: string;
  name: string;
  type: string;
  contact_number: string | null;
  status: string | null;
}

interface TimeLog {
  id: string;
  personnel_name: string;
  personnel_type: string;
  time_in: string;
  time_out: string | null;
  trucks?: {
    code: string;
  } | null;
}

interface Leave {
  id: string;
  personnel_name: string;
  personnel_type: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  leave_days: number;
  is_paid: boolean;
}

const MobileHRTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'personnel' | 'time' | 'leave' | 'admin' | 'reports'>('personnel');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [selectedPersonnelType, setSelectedPersonnelType] = useState('driver');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [leaveType, setLeaveType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch personnel from existing tables
      const [drivers, helpers, mechanics, recyclers, management] = await Promise.all([
        supabase.from("drivers").select("id, name, contact_number, status").order("name"),
        supabase.from("helpers").select("id, name, contact_number, status").order("name"),
        supabase.from("mechanics").select("id, name, contact_number, status").order("name"),
        supabase.from("recyclers").select("id, name, contact_number, status").order("name"),
        supabase.from("management").select("id, name, contact_number, status").order("name")
      ]);

      const allPersonnel: Personnel[] = [
        ...(drivers.data?.map(d => ({ ...d, type: "Driver" })) || []),
        ...(helpers.data?.map(h => ({ ...h, type: "Helper" })) || []),
        ...(mechanics.data?.map(m => ({ ...m, type: "Mechanic" })) || []),
        ...(recyclers.data?.map(r => ({ ...r, type: "Recycler" })) || []),
        ...(management.data?.map(mg => ({ ...mg, type: "Management" })) || [])
      ];

      // Fetch recent time logs
      const { data: timeData } = await supabase
        .from("personnel_time_logs")
        .select(`
          id,
          personnel_name,
          personnel_type,
          time_in,
          time_out,
          trucks:truck_id(code)
        `)
        .in("personnel_type", ["driver", "helper", "recycler"])
        .order("time_in", { ascending: false })
        .limit(10);

      // Fetch recent leaves
      const { data: leaveData } = await supabase
        .from("leaves")
        .select("id, personnel_name, personnel_type, leave_type, start_date, end_date, status, leave_days, is_paid")
        .order("created_at", { ascending: false })
        .limit(10);

      setPersonnel(allPersonnel);
      setTimeLogs(timeData || []);
      setLeaves(leaveData || []);
    } catch (error: any) {
      toast({
        title: "Error loading HR data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalTime = (timeIn: string, timeOut: string | null) => {
    if (!timeOut) return "Active";
    const start = new Date(timeIn);
    const end = new Date(timeOut);
    const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const minutes = Math.floor(((end.getTime() - start.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleLeaveSubmit = async () => {
    if (!selectedPersonnelId || !startDate || !endDate || !reason) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    try {
      const selectedPerson = personnel.find(p => p.id === selectedPersonnelId);
      const leaveDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase.from("leaves").insert({
        personnel_type: selectedPersonnelType,
        personnel_id: selectedPersonnelId,
        personnel_name: selectedPerson?.name || '',
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        status: "pending",
        leave_days: leaveDays,
        is_paid: true
      });

      if (error) throw error;

      toast({ title: "Success", description: "Leave request submitted" });
      setShowLeaveForm(false);
      setReason('');
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleLeaveAction = async (leaveId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from("leaves")
        .update({ status: action, reviewed_at: new Date().toISOString() })
        .eq("id", leaveId);

      if (error) throw error;
      toast({ title: "Success", description: `Leave ${action}` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Tab Switcher */}
      <div className="grid grid-cols-2 gap-1">
        <Button
          variant={activeView === 'personnel' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('personnel')}
          className="text-xs"
        >
          <Users className="h-3 w-3 mr-1" />
          Personnel
        </Button>
        <Button
          variant={activeView === 'time' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('time')}
          className="text-xs"
        >
          <Clock className="h-3 w-3 mr-1" />
          Time
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <Button
          variant={activeView === 'leave' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('leave')}
          className="text-xs"
        >
          <FileText className="h-3 w-3 mr-1" />
          Leave
        </Button>
        <Button
          variant={activeView === 'admin' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('admin')}
          className="text-xs"
        >
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Button>
        <Button
          variant={activeView === 'reports' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('reports')}
          className="text-xs"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Reports
        </Button>
      </div>

      {/* Personnel View */}
      {activeView === 'personnel' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">All Personnel</h3>
          {personnel.map((person) => (
            <Card key={`${person.type}-${person.id}`} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{person.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{person.type}</Badge>
                    <Badge 
                      variant={person.status === "available" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {person.status || "N/A"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {person.contact_number || "No contact"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Time Tracking View */}
      {activeView === 'time' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Recent Time Logs</h3>
          {timeLogs.map((log) => (
            <Card key={log.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{log.personnel_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {log.personnel_type} • {log.trucks?.code || "No vehicle"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    In: {format(new Date(log.time_in), "MMM dd, HH:mm")}
                  </p>
                  {log.time_out && (
                    <p className="text-xs text-muted-foreground">
                      Out: {format(new Date(log.time_out), "MMM dd, HH:mm")}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge 
                    variant={log.time_out ? "secondary" : "default"}
                    className="text-xs"
                  >
                    {calculateTotalTime(log.time_in, log.time_out)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Leave Management View */}
      {activeView === 'leave' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Leave Requests</h3>
            <Dialog open={showLeaveForm} onOpenChange={setShowLeaveForm}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>File Leave Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedPersonnelType} onValueChange={setSelectedPersonnelType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="helper">Helper</SelectItem>
                      <SelectItem value="mechanic">Mechanic</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedPersonnelId} onValueChange={setSelectedPersonnelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select personnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnel.filter(p => p.type.toLowerCase() === selectedPersonnelType).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
                  <Button onClick={handleLeaveSubmit} className="w-full">Submit</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {leaves.map((leave) => (
            <Card key={leave.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{leave.personnel_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {leave.leave_type} • {leave.leave_days} days
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(leave.start_date), "MMM dd")} - {format(new Date(leave.end_date), "MMM dd")}
                  </p>
                </div>
                <Badge variant={leave.status === 'approved' ? 'default' : leave.status === 'rejected' ? 'destructive' : 'secondary'}>
                  {leave.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Admin Panel View */}
      {activeView === 'admin' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Admin Panel</h3>
          {leaves.filter(l => l.status === 'pending').map((leave) => (
            <Card key={leave.id} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{leave.personnel_name}</p>
                  <Badge variant="secondary">{leave.leave_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(leave.start_date), "MMM dd")} - {format(new Date(leave.end_date), "MMM dd")} ({leave.leave_days} days)
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleLeaveAction(leave.id, 'approved')} className="flex-1">
                    <Check className="h-3 w-3 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleLeaveAction(leave.id, 'rejected')} className="flex-1">
                    <X className="h-3 w-3 mr-1" />Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {leaves.filter(l => l.status === 'pending').length === 0 && (
            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground">No pending requests</p>
            </Card>
          )}
        </div>
      )}

      {/* Reports View */}
      {activeView === 'reports' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Submit Reports</h3>
          
          {/* Incident Report */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <h4 className="font-medium text-sm">Incident Report</h4>
              </div>
            </div>
            <div className="space-y-3">
              <Select>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Incident type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accident">Accident</SelectItem>
                  <SelectItem value="injury">Injury</SelectItem>
                  <SelectItem value="equipment">Equipment Damage</SelectItem>
                  <SelectItem value="conflict">Argument/Conflict</SelectItem>
                  <SelectItem value="safety">Safety Violation</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" className="text-xs" defaultValue={new Date().toISOString().split('T')[0]} />
                <Select>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Describe the incident..." className="text-xs" rows={3} />
              <Button size="sm" className="w-full text-xs">
                Submit Incident Report
              </Button>
            </div>
          </Card>

          {/* Mechanical Report */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-sm">Mechanical Report</h4>
              </div>
            </div>
            <div className="space-y-3">
              <Select>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck1">Truck 001</SelectItem>
                  <SelectItem value="truck2">Truck 002</SelectItem>
                  <SelectItem value="truck3">Truck 003</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Describe the mechanical issue..." className="text-xs" rows={3} />
              <div className="flex items-center justify-between text-xs">
                <span>Vehicle still operational?</span>
                <input type="checkbox" defaultChecked />
              </div>
              <Button size="sm" className="w-full text-xs">
                Submit Mechanical Report
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <Card className="p-2 text-center">
          <p className="text-sm font-bold text-primary">{personnel.length}</p>
          <p className="text-xs text-muted-foreground">Personnel</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-sm font-bold text-green-600">
            {timeLogs.filter(log => !log.time_out).length}
          </p>
          <p className="text-xs text-muted-foreground">Active</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-sm font-bold text-orange-600">
            {leaves.filter(l => l.status === 'pending').length}
          </p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-sm font-bold text-blue-600">
            {leaves.filter(l => l.status === 'approved').length}
          </p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </Card>
      </div>
    </div>
  );
};

export default MobileHRTab;