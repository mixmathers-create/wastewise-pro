import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CheckoutEquipmentDialog({ open, onOpenChange, onSuccess }: CheckoutEquipmentDialogProps) {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [assignToType, setAssignToType] = useState<"driver" | "helper" | "mechanic">("driver");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchEquipment();
      fetchDrivers();
      fetchHelpers();
      fetchMechanics();
    }
  }, [open]);

  const fetchEquipment = async () => {
    const { data } = await supabase
      .from("equipment_inventory")
      .select("*")
      .eq("status", "available")
      .order("name");
    setEquipment(data || []);
  };

  const fetchDrivers = async () => {
    const { data } = await supabase.from("drivers").select("*").order("name");
    setDrivers(data || []);
  };

  const fetchHelpers = async () => {
    const { data } = await supabase.from("helpers").select("*").order("name");
    setHelpers(data || []);
  };

  const fetchMechanics = async () => {
    const { data } = await supabase.from("mechanics").select("*").order("name");
    setMechanics(data || []);
  };

  const handleCheckout = async () => {
    if (!selectedEquipment || !selectedPerson) {
      toast({ title: "Error", description: "Please select equipment and person", variant: "destructive" });
      return;
    }

    try {
      const equipItem = equipment.find(e => e.id === selectedEquipment);
      if (!equipItem || equipItem.quantity < quantity) {
        throw new Error("Insufficient quantity available");
      }

      const { error: checkoutError } = await supabase.from("equipment_checkouts").insert({
        equipment_id: selectedEquipment,
        assigned_to_type: assignToType,
        driver_id: assignToType === "driver" ? selectedPerson : null,
        helper_id: assignToType === "helper" ? selectedPerson : null,
        mechanic_id: assignToType === "mechanic" ? selectedPerson : null,
        quantity,
        status: "checked_out"
      });

      if (checkoutError) throw checkoutError;

      const newQuantity = equipItem.quantity - quantity;
      const { error: updateError } = await supabase
        .from("equipment_inventory")
        .update({ 
          quantity: newQuantity,
          status: newQuantity === 0 ? "out_of_stock" : "available"
        })
        .eq("id", selectedEquipment);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Equipment checked out successfully" });
      onSuccess();
      onOpenChange(false);
      setSelectedEquipment("");
      setSelectedPerson("");
      setQuantity(1);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check Out Equipment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="equipment">Equipment *</Label>
            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
              <SelectTrigger>
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {equipment.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} - {item.name} (Qty: {item.quantity})
                  </SelectItem>
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
          <div>
            <Label>Assign To *</Label>
            <Select value={assignToType} onValueChange={(value) => setAssignToType(value as "driver" | "helper" | "mechanic")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="helper">Helper</SelectItem>
                <SelectItem value="mechanic">Mechanic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="person">
              {assignToType === "driver" ? "Driver" : assignToType === "helper" ? "Helper" : "Mechanic"} *
            </Label>
            <Select value={selectedPerson} onValueChange={setSelectedPerson}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${assignToType}`} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {(assignToType === "driver" ? drivers : assignToType === "helper" ? helpers : mechanics).map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCheckout}>Check Out</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
