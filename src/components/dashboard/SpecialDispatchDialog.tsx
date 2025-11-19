import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Client {
  id: string;
  name: string;
  mt_requirement: number;
}

interface ClientMtAssignment {
  clientId: string;
  mt: number;
}

interface TruckType {
  id: string;
  code: string;
  capacity: number;
  status: string;
}

interface SpecialDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  trucks: TruckType[];
  drivers: any[];
  helpers: any[];
  onSuccess: () => void;
  maintenanceBlocks: any[];
}

export const SpecialDispatchDialog = ({
  open,
  onOpenChange,
  clients,
  trucks,
  drivers,
  helpers,
  onSuccess,
  maintenanceBlocks
}: SpecialDispatchDialogProps) => {
  const { toast } = useToast();
  const [mtRequirement, setMtRequirement] = useState("");
  const [clientMtAssignments, setClientMtAssignments] = useState<ClientMtAssignment[]>([]);
  const [collectionDate, setCollectionDate] = useState<Date>();
  const [shift, setShift] = useState<"AM" | "PM">("AM");
  const [truckAssignmentMode, setTruckAssignmentMode] = useState<"auto" | "manual">("auto");
  const [selectedTruckIds, setSelectedTruckIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isTruckUnderMaintenance = (truckId: string, date: string) => {
    return maintenanceBlocks.some(
      (block) =>
        block.truck_id === truckId &&
        date >= block.start_date &&
        date <= block.end_date
    );
  };

  const availableTrucks = trucks.filter(
    (truck) =>
      truck.status === "available" &&
      collectionDate &&
      !isTruckUnderMaintenance(truck.id, format(collectionDate, "yyyy-MM-dd"))
  );

  const calculateRequiredTrucks = () => {
    const mt = parseFloat(mtRequirement);
    if (isNaN(mt) || mt <= 0) return 0;
    
    const sortedTrucks = [...availableTrucks].sort((a, b) => b.capacity - a.capacity);
    let remainingMt = mt;
    let truckCount = 0;
    
    for (const truck of sortedTrucks) {
      if (remainingMt <= 0) break;
      remainingMt -= truck.capacity;
      truckCount++;
    }
    
    return truckCount;
  };

  const autoAssignTrucks = () => {
    const mt = parseFloat(mtRequirement);
    if (isNaN(mt) || mt <= 0) return [];
    
    const sortedTrucks = [...availableTrucks].sort((a, b) => b.capacity - a.capacity);
    let remainingMt = mt;
    const assignedTrucks: string[] = [];
    
    for (const truck of sortedTrucks) {
      if (remainingMt <= 0) break;
      assignedTrucks.push(truck.id);
      remainingMt -= truck.capacity;
    }
    
    return assignedTrucks;
  };

  const isDriverAvailable = (driver: any, date: string) => {
    if (driver.status !== "available") return false;
    
    const scheduledDate = new Date(date);
    const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][scheduledDate.getDay()];
    
    if (driver.availability?.days && !driver.availability.days.includes(dayOfWeek)) {
      return false;
    }
    
    if (driver.availability?.shifts && !driver.availability.shifts.includes(shift)) {
      return false;
    }
    
    if (driver.license_expiry_date) {
      const expiryDate = new Date(driver.license_expiry_date);
      if (expiryDate < scheduledDate) return false;
    }
    
    if (driver.suspension_start_date && driver.suspension_end_date) {
      const suspensionStart = new Date(driver.suspension_start_date);
      const suspensionEnd = new Date(driver.suspension_end_date);
      if (scheduledDate >= suspensionStart && scheduledDate <= suspensionEnd) {
        return false;
      }
    }
    
    return true;
  };

  const isHelperAvailable = (helper: any, date: string) => {
    if (helper.status !== "available") return false;
    
    const scheduledDate = new Date(date);
    const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][scheduledDate.getDay()];
    
    if (helper.availability?.days && !helper.availability.days.includes(dayOfWeek)) {
      return false;
    }
    
    if (helper.availability?.shifts && !helper.availability.shifts.includes(shift)) {
      return false;
    }
    
    if (helper.suspension_start_date && helper.suspension_end_date) {
      const suspensionStart = new Date(helper.suspension_start_date);
      const suspensionEnd = new Date(helper.suspension_end_date);
      if (scheduledDate >= suspensionStart && scheduledDate <= suspensionEnd) {
        return false;
      }
    }
    
    return true;
  };

  const autoAssignPersonnel = (dateStr: string, numTrucks: number) => {
    const availableDrivers = drivers.filter(d => isDriverAvailable(d, dateStr));
    const availableHelpers = helpers.filter(h => isHelperAvailable(h, dateStr));
    
    const assignments: Array<{ driverId: string | null; helperIds: string[] }> = [];
    
    for (let i = 0; i < numTrucks; i++) {
      const driverId = availableDrivers[i]?.id || null;
      const helperIds: string[] = [];
      
      // Assign 2 helpers per truck if available
      const helperIndex1 = i * 2;
      const helperIndex2 = i * 2 + 1;
      
      if (availableHelpers[helperIndex1]) {
        helperIds.push(availableHelpers[helperIndex1].id);
      }
      if (availableHelpers[helperIndex2]) {
        helperIds.push(availableHelpers[helperIndex2].id);
      }
      
      assignments.push({ driverId, helperIds });
    }
    
    return assignments;
  };

  const handleGenerate = async () => {
    if (!collectionDate) {
      toast({ title: "Error", description: "Please select a collection date", variant: "destructive" });
      return;
    }

    const mt = parseFloat(mtRequirement);
    if (isNaN(mt) || mt <= 0) {
      toast({ title: "Error", description: "Please enter a valid MT requirement", variant: "destructive" });
      return;
    }

    if (clientMtAssignments.length === 0) {
      toast({ title: "Error", description: "Please select at least one client", variant: "destructive" });
      return;
    }

    // Validate that all selected clients have MT assigned
    const totalClientMt = clientMtAssignments.reduce((sum, ca) => sum + ca.mt, 0);
    if (totalClientMt === 0) {
      toast({ title: "Error", description: "Please assign MT requirements to selected clients", variant: "destructive" });
      return;
    }

    const trucksToAssign = truckAssignmentMode === "auto" ? autoAssignTrucks() : selectedTruckIds;
    
    if (trucksToAssign.length === 0) {
      toast({ title: "Error", description: "No trucks available or selected", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(collectionDate, "yyyy-MM-dd");
      
      // Auto-assign personnel
      const personnelAssignments = autoAssignPersonnel(dateStr, trucksToAssign.length);
      
      // Create schedule entries for each truck
      const schedules = trucksToAssign.map((truckId, index) => ({
        date: dateStr,
        shift,
        truck_id: truckId,
        driver_id: personnelAssignments[index]?.driverId || null,
        helper_ids: personnelAssignments[index]?.helperIds || [],
        client_ids: clientMtAssignments.map(ca => ca.clientId),
        mt_requirement: mt / trucksToAssign.length, // Distribute MT evenly
        status: "draft",
        is_backup: false
      }));

      const { error } = await supabase.from("schedules").insert(schedules);
      
      if (error) throw error;

      const assignedDrivers = personnelAssignments.filter(p => p.driverId).length;
      const assignedHelpers = personnelAssignments.reduce((sum, p) => sum + p.helperIds.length, 0);
      
      toast({ 
        title: "Success", 
        description: `Special dispatch created with ${trucksToAssign.length} truck${trucksToAssign.length > 1 ? 's' : ''}, ${assignedDrivers} driver${assignedDrivers !== 1 ? 's' : ''}, and ${assignedHelpers} helper${assignedHelpers !== 1 ? 's' : ''}` 
      });
      
      // Reset form
      setMtRequirement("");
      setClientMtAssignments([]);
      setCollectionDate(undefined);
      setShift("AM");
      setTruckAssignmentMode("auto");
      setSelectedTruckIds([]);
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleClient = (clientId: string) => {
    setClientMtAssignments(prev => {
      const exists = prev.find(ca => ca.clientId === clientId);
      if (exists) {
        return prev.filter(ca => ca.clientId !== clientId);
      } else {
        const client = clients.find(c => c.id === clientId);
        return [...prev, { clientId, mt: client?.mt_requirement || 0 }];
      }
    });
  };

  const updateClientMt = (clientId: string, mt: number) => {
    setClientMtAssignments(prev =>
      prev.map(ca => ca.clientId === clientId ? { ...ca, mt } : ca)
    );
  };

  const toggleTruck = (truckId: string) => {
    setSelectedTruckIds(prev =>
      prev.includes(truckId)
        ? prev.filter(id => id !== truckId)
        : [...prev, truckId]
    );
  };

  const requiredTrucks = calculateRequiredTrucks();
  const totalClientMt = clientMtAssignments.reduce((sum, ca) => sum + ca.mt, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Special Dispatch Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* MT Requirement */}
          <div className="space-y-2">
            <Label htmlFor="mt">Total MT Requirement *</Label>
            <Input
              id="mt"
              type="number"
              step="0.01"
              placeholder="Enter total MT"
              value={mtRequirement}
              onChange={(e) => setMtRequirement(e.target.value)}
            />
            {mtRequirement && requiredTrucks > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Estimated trucks needed: {requiredTrucks}</span>
              </div>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Collection Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {collectionDate ? format(collectionDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={collectionDate}
                  onSelect={setCollectionDate}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Shift Selection */}
          <div className="space-y-2">
            <Label>Shift *</Label>
            <Select value={shift} onValueChange={(value: "AM" | "PM") => setShift(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM (8AM-8PM)</SelectItem>
                <SelectItem value="PM">PM (8PM-8AM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Clients & Assign MT *</Label>
              <Badge variant="secondary">
                {clientMtAssignments.length} selected • {totalClientMt.toFixed(2)} MT
              </Badge>
            </div>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
              {clients.map((client) => {
                const assignment = clientMtAssignments.find(ca => ca.clientId === client.id);
                const isSelected = !!assignment;
                
                return (
                  <div key={client.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={client.id}
                        checked={isSelected}
                        onCheckedChange={() => toggleClient(client.id)}
                      />
                      <label
                        htmlFor={client.id}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        {client.name}
                      </label>
                    </div>
                    {isSelected && (
                      <div className="ml-6 flex items-center gap-2">
                        <Label htmlFor={`mt-${client.id}`} className="text-xs whitespace-nowrap">
                          MT for dispatch:
                        </Label>
                        <Input
                          id={`mt-${client.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={assignment.mt}
                          onChange={(e) => updateClientMt(client.id, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          (usual: {client.mt_requirement} MT)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Truck Assignment Mode */}
          <div className="space-y-3">
            <Label>Truck Assignment</Label>
            <RadioGroup value={truckAssignmentMode} onValueChange={(v: "auto" | "manual") => setTruckAssignmentMode(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="font-normal cursor-pointer">
                  Auto-assign trucks (recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal cursor-pointer">
                  Manual truck selection
                </Label>
              </div>
            </RadioGroup>

            {truckAssignmentMode === "manual" && (
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Available Trucks</span>
                  <Badge variant="secondary">{selectedTruckIds.length} selected</Badge>
                </div>
                {availableTrucks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No available trucks for selected date</p>
                ) : (
                  availableTrucks.map((truck) => (
                    <div key={truck.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={truck.id}
                        checked={selectedTruckIds.includes(truck.id)}
                        onCheckedChange={() => toggleTruck(truck.id)}
                      />
                      <label
                        htmlFor={truck.id}
                        className="text-sm flex-1 cursor-pointer flex items-center justify-between"
                      >
                        <span>{truck.code}</span>
                        <span className="text-muted-foreground">{truck.capacity} MT</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Creating..." : "Generate Special Dispatch"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
