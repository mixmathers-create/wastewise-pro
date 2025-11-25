import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditServiceDialogProps {
  service: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SERVICE_TYPES = [
  "Machine Shop",
  "Mechanic Shop",
  "Auto Electrical",
  "Tire Shop",
  "Body Shop",
  "Paint Shop",
  "Towing Service",
  "Parts Supplier",
  "Fabrication Shop",
  "Radiator Shop",
  "Transmission Specialist",
  "Brake Service",
  "AC Repair",
  "Other"
];

const CATEGORY_TYPES = [
  "Labor",
  "Professional Services",
  "Parts & Materials",
  "Equipment Rental",
  "Diagnostic Services",
  "Emergency Services",
  "Consulting",
  "Other"
];

export function EditServiceDialog({ service, open, onOpenChange, onSuccess }: EditServiceDialogProps) {
  const [serviceType, setServiceType] = useState("");
  const [category, setCategory] = useState("");
  const [providerName, setProviderName] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (service) {
      setServiceType(service.service_type || "");
      setCategory(service.category || "");
      setProviderName(service.provider_name || "");
      setDescription(service.description || "");
      setCost(service.cost?.toString() || "");
    }
  }, [service]);

  const handleSubmit = async () => {
    if (!serviceType || !category) {
      toast({ title: "Error", description: "Please select service type and category", variant: "destructive" });
      return;
    }

    try {
      const updateData: any = {
        service_type: serviceType,
        category: category,
        provider_name: providerName || null,
        description: description || null,
      };

      // Update cost if provided
      if (cost && parseFloat(cost) > 0) {
        updateData.cost = parseFloat(cost);
        if (!service.cost) {
          updateData.cost_added_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("job_order_services")
        .update(updateData)
        .eq("id", service.id);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: "Service updated successfully",
        duration: 2000
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="serviceType">Service Type *</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_TYPES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="providerName">Provider/Shop Name</Label>
            <Input
              id="providerName"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="e.g., ABC Auto Repair"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the service provided..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="cost">Cost</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₱</span>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Update Service</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
