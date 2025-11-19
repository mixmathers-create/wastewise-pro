import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AddTruckDialog = ({ profile, onAdded }: { profile: any; onAdded: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState("Garbage Compactor");
  const [plateNumber, setPlateNumber] = useState("");
  const [capacity, setCapacity] = useState(4);

  useEffect(() => {
    // Set default capacity based on truck type
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
      const { error } = await supabase.from("trucks").insert({
        code,
        type,
        plate_number: plateNumber,
        capacity,
        status: 'available'
      });

      if (error) throw error;

      toast({ title: "Truck added successfully" });
      setOpen(false);
      setCode("");
      setType("Garbage Compactor");
      setPlateNumber("");
      setCapacity(4);
      onAdded();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Add Truck</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Truck</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Truck Code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="GC-01" required />
          </div>
          <div>
            <Label htmlFor="plateNumber">Plate Number</Label>
            <Input id="plateNumber" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="ABC-1234" required />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
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
            <Label htmlFor="capacity">Capacity (Metric Tons)</Label>
            <Input 
              id="capacity" 
              type="number" 
              step="0.5"
              value={capacity} 
              onChange={(e) => setCapacity(parseFloat(e.target.value))} 
              placeholder="4" 
              required 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Capacity will auto-adjust based on truck type
            </p>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Truck"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTruckDialog;
