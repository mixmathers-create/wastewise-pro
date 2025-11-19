import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddEquipmentDialog({ open, onOpenChange, onSuccess }: AddEquipmentDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [isConsumable, setIsConsumable] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  const equipmentTypes = ["Uniform (Top)", "Boots", "Gloves", "Helmet", "Safety Vest", "Other"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const code = `EQ-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const { error } = await supabase.from("equipment_inventory").insert({
        code,
        name,
        type,
        is_consumable: isConsumable,
        quantity,
        status: "available"
      });

      if (error) throw error;

      toast({ title: "Success", description: `Equipment added with code: ${code}` });
      onSuccess();
      onOpenChange(false);
      setName("");
      setType("");
      setIsConsumable(false);
      setQuantity(1);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Equipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Equipment Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {equipmentTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="consumable"
              checked={isConsumable}
              onCheckedChange={(checked) => setIsConsumable(checked as boolean)}
            />
            <label htmlFor="consumable" className="text-sm cursor-pointer">
              This is a consumable item (e.g., gloves)
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add Equipment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
