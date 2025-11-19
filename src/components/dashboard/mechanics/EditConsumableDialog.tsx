import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditConsumableDialogProps {
  consumable: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditConsumableDialog({ consumable, open, onOpenChange, onSuccess }: EditConsumableDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [minStockLevel, setMinStockLevel] = useState(10);
  const { toast } = useToast();

  useEffect(() => {
    if (consumable) {
      setName(consumable.name || "");
      setCategory(consumable.category || "");
      setUnit(consumable.unit || "");
      setQuantity(consumable.quantity || 0);
      setMinStockLevel(consumable.min_stock_level || 10);
    }
  }, [consumable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const status = quantity > minStockLevel ? 'in_stock' : quantity > 0 ? 'low_stock' : 'out_of_stock';

      const { error } = await supabase
        .from("mechanic_consumables")
        .update({
          name,
          category,
          unit,
          quantity,
          min_stock_level: minStockLevel,
          status
        })
        .eq("id", consumable.id);

      if (error) throw error;

      toast({ title: "Success", description: "Consumable updated successfully" });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Consumable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={consumable?.code} disabled />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oil">Oil</SelectItem>
                <SelectItem value="Filters">Filters</SelectItem>
                <SelectItem value="Fluids">Fluids</SelectItem>
                <SelectItem value="Parts">Parts</SelectItem>
                <SelectItem value="Cleaning">Cleaning Supplies</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="unit">Unit *</Label>
            <Select value={unit} onValueChange={setUnit} required>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Liters">Liters</SelectItem>
                <SelectItem value="Pieces">Pieces</SelectItem>
                <SelectItem value="Bottles">Bottles</SelectItem>
                <SelectItem value="Gallons">Gallons</SelectItem>
                <SelectItem value="Kg">Kg</SelectItem>
                <SelectItem value="Units">Units</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input 
                id="quantity" 
                type="number" 
                min="0"
                step="0.01"
                value={quantity} 
                onChange={(e) => setQuantity(parseFloat(e.target.value))} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="minStock">Min Stock Level *</Label>
              <Input 
                id="minStock" 
                type="number" 
                min="0"
                step="0.01"
                value={minStockLevel} 
                onChange={(e) => setMinStockLevel(parseFloat(e.target.value))} 
                required 
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Update Consumable</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}