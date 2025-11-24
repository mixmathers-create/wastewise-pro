import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ServicesListProps {
  jobOrderId: string;
  onServicesUpdate?: () => void;
}

export function ServicesList({ jobOrderId, onServicesUpdate }: ServicesListProps) {
  const [services, setServices] = useState<any[]>([]);
  const [editingCost, setEditingCost] = useState<string | null>(null);
  const [costValue, setCostValue] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, [jobOrderId]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from("job_order_services")
      .select("*")
      .eq("job_order_id", jobOrderId)
      .order("created_at", { ascending: false });
    
    setServices(data || []);
    if (onServicesUpdate) onServicesUpdate();
  };

  const handleAddCost = async (serviceId: string) => {
    if (!costValue || parseFloat(costValue) <= 0) {
      toast({ title: "Error", description: "Please enter a valid cost", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("job_order_services")
        .update({
          cost: parseFloat(costValue),
          cost_added_at: new Date().toISOString()
        })
        .eq("id", serviceId);

      if (error) throw error;

      toast({ title: "Success", description: "Cost added successfully" });
      setEditingCost(null);
      setCostValue("");
      fetchServices();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase
        .from("job_order_services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;

      toast({ title: "Success", description: "Service deleted" });
      fetchServices();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const totalCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);
  const unpaidServices = services.filter(s => !s.cost || s.cost === 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Third-Party Services</CardTitle>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No third-party services added</p>
        ) : (
          <>
            <div className="flex gap-4 mb-4 text-sm">
              <div>
                <span className="font-semibold">Total Cost:</span> ₱{totalCost.toFixed(2)}
              </div>
              {unpaidServices > 0 && (
                <div className="text-destructive">
                  <span className="font-semibold">{unpaidServices}</span> service(s) without cost
                </div>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>{service.service_type}</TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell>{service.provider_name || "N/A"}</TableCell>
                    <TableCell className="max-w-xs truncate">{service.description || "N/A"}</TableCell>
                    <TableCell>
                      {service.cost ? (
                        <span className="font-mono">₱{service.cost.toFixed(2)}</span>
                      ) : (
                        <span className="text-destructive">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!service.cost && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCost(service.id);
                              setCostValue("");
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-1" /> Add Cost
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        <Dialog open={!!editingCost} onOpenChange={(open) => !open && setEditingCost(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Service Cost</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cost">Cost Amount *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">₱</span>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={costValue}
                    onChange={(e) => setCostValue(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCost(null)}>
                  Cancel
                </Button>
                <Button onClick={() => editingCost && handleAddCost(editingCost)}>
                  Add Cost
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}