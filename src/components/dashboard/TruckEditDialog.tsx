import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TruckEditDialogProps {
  truck: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const TruckEditDialog = ({ truck, open, onOpenChange, onUpdated }: TruckEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState("Garbage Compactor");
  const [plateNumber, setPlateNumber] = useState("");
  const [capacity, setCapacity] = useState(4);

  useEffect(() => {
    if (truck) {
      setCode(truck.code || "");
      setType(truck.type || "Garbage Compactor");
      setPlateNumber(truck.plate_number || "");
      setCapacity(truck.capacity || 4);
    }
  }, [truck]);

  useEffect(() => {
    const capacityMap: { [key: string]: number } = {
      "Garbage Compactor": 4,
      "Dumptruck": 2,
      "Wingvan": 2,
      "Closed Van": 2,
      "Mini Dump Truck": 1.5
    };
    setCapacity(capacityMap[type] || 2);
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("trucks")
        .update({ code, type, plate_number: plateNumber, capacity })
        .eq("id", truck.id);

      if (error) throw error;

      toast({ title: "Truck updated successfully" });
      onOpenChange(false);
      onUpdated();
    } catch (error: any) {
      toast({ title: "Error updating truck", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle>Edit Truck</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Truck Code *</Label>
            <Input 
              id="code" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              required 
            />
          </div>
          <div>
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="Garbage Compactor">Garbage Compactor</SelectItem>
                <SelectItem value="Dumptruck">Dumptruck</SelectItem>
                <SelectItem value="Wingvan">Wingvan</SelectItem>
                <SelectItem value="Closed Van">Closed Van</SelectItem>
                <SelectItem value="Mini Dump Truck">Mini Dump Truck</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="plateNumber">Plate Number</Label>
            <Input 
              id="plateNumber" 
              value={plateNumber} 
              onChange={(e) => setPlateNumber(e.target.value)} 
            />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity (MT) *</Label>
            <Input 
              id="capacity" 
              type="number" 
              step="0.1"
              value={capacity} 
              onChange={(e) => setCapacity(parseFloat(e.target.value))} 
              required 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Capacity will auto-adjust based on truck type
            </p>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating..." : "Update Truck"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TruckEditDialog;
