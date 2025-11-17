import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Client {
  id: string;
  name: string;
  industry: string;
  address?: string;
  contact_info?: string;
  contact_person?: string;
  contact_number?: string;
  mt_requirement?: number;
  collection_days?: string[];
  collection_shift?: string;
  latitude?: number | null;
  longitude?: number | null;
}

const ClientEditDialog = ({ 
  client, 
  open, 
  onOpenChange, 
  onUpdated 
}: { 
  client: Client; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onUpdated: () => void;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(client);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    setFormData(client);
  }, [client]);

  const toggleDay = (day: string) => {
    const currentDays = formData.collection_days || [];
    setFormData({
      ...formData,
      collection_days: currentDays.includes(day) 
        ? currentDays.filter(d => d !== day) 
        : [...currentDays, day]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: formData.name,
          industry: formData.industry,
          address: formData.address,
          contact_info: formData.contact_info,
          contact_person: formData.contact_person,
          contact_number: formData.contact_number,
          mt_requirement: formData.mt_requirement || 0,
          collection_shift: formData.collection_shift || "AM",
          collection_days: formData.collection_days || [],
          latitude: formData.latitude,
          longitude: formData.longitude,
        })
        .eq("id", client.id);

      if (error) throw error;

      toast({ title: "Client updated successfully" });
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
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div>
            <Label>Industry</Label>
            <Input value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} required />
          </div>
          <div>
            <Label>MT Requirement</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.mt_requirement || 0} 
              onChange={(e) => setFormData({...formData, mt_requirement: parseFloat(e.target.value)})} 
            />
          </div>
          <div>
            <Label>Collection Shift</Label>
            <Select value={formData.collection_shift || "AM"} onValueChange={(val) => setFormData({...formData, collection_shift: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Latitude</Label>
            <Input 
              type="number" 
              step="0.000001"
              value={formData.latitude || ""} 
              onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value) || null})} 
              placeholder="e.g., 10.3181"
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input 
              type="number" 
              step="0.000001"
              value={formData.longitude || ""} 
              onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value) || null})} 
              placeholder="e.g., 123.9059"
            />
          </div>
          <div className="space-y-2">
            <Label>Collection Days</Label>
            <div className="grid grid-cols-4 gap-2">
              {days.map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`edit-${day}`}
                    checked={(formData.collection_days || []).includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <Label htmlFor={`edit-${day}`}>{day}</Label>
                </div>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientEditDialog;
