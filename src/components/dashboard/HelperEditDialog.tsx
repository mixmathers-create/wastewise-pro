import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFTS = ["AM", "PM"];

const HelperEditDialog = ({ 
  helper, 
  open, 
  onOpenChange, 
  onUpdated 
}: { 
  helper: any; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onUpdated: () => void;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [doubleShift, setDoubleShift] = useState(false);

  useEffect(() => {
    if (helper) {
      setName(helper.name || "");
      setIdNumber(helper.id_number || "");
      setBirthdate(helper.birthdate || "");
      setContactNumber(helper.contact_number || "");
      
      const availability = helper.availability || { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], shifts: ["AM", "PM"], doubleShift: false };
      setAvailableDays(availability.days || []);
      setAvailableShifts(availability.shifts || []);
      setDoubleShift(availability.doubleShift || false);
    }
  }, [helper]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from("helpers")
        .update({
          name,
          id_number: idNumber,
          birthdate: birthdate || null,
          contact_number: contactNumber || null,
          availability: {
            days: availableDays,
            shifts: availableShifts,
            doubleShift
          }
        })
        .eq("id", helper.id);

      if (error) throw error;

      toast({ title: "Helper updated successfully" });
      onOpenChange(false);
      onUpdated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Helper</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="idNumber">ID Number</Label>
              <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthdate">Birth Date</Label>
              <Input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="+63 XXX XXX XXXX" required />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">Availability</h3>
            
            <div>
              <Label className="mb-2 block">Available Days</Label>
              <div className="grid grid-cols-4 gap-2">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`day-${day}`}
                      checked={availableDays.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <Label htmlFor={`day-${day}`} className="cursor-pointer">{day}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Available Shifts</Label>
              <div className="flex gap-4">
                {SHIFTS.map(shift => (
                  <div key={shift} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`shift-${shift}`}
                      checked={availableShifts.includes(shift)}
                      onCheckedChange={() => handleShiftToggle(shift)}
                    />
                    <Label htmlFor={`shift-${shift}`} className="cursor-pointer">{shift}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="doubleShift">Double Shift Available</Label>
                <p className="text-sm text-muted-foreground">Can work 2 consecutive shifts in a row</p>
              </div>
              <Switch 
                id="doubleShift"
                checked={doubleShift}
                onCheckedChange={setDoubleShift}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating..." : "Update Helper"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HelperEditDialog;
