import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutConsumableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CheckoutConsumableDialog({ open, onOpenChange, onSuccess }: CheckoutConsumableDialogProps) {
  const [consumables, setConsumables] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [selectedConsumable, setSelectedConsumable] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [selectedJobOrder, setSelectedJobOrder] = useState("");
  const [quantityUsed, setQuantityUsed] = useState(1);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchConsumables();
      fetchMechanics();
      fetchTrucks();
      fetchJobOrders();
    }
  }, [open]);

  const fetchConsumables = async () => {
    const { data } = await supabase
      .from("mechanic_consumables")
      .select("*")
      .gt("quantity", 0)
      .order("name");
    setConsumables(data || []);
  };

  const fetchMechanics = async () => {
    const { data } = await supabase.from("mechanics").select("*").order("name");
    setMechanics(data || []);
  };

  const fetchTrucks = async () => {
    const { data } = await supabase.from("trucks").select("*").order("code");
    setTrucks(data || []);
  };

  const fetchJobOrders = async () => {
    const { data } = await supabase
      .from("job_orders")
      .select("*")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false });
    setJobOrders(data || []);
  };

  const handleCheckout = async () => {
    if (!selectedConsumable || !selectedMechanic || !selectedTruck || !selectedJobOrder || quantityUsed <= 0) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const consumable = consumables.find(c => c.id === selectedConsumable);
      if (!consumable || consumable.quantity < quantityUsed) {
        throw new Error("Insufficient quantity available");
      }

      const { error: checkoutError } = await supabase.from("mechanic_consumable_checkouts").insert({
        consumable_id: selectedConsumable,
        mechanic_id: selectedMechanic,
        truck_id: selectedTruck,
        job_order_id: selectedJobOrder,
        quantity_used: quantityUsed,
        checked_out_by_user_id: userData.user.id,
        notes: notes || null
      });

      if (checkoutError) throw checkoutError;

      const newQuantity = consumable.quantity - quantityUsed;
      const newStatus = newQuantity > consumable.min_stock_level ? 'in_stock' : 
                        newQuantity > 0 ? 'low_stock' : 'out_of_stock';

      const { error: updateError } = await supabase
        .from("mechanic_consumables")
        .update({ 
          quantity: newQuantity,
          status: newStatus
        })
        .eq("id", selectedConsumable);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Consumable usage recorded successfully" });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setSelectedConsumable("");
    setSelectedMechanic("");
    setSelectedTruck("");
    setSelectedJobOrder("");
    setQuantityUsed(1);
    setNotes("");
  };

  const selectedConsumableData = consumables.find(c => c.id === selectedConsumable);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Use Consumable</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="consumable">Consumable *</Label>
            <Select value={selectedConsumable} onValueChange={setSelectedConsumable}>
              <SelectTrigger>
                <SelectValue placeholder="Select consumable" />
              </SelectTrigger>
              <SelectContent>
                {consumables.map((consumable) => (
                  <SelectItem key={consumable.id} value={consumable.id}>
                    {consumable.code} - {consumable.name} ({consumable.quantity} {consumable.unit} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mechanic">Mechanic *</Label>
              <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mechanic" />
                </SelectTrigger>
                <SelectContent>
                  {mechanics.map((mechanic) => (
                    <SelectItem key={mechanic.id} value={mechanic.id}>
                      {mechanic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="truck">Truck *</Label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                <SelectTrigger>
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      {truck.code} - {truck.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="jobOrder">Job Order *</Label>
            <Select value={selectedJobOrder} onValueChange={setSelectedJobOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Select job order" />
              </SelectTrigger>
              <SelectContent>
                {jobOrders.map((jo) => (
                  <SelectItem key={jo.id} value={jo.id}>
                    {jo.job_number} - {jo.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity Used *</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="quantity"
                type="number"
                min="0.01"
                step="0.01"
                max={selectedConsumableData?.quantity || 999999}
                value={quantityUsed}
                onChange={(e) => setQuantityUsed(parseFloat(e.target.value))}
                required
              />
              {selectedConsumableData && (
                <span className="text-sm text-muted-foreground">{selectedConsumableData.unit}</span>
              )}
            </div>
            {selectedConsumableData && (
              <p className="text-xs text-muted-foreground mt-1">
                Available: {selectedConsumableData.quantity} {selectedConsumableData.unit}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this usage..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCheckout}>Record Usage</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}