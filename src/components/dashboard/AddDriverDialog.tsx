import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload } from "lucide-react";

const AddDriverDialog = ({ profile, onAdded }: { profile: any; onAdded: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseFile) {
      toast({ title: "Error", description: "Driver's license file is required", variant: "destructive" });
      return;
    }

    if (!licenseExpiryDate) {
      toast({ title: "Error", description: "License expiry date is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const generatedId = idNumber || `DRV-${Date.now().toString().slice(-6)}`;
      
      // Upload license file
      const fileExt = licenseFile.name.split('.').pop();
      const fileName = `${generatedId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('driver-licenses')
        .upload(fileName, licenseFile);

      if (uploadError) throw uploadError;

      // Insert driver with license file URL
      const { error } = await supabase.from("drivers").insert({
        name,
        license_number: license,
        id_number: generatedId,
        birthdate: birthdate || null,
        contact_number: contactNumber || null,
        license_file_url: uploadData.path,
        license_expiry_date: licenseExpiryDate,
      });

      if (error) throw error;

      toast({ title: "Driver added successfully" });
      setOpen(false);
      setName("");
      setLicense("");
      setIdNumber("");
      setBirthdate("");
      setContactNumber("");
      setLicenseFile(null);
      setLicenseExpiryDate("");
      onAdded();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Add Driver</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Driver</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="license">License Number</Label>
            <Input id="license" value={license} onChange={(e) => setLicense(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="idNumber">ID Number (auto-generated if empty)</Label>
            <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="DRV-XXXXXX" />
          </div>
          <div>
            <Label htmlFor="birthdate">Birth Date</Label>
            <Input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="+63 XXX XXX XXXX" required />
          </div>
          <div>
            <Label htmlFor="licenseExpiryDate">License Expiry Date</Label>
            <Input 
              id="licenseExpiryDate" 
              type="date" 
              value={licenseExpiryDate} 
              onChange={(e) => setLicenseExpiryDate(e.target.value)} 
              required 
            />
          </div>
          <div>
            <Label htmlFor="licenseFile">Driver's License (PDF/JPG) *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="licenseFile"
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                required
                className="flex-1"
              />
              {licenseFile && (
                <Button type="button" variant="outline" size="sm" onClick={() => setLicenseFile(null)}>
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Upload front of driver's license (PDF or JPG)
            </p>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Driver"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDriverDialog;
