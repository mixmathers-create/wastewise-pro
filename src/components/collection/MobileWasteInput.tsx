import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileInput } from "@/components/mobile/MobileInput";
import { Plus } from "lucide-react";

interface MobileWasteInputProps {
  onAddItem: (quantity: number, unit: string) => void;
}

export function MobileWasteInput({ onAddItem }: MobileWasteInputProps) {
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("kg");

  const handleAdd = () => {
    const qty = parseFloat(quantity);
    if (qty && qty > 0) {
      onAddItem(qty, unit);
      setQuantity("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Quantity</Label>
          <MobileInput
            type="number"
            value={quantity}
            onChange={setQuantity}
            placeholder="0.0"
            allowDecimal={true}
            maxLength={8}
          />
        </div>
        <div>
          <Label>Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="tons">tons</SelectItem>
              <SelectItem value="bags">bags</SelectItem>
              <SelectItem value="pieces">pieces</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button 
        type="button" 
        onClick={handleAdd} 
        className="w-full"
        disabled={!quantity || parseFloat(quantity) <= 0}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}
