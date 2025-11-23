import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera as CameraIcon, Eye } from "lucide-react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

interface AddMechanicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddMechanicDialog({ open, onOpenChange, onSuccess }: AddMechanicDialogProps) {
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePhotoCapture = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      // Convert base64 to Blob
      const response = await fetch(image.dataUrl!);
      const blob = await response.blob();
      const file = new File([blob], "mechanic-photo.jpg", { type: "image/jpeg" });
      
      setPhotoFile(file);
      setPhotoPreview(image.dataUrl!);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to capture photo", 
        variant: "destructive" 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const numbers = Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
      const idNumber = `MEC-${numbers}`;
      let photoUrl = null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${idNumber}-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage.from('personnel-photos').upload(fileName, photoFile);
        if (uploadError) throw uploadError;
        photoUrl = data.path;
      }
      
      const { error } = await supabase.from("mechanics").insert({
        name, id_number: idNumber, contact_number: contactNumber || null,
        birthdate: birthdate || null, photo_url: photoUrl, status: "available",
        availability: { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], shifts: ["AM", "PM"] }
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
          <div>
            <Label>Photo *</Label>
            <div className="flex gap-2 items-center">
              <Button type="button" variant="outline" onClick={handlePhotoCapture}>
                <CameraIcon className="h-4 w-4 mr-2" />Take Photo
              </Button>
              {photoPreview && <Button type="button" variant="outline" size="sm" onClick={() => window.open(photoPreview, '_blank')}><Eye className="h-4 w-4 mr-2" />Preview</Button>}
            </div>
            {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded" />}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!photoFile}>Add Mechanic</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
