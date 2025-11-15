import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

const AddHelperDialog = ({ profile, onAdded }: { profile: any; onAdded: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Generate ID number
      const generatedId = `HLP-${Date.now().toString().slice(-6)}`;
      
      const { error } = await supabase.from("helpers").insert({
        team_id: profile?.team_id || "00000000-0000-0000-0000-000000000001",
        name,
        id_number: idNumber || generatedId,
        birthdate: birthdate || null,
        contact_number: contactNumber || null,
      });

      if (error) throw error;

      toast({ title: "Helper added successfully" });
      setOpen(false);
      setName("");
      setIdNumber("");
      setBirthdate("");
      setContactNumber("");
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
        <Button><Plus className="mr-2 h-4 w-4" />Add Helper</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Helper</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="idNumber">ID Number (auto-generated if empty)</Label>
            <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="HLP-XXXXXX" />
          </div>
          <div>
            <Label htmlFor="birthdate">Birth Date</Label>
            <Input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="+63 XXX XXX XXXX" required />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Helper"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddHelperDialog;
