import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateJobOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateJobOrderDialog({ open, onOpenChange, onSuccess }: CreateJobOrderDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mechanicId, setMechanicId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [scheduledDate, setScheduledDate] = useState("");
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchMechanics();
      fetchTrucks();
    }
  }, [open]);

  const fetchMechanics = async () => {
    const { data } = await supabase.from("mechanics").select("*").order("name");
    setMechanics(data || []);
  };

  const fetchTrucks = async () => {
    const { data } = await supabase.from("trucks").select("*").order("code");
    setTrucks(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Generate ABC-123456789 format
      const letters = Array.from({length: 3}, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
      const numbers = Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
      const jobNumber = `${letters}-${numbers}`;

      const { error } = await supabase.from("job_orders").insert({
        job_number: jobNumber,
        title,
        description: description || null,
        mechanic_id: mechanicId || null,
        truck_id: truckId || null,
        priority,
        scheduled_date: scheduledDate || null,
        status: "pending",
        created_by: userData.user.id
      });

      if (error) throw error;

      toast({ title: "Success", description: "Job order created successfully" });
      onSuccess();
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setMechanicId("");
      setTruckId("");
      setPriority("medium");
      setScheduledDate("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Job Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mechanic">Assign to Mechanic</Label>
              <Select value={mechanicId} onValueChange={setMechanicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mechanic" />
                </SelectTrigger>
                <SelectContent>
                  {mechanics.map((mechanic) => (
                    <SelectItem key={mechanic.id} value={mechanic.id}>
                      {mechanic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="truck">Truck</Label>
              <Select value={truckId} onValueChange={setTruckId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      {truck.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input id="scheduledDate" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create Job Order</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
