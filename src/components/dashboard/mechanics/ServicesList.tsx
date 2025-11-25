import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Trash2, Edit } from "lucide-react";
import { EditServiceDialog } from "./EditServiceDialog";

interface ServicesListProps {
  jobOrderId: string;
  onServicesUpdate?: () => void;
}

export function ServicesList({ jobOrderId, onServicesUpdate }: ServicesListProps) {
  const [services, setServices] = useState<any[]>([]);
  const [editingService, setEditingService] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, [jobOrderId]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from("job_order_services")
      .select("id,service_type,category,provider_name,description,cost,cost_added_at,created_at")
      .eq("job_order_id", jobOrderId)
      .order("created_at", { ascending: false });
    
    setServices(data || []);
    if (onServicesUpdate) onServicesUpdate();
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
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => setEditingService(service)}
                         >
                           <Edit className="h-4 w-4 mr-1" /> Edit
                         </Button>
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

        <EditServiceDialog
          service={editingService}
          open={!!editingService}
          onOpenChange={(open) => !open && setEditingService(null)}
          onSuccess={fetchServices}
        />
      </CardContent>
    </Card>
  );
}