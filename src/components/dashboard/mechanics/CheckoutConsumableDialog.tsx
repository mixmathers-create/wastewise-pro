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
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [selectedConsumable, setSelectedConsumable] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [selectedJobOrder, setSelectedJobOrder] = useState("");
  const [quantityUsed, setQuantityUsed] = useState(1);
  const [notes, setNotes] = useState("");
  const [autoFilledTruck, setAutoFilledTruck] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchConsumables();
      fetchJobOrders();
    }
  }, [open]);

  useEffect(() => {
    if (selectedJobOrder) {
      handleJobOrderChange(selectedJobOrder);
    }
  }, [selectedJobOrder]);

  const fetchConsumables = async () => {
    const { data } = await supabase
      .from("mechanic_consumables")
      .select("*")
      .gt("quantity", 0)
      .order("name");
    setConsumables(data || []);
  };

  const fetchJobOrders = async () => {
    const { data } = await supabase
      .from("job_orders")
      .select("*, mechanics(id, name), trucks(id, code, plate_number)")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false });
    setJobOrders(data || []);
  };

  const handleJobOrderChange = async (jobOrderId: string) => {
    const jobOrder = jobOrders.find(jo => jo.id === jobOrderId);
    if (!jobOrder) return;

    // Auto-fill truck
    setAutoFilledTruck(jobOrder.trucks);

    // Fetch mechanics for this job order
    if (jobOrder.mechanic_ids && jobOrder.mechanic_ids.length > 0) {
      const { data: mechanicsData } = await supabase
        .from("mechanics")
        .select("*")
        .in("id", jobOrder.mechanic_ids)
        .order("name");
      setMechanics(mechanicsData || []);
      
      // Auto-select first mechanic if only one
      if (mechanicsData && mechanicsData.length === 1) {
        setSelectedMechanic(mechanicsData[0].id);
      } else {
        setSelectedMechanic("");
      }
    } else {
      setMechanics([]);
      setSelectedMechanic("");
    }
  };

  const handleCheckout = async () => {
    if (!selectedConsumable || !selectedMechanic || !selectedJobOrder || quantityUsed <= 0) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (!autoFilledTruck?.id) {
      toast({ title: "Error", description: "Selected job order has no truck assigned", variant: "destructive" });
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
        truck_id: autoFilledTruck.id,
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
    setSelectedJobOrder("");
    setQuantityUsed(1);
    setNotes("");
    setAutoFilledTruck(null);
    setMechanics([]);
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
            <Label htmlFor="jobOrder">Job Order *</Label>
            <Select value={selectedJobOrder} onValueChange={setSelectedJobOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Select job order first" />
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

          {autoFilledTruck && (
            <div>
              <Label>Truck (from Job Order)</Label>
              <Input value={`${autoFilledTruck.code} - ${autoFilledTruck.plate_number}`} disabled />
            </div>
          )}

          {mechanics.length > 0 && (
            <div>
              <Label htmlFor="mechanic">Mechanic *</Label>
              <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mechanic from job order" />
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
          )}

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