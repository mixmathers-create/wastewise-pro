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
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
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

    if (selectedClientIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one client", variant: "destructive" });
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
      
      // Create schedule entries for each truck
      const schedules = trucksToAssign.map((truckId) => ({
        date: dateStr,
        shift,
        truck_id: truckId,
        driver_id: null,
        helper_ids: [],
        client_ids: selectedClientIds,
        mt_requirement: mt / trucksToAssign.length, // Distribute MT evenly
        status: "draft",
        is_backup: false
      }));

      const { error } = await supabase.from("schedules").insert(schedules);
      
      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Special dispatch created with ${trucksToAssign.length} truck${trucksToAssign.length > 1 ? 's' : ''}` 
      });
      
      // Reset form
      setMtRequirement("");
      setSelectedClientIds([]);
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
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
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
  const totalSelectedMt = clients
    .filter(c => selectedClientIds.includes(c.id))
    .reduce((sum, c) => sum + c.mt_requirement, 0);

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
              <Label>Select Clients *</Label>
              <Badge variant="secondary">
                {selectedClientIds.length} selected • {totalSelectedMt.toFixed(2)} MT
              </Badge>
            </div>
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={client.id}
                    checked={selectedClientIds.includes(client.id)}
                    onCheckedChange={() => toggleClient(client.id)}
                  />
                  <label
                    htmlFor={client.id}
                    className="text-sm flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <span>{client.name}</span>
                    <span className="text-muted-foreground">{client.mt_requirement} MT</span>
                  </label>
                </div>
              ))}
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
