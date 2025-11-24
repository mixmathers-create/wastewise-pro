import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFTS = ["AM", "PM"];

const DriverEditDialog = ({ 
  driver, 
  open, 
  onOpenChange, 
  onUpdated 
}: { 
  driver: any; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onUpdated: () => void;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [doubleShift, setDoubleShift] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");
  const [status, setStatus] = useState("available");
  const [suspensionStartDate, setSuspensionStartDate] = useState("");
  const [suspensionEndDate, setSuspensionEndDate] = useState("");
  const [leavesAvailable, setLeavesAvailable] = useState(15);

  useEffect(() => {
    if (driver) {
      setName(driver.name || "");
      setLicense(driver.license_number || "");
      setIdNumber(driver.id_number || "");
      setBirthdate(driver.birthdate || "");
      setContactNumber(driver.contact_number || "");
      setLicenseExpiryDate(driver.license_expiry_date || "");
      setStatus(driver.status || "available");
      setSuspensionStartDate(driver.suspension_start_date || "");
      setSuspensionEndDate(driver.suspension_end_date || "");
      setLeavesAvailable(driver.leaves_available ?? 15);
      
      const availability = driver.availability || { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], shifts: ["AM", "PM"], doubleShift: false };
      setAvailableDays(availability.days || []);
      setAvailableShifts(availability.shifts || []);
      setDoubleShift(availability.doubleShift || false);
    }
  }, [driver]);

  if (!driver) return null;

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
    
    // Validate suspension dates
    if (status === 'suspended') {
      if (!suspensionStartDate || !suspensionEndDate) {
        toast({ title: "Error", description: "Suspension dates are required when status is suspended", variant: "destructive" });
        return;
      }
      if (new Date(suspensionEndDate) < new Date(suspensionStartDate)) {
        toast({ title: "Error", description: "Suspension end date must be after start date", variant: "destructive" });
        return;
      }
    }
    
    setLoading(true);
    try {
      let licenseFileUrl = driver.license_file_url;
      
      // Upload new license file if provided
      if (licenseFile) {
        const fileExt = licenseFile.name.split('.').pop();
        const fileName = `${idNumber}-${Date.now()}.${fileExt}`;
        
        // Delete old file if exists
        if (driver.license_file_url) {
          await supabase.storage
            .from('driver-licenses')
            .remove([driver.license_file_url]);
        }
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('driver-licenses')
          .upload(fileName, licenseFile);

        if (uploadError) throw uploadError;
        licenseFileUrl = uploadData.path;
      }

      const { error } = await supabase
        .from("drivers")
        .update({
          name,
          license_number: license,
          id_number: idNumber,
          birthdate: birthdate || null,
          contact_number: contactNumber || null,
          license_file_url: licenseFileUrl,
          license_expiry_date: licenseExpiryDate || null,
          status,
          suspension_start_date: status === 'suspended' ? suspensionStartDate : null,
          suspension_end_date: status === 'suspended' ? suspensionEndDate : null,
          leaves_available: leavesAvailable,
          availability: {
            days: availableDays,
            shifts: availableShifts,
            doubleShift
          }
        })
        .eq("id", driver.id);

      if (error) throw error;

      toast({ title: "Driver updated successfully" });
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
          <DialogTitle>Edit Driver</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="license">License Number</Label>
              <Input id="license" value={license} onChange={(e) => setLicense(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="idNumber">ID Number</Label>
              <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="birthdate">Birth Date</Label>
              <Input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
            </div>
          </div>

          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="+63 XXX XXX XXXX" required />
          </div>

          <div>
            <Label htmlFor="leavesAvailable">Leaves Available</Label>
            <Input 
              id="leavesAvailable" 
              type="number" 
              value={leavesAvailable} 
              onChange={(e) => setLeavesAvailable(parseInt(e.target.value) || 0)} 
              min="0"
              required 
            />
          </div>

          <div className="border-t pt-4">
            <Label htmlFor="status">Employment Status</Label>
            <select 
              id="status" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="available">Available</option>
              <option value="suspended">Suspended</option>
              <option value="fired">Fired</option>
            </select>
          </div>

          {status === 'suspended' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="suspensionStart">Suspension Start Date</Label>
                <Input 
                  id="suspensionStart" 
                  type="date" 
                  value={suspensionStartDate} 
                  onChange={(e) => setSuspensionStartDate(e.target.value)} 
                  required
                />
              </div>
              <div>
                <Label htmlFor="suspensionEnd">Suspension End Date</Label>
                <Input 
                  id="suspensionEnd" 
                  type="date" 
                  value={suspensionEndDate} 
                  onChange={(e) => setSuspensionEndDate(e.target.value)} 
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <Label htmlFor="licenseExpiryDate">License Expiry Date</Label>
              <Input 
                id="licenseExpiryDate" 
                type="date" 
                value={licenseExpiryDate} 
                onChange={(e) => setLicenseExpiryDate(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="licenseFile">Update Driver's License (PDF/JPG)</Label>
              <Input
                id="licenseFile"
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
              />
              {driver.license_file_url && !licenseFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current file on record
                </p>
              )}
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
            {loading ? "Updating..." : "Update Driver"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DriverEditDialog;
