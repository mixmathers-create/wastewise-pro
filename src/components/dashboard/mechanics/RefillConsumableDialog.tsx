import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RefillConsumableDialogProps {
  consumable: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RefillConsumableDialog({ consumable, open, onOpenChange, onSuccess }: RefillConsumableDialogProps) {
  const [refillQuantity, setRefillQuantity] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (refillQuantity <= 0) {
      toast({ title: "Error", description: "Refill quantity must be greater than 0", variant: "destructive" });
      return;
    }

    try {
      const newQuantity = (consumable.quantity || 0) + refillQuantity;
      const status = newQuantity > consumable.min_stock_level ? 'in_stock' : newQuantity > 0 ? 'low_stock' : 'out_of_stock';

      const { error } = await supabase
        .from("mechanic_consumables")
        .update({
          quantity: newQuantity,
          status
        })
        .eq("id", consumable.id);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Refilled ${refillQuantity} ${consumable.unit}. New stock: ${newQuantity} ${consumable.unit}` 
      });
      onSuccess();
      setRefillQuantity(0);
      setNotes("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refill Consumable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Consumable</div>
            <div className="font-semibold">{consumable?.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{consumable?.code}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Current Stock</Label>
              <div className="text-2xl font-bold text-orange-600">
                {consumable?.quantity || 0} {consumable?.unit}
              </div>
            </div>
            <div>
              <Label>Min Stock Level</Label>
              <div className="text-xl font-semibold text-muted-foreground">
                {consumable?.min_stock_level} {consumable?.unit}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="refillQuantity">Refill Quantity *</Label>
            <Input 
              id="refillQuantity" 
              type="number" 
              min="0.01"
              step="0.01"
              value={refillQuantity || ""} 
              onChange={(e) => setRefillQuantity(parseFloat(e.target.value))} 
              placeholder="Enter quantity to add"
              required 
            />
            {refillQuantity > 0 && (
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">New total: </span>
                <span className="font-semibold text-green-600">
                  {((consumable?.quantity || 0) + refillQuantity).toFixed(2)} {consumable?.unit}
                </span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Supplier, batch number, etc."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Refill Stock</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
