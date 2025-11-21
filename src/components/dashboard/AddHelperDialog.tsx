import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Eye } from "lucide-react";
import { Camera, CameraResultType } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

const AddHelperDialog = ({ profile, onAdded }: { profile: any; onAdded: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const isMobile = Capacitor.isNativePlatform();

  const handlePhotoCapture = async () => {
    if (isMobile) {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri
        });
        
        const response = await fetch(image.webPath!);
        const blob = await response.blob();
        const file = new File([blob], "helper-photo.jpg", { type: "image/jpeg" });
        setPhotoFile(file);
        setPhotoPreview(image.webPath!);
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      document.getElementById('helper-photo-input')?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Generate HLP-123456789 format
      const numbers = Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
      const generatedId = `HLP-${numbers}`;
      const finalIdNumber = idNumber || generatedId;
      
      let photoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${finalIdNumber}-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('personnel-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;
        photoUrl = data.path;
      }

      const { error } = await supabase.from("helpers").insert({
        name,
        id_number: finalIdNumber,
        birthdate: birthdate || null,
        contact_number: contactNumber || null,
        photo_url: photoUrl,
      });

      if (error) throw error;

      toast({ title: "Helper added successfully" });
      setOpen(false);
      setName("");
      setIdNumber("");
      setBirthdate("");
      setContactNumber("");
      setPhotoFile(null);
      setPhotoPreview(null);
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
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Helper</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Helper</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="idNumber">ID Number (auto-generated HLP-XXXXXXXXX)</Label>
            <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="HLP-123456789" />
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
            <Label>Photo *</Label>
            <div className="flex gap-2 items-center">
              <Button type="button" variant="outline" onClick={handlePhotoCapture}>
                <Upload className="h-4 w-4 mr-2" />
                {isMobile ? 'Take Photo' : 'Upload Photo'}
              </Button>
              {photoPreview && (
                <Button type="button" variant="outline" size="sm" onClick={() => window.open(photoPreview, '_blank')}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}
            </div>
            <input
              id="helper-photo-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded" />
            )}
          </div>
          <Button type="submit" disabled={loading || !photoFile} className="w-full">
            {loading ? "Adding..." : "Add Helper"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddHelperDialog;
