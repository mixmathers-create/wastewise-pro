import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditEquipmentDialogProps {
  equipment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditEquipmentDialog({ equipment, open, onOpenChange, onSuccess }: EditEquipmentDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [isConsumable, setIsConsumable] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("");
  const { toast } = useToast();

  const equipmentTypes = ["Uniform (Top)", "Boots", "Gloves", "Helmet", "Safety Vest", "Other"];

  useEffect(() => {
    if (equipment) {
      setName(equipment.name || "");
      setType(equipment.type || "");
      setIsConsumable(equipment.is_consumable || false);
      setQuantity(equipment.quantity || 1);
      setStatus(equipment.status || "available");
    }
  }, [equipment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from("equipment_inventory")
        .update({
          name,
          type,
          is_consumable: isConsumable,
          quantity,
          status
        })
        .eq("id", equipment.id);

      if (error) throw error;

      toast({ title: "Success", description: "Equipment updated successfully" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
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
                <SelectValue />
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
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
