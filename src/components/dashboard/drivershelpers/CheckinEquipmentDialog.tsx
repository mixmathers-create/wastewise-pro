import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CheckinEquipmentDialogProps {
  checkout: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CheckinEquipmentDialog({ checkout, open, onOpenChange, onSuccess }: CheckinEquipmentDialogProps) {
  const [returnQuantity, setReturnQuantity] = useState(checkout?.quantity || 1);
  const { toast } = useToast();

  const handleCheckin = async () => {
    if (returnQuantity > checkout.quantity) {
      toast({ title: "Error", description: "Cannot return more than checked out", variant: "destructive" });
      return;
    }

    try {
      const { error: checkoutError } = await supabase
        .from("equipment_checkouts")
        .update({
          checked_in_at: new Date().toISOString(),
          status: "returned"
        })
        .eq("id", checkout.id);

      if (checkoutError) throw checkoutError;

      const { data: equipmentData } = await supabase
        .from("equipment_inventory")
        .select("quantity")
        .eq("id", checkout.equipment_id)
        .single();

      if (equipmentData) {
        const newQuantity = equipmentData.quantity + returnQuantity;
        const { error: updateError } = await supabase
          .from("equipment_inventory")
          .update({ 
            quantity: newQuantity,
            status: "available"
          })
          .eq("id", checkout.equipment_id);

        if (updateError) throw updateError;
      }

      toast({ title: "Success", description: "Equipment checked in successfully" });
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
          <DialogTitle>Check In Equipment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">
              {checkout?.equipment_inventory?.code} - {checkout?.equipment_inventory?.name}
            </p>
            <p className="text-sm text-muted-foreground">
              Checked out quantity: {checkout?.quantity}
            </p>
          </div>
          <div>
            <Label htmlFor="quantity">Return Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={checkout?.quantity}
              value={returnQuantity}
              onChange={(e) => setReturnQuantity(parseInt(e.target.value))}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCheckin}>Confirm Check In</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
