import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddMechanicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddMechanicDialog({ open, onOpenChange, onSuccess }: AddMechanicDialogProps) {
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Generate ABC-123456789 format
      const letters = Array.from({length: 3}, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
      const numbers = Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
      const idNumber = `${letters}-${numbers}`;
      
      const { error } = await supabase.from("mechanics").insert({
        name,
        id_number: idNumber,
        contact_number: contactNumber || null,
        birthdate: birthdate || null,
        status: "available",
        availability: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          shifts: ["AM", "PM"]
        }
      });

      if (error) throw error;

      toast({ title: "Success", description: `Mechanic added with ID: ${idNumber}` });
      onSuccess();
      onOpenChange(false);
      setName("");
      setContactNumber("");
      setBirthdate("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Mechanic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="contact">Contact Number</Label>
            <Input id="contact" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="birthdate">Birthdate</Label>
            <Input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add Mechanic</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
