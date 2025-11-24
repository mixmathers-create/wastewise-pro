import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import QRCode from "qrcode";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const AddClientDialog = ({ profile, onAdded }: { profile: any; onAdded: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");

  const industries = [
    "Restaurant",
    "Hotel",
    "Shopping Mall",
    "Office Building",
    "Hospital",
    "School",
    "Factory",
    "Residential",
    "Retail Store",
    "Warehouse",
    "Government",
    "Other"
  ];
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [mtRequirement, setMtRequirement] = useState("0");
  const [collectionShift, setCollectionShift] = useState("AM");
  const [collectionDays, setCollectionDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState("active");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractExpiryDate, setContractExpiryDate] = useState("");

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (day: string) => {
    setCollectionDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const qrCode = `CLIENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      let contractFileUrl = null;
      if (contractFile) {
        const fileExt = contractFile.name.split('.').pop();
        const fileName = `${qrCode}-contract.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('client-contracts')
          .upload(fileName, contractFile);
        
        if (uploadError) throw uploadError;
        contractFileUrl = fileName;
      }

      const { error } = await supabase.from("clients").insert({
        name,
        industry,
        address,
        contact_info: contact,
        contact_person: contactPerson,
        contact_number: contactNumber,
        qr_code: qrCode,
        mt_requirement: parseFloat(mtRequirement) || 0,
        collection_shift: collectionShift,
        collection_days: collectionDays,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        status,
        contract_file_url: contractFileUrl,
        contract_expiry_date: contractExpiryDate || null,
      });

      if (error) throw error;

      toast({ title: "Client added successfully" });
      setOpen(false);
      setName("");
      setIndustry("");
      setAddress("");
      setContact("");
      setContactPerson("");
      setContactNumber("");
      setMtRequirement("0");
      setCollectionShift("AM");
      setCollectionDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
      setLatitude("");
      setLongitude("");
      setStatus("active");
      setContractFile(null);
      setContractExpiryDate("");
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
        <Button><Plus className="mr-2 h-4 w-4" />Add Client</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Select value={industry} onValueChange={setIndustry} required>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contact">Contact Info</Label>
            <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mtRequirement">MT Requirement (per collection)</Label>
            <Input 
              id="mtRequirement" 
              type="number" 
              step="0.01"
              value={mtRequirement} 
              onChange={(e) => setMtRequirement(e.target.value)} 
            />
          </div>
          <div>
            <Label htmlFor="collectionShift">Preferred Collection Shift</Label>
            <Select value={collectionShift} onValueChange={setCollectionShift}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM (Morning)</SelectItem>
                <SelectItem value="PM">PM (Afternoon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Collection Days</Label>
            <div className="grid grid-cols-4 gap-2">
              {days.map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox 
                    id={day} 
                    checked={collectionDays.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <Label htmlFor={day} className="cursor-pointer">{day}</Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input 
              id="latitude" 
              type="number" 
              step="0.000001"
              value={latitude} 
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g., 10.3181"
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input 
              id="longitude" 
              type="number" 
              step="0.000001"
              value={longitude} 
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g., 123.9059"
            />
          </div>
          <div>
            <Label htmlFor="status">Client Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="end_of_service">End of Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="contract">Contract PDF</Label>
            <Input 
              id="contract" 
              type="file" 
              accept="application/pdf"
              onChange={(e) => setContractFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <Label htmlFor="contractExpiry">Contract Expiry Date</Label>
            <Input 
              id="contractExpiry" 
              type="date"
              value={contractExpiryDate} 
              onChange={(e) => setContractExpiryDate(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Client"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;
