import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditMechanicDialogProps {
  mechanic: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditMechanicDialog({ mechanic, open, onOpenChange, onSuccess }: EditMechanicDialogProps) {
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [status, setStatus] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [suspensionStart, setSuspensionStart] = useState("");
  const [suspensionEnd, setSuspensionEnd] = useState("");
  const [showSuspension, setShowSuspension] = useState(false);
  const { toast } = useToast();

  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const allShifts = ["AM", "PM"];

  useEffect(() => {
    if (mechanic) {
      setName(mechanic.name || "");
      setContactNumber(mechanic.contact_number || "");
      setBirthdate(mechanic.birthdate || "");
      setIdNumber(mechanic.id_number || "");
      setStatus(mechanic.status || "available");
      setAvailableDays(mechanic.availability?.days || ["Mon", "Tue", "Wed", "Thu", "Fri"]);
      setAvailableShifts(mechanic.availability?.shifts || ["AM", "PM"]);
      setSuspensionStart(mechanic.suspension_start_date || "");
      setSuspensionEnd(mechanic.suspension_end_date || "");
      setShowSuspension(mechanic.status === "suspended");
    }
  }, [mechanic]);

  const handleDayToggle = (day: string) => {
    setAvailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleShiftToggle = (shift: string) => {
    setAvailableShifts(prev =>
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    );
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === "suspended") {
      setShowSuspension(true);
      if (!suspensionStart) {
        setSuspensionStart(new Date().toISOString().split('T')[0]);
      }
    } else {
      setShowSuspension(false);
      setSuspensionStart("");
      setSuspensionEnd("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "suspended" && (!suspensionStart || !suspensionEnd)) {
      toast({ title: "Error", description: "Suspension dates are required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("mechanics")
        .update({
          name,
          contact_number: contactNumber || null,
          birthdate: birthdate || null,
          id_number: idNumber || null,
          status,
          availability: {
            days: availableDays,
            shifts: availableShifts
          },
          suspension_start_date: status === "suspended" ? suspensionStart : null,
          suspension_end_date: status === "suspended" ? suspensionEnd : null
        })
        .eq("id", mechanic.id);

      if (error) throw error;

      toast({ title: "Success", description: "Mechanic updated successfully" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Mechanic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="idNumber">ID Number</Label>
            <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} disabled />
          </div>
          <div>
            <Label htmlFor="contact">Contact Number</Label>
            <Input id="contact" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="birthdate">Birthdate</Label>
            <Input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
          </div>
          
          <div>
            <Label className="mb-2 block">Available Days</Label>
            <div className="flex flex-wrap gap-2">
              {allDays.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day}`}
                    checked={availableDays.includes(day)}
                    onCheckedChange={() => handleDayToggle(day)}
                  />
                  <label htmlFor={`day-${day}`} className="text-sm cursor-pointer">
                    {day}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Available Shifts</Label>
            <div className="flex gap-4">
              {allShifts.map((shift) => (
                <div key={shift} className="flex items-center space-x-2">
                  <Checkbox
                    id={`shift-${shift}`}
                    checked={availableShifts.includes(shift)}
                    onCheckedChange={() => handleShiftToggle(shift)}
                  />
                  <label htmlFor={`shift-${shift}`} className="text-sm cursor-pointer">
                    {shift}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="on_duty">On Duty</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showSuspension && (
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="suspensionStart">Suspension Start Date *</Label>
                <Input
                  id="suspensionStart"
                  type="date"
                  value={suspensionStart}
                  onChange={(e) => setSuspensionStart(e.target.value)}
                  required={status === "suspended"}
                />
              </div>
              <div>
                <Label htmlFor="suspensionEnd">Suspension End Date *</Label>
                <Input
                  id="suspensionEnd"
                  type="date"
                  value={suspensionEnd}
                  onChange={(e) => setSuspensionEnd(e.target.value)}
                  required={status === "suspended"}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
