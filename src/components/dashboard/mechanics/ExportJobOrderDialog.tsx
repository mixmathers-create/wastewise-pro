import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { generateCSV, downloadCSV } from "@/lib/csvUtils";
import { useToast } from "@/hooks/use-toast";

interface ExportJobOrderDialogProps {
  job: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportJobOrderDialog({ job, open, onOpenChange }: ExportJobOrderDialogProps) {
  const [consumableUsage, setConsumableUsage] = useState<any[]>([]);
  const [toolsUsed, setToolsUsed] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [mechanicsNames, setMechanicsNames] = useState("Unassigned");
  const { toast } = useToast();

  useEffect(() => {
    if (open && job) {
      fetchJobData();
    }
  }, [open, job]);

  const fetchJobData = async () => {
    // Fetch mechanics for this job order
    if (job.mechanic_ids && job.mechanic_ids.length > 0) {
      const { data: mechanicsData } = await supabase
        .from("mechanics")
        .select("name")
        .in("id", job.mechanic_ids);
      if (mechanicsData && mechanicsData.length > 0) {
        setMechanicsNames(mechanicsData.map(m => m.name).join(", "));
      }
    }

    // Fetch consumable usage for this job order
    const { data: checkouts } = await supabase
      .from("mechanic_consumable_checkouts")
      .select(`
        *,
        mechanic_consumables(name, unit, unit_cost)
      `)
      .eq("job_order_id", job.id);

    if (checkouts) {
      setConsumableUsage(checkouts);
      
      // Calculate total consumable costs
      const consumableCost = checkouts.reduce((sum, checkout) => {
        const unitCost = checkout.mechanic_consumables?.unit_cost || 0;
        return sum + (checkout.quantity_used * unitCost);
      }, 0);
      
      setTotalCost(consumableCost);
    }

    // Fetch tools used for this job order
    const { data: toolCheckouts } = await supabase
      .from("tool_checkouts")
      .select(`
        *,
        tools(name, code)
      `)
      .eq("job_order_id", job.id);

    if (toolCheckouts) {
      setToolsUsed(toolCheckouts);
    }

    // Calculate man hours
    if (job.started_at) {
      const totalMinutes = job.total_active_minutes || 0;
      setTotalHours(totalMinutes / 60);
    }
  };

  const handleExport = () => {
    const csvData = [
      { Label: 'Job Order #', Value: job.job_number },
      { Label: 'Title', Value: job.title },
      { Label: 'Truck', Value: job.trucks?.code || 'N/A' },
      { Label: 'Mechanics', Value: mechanicsNames },
      { Label: 'Priority', Value: job.priority },
      { Label: 'Status', Value: job.status },
      { Label: 'Scheduled Date', Value: job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM dd, yyyy') : 'N/A' },
      { Label: 'Started', Value: job.started_at ? format(new Date(job.started_at), 'MMM dd, yyyy HH:mm') : 'Not started' },
      { Label: 'Completed', Value: job.completed_at ? format(new Date(job.completed_at), 'MMM dd, yyyy HH:mm') : 'Not completed' },
      { Label: 'Total Man Hours', Value: totalHours.toFixed(2) },
      { Label: '', Value: '' },
      { Label: 'TOOLS USED', Value: '' },
      ...toolsUsed.map(tool => ({
        Label: tool.tools?.name || 'Unknown Tool',
        Value: `${tool.tools?.code || 'N/A'} - Checked Out: ${format(new Date(tool.checked_out_at), 'MMM dd, yyyy HH:mm')}`
      })),
      { Label: '', Value: '' },
      { Label: 'CONSUMABLES USED', Value: '' },
      ...consumableUsage.map(usage => ({
        Label: usage.mechanic_consumables?.name,
        Value: `${usage.quantity_used} ${usage.mechanic_consumables?.unit} @ ₱${usage.mechanic_consumables?.unit_cost} = ₱${(usage.quantity_used * (usage.mechanic_consumables?.unit_cost || 0)).toFixed(2)}`
      })),
      { Label: '', Value: '' },
      { Label: 'Total Consumables Cost', Value: `₱${totalCost.toFixed(2)}` }
    ];

    const csv = generateCSV(csvData, ['Label', 'Value']);
    downloadCSV(csv, `job-order-${job.job_number}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Success", description: "Job order exported" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Job Order - {job?.job_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Total Man Hours:</span> {totalHours.toFixed(2)} hours
            </div>
            <div>
              <span className="font-semibold">Total Consumables Cost:</span> ₱{totalCost.toFixed(2)}
            </div>
          </div>
          
          {toolsUsed.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Tools Used:</h4>
              <ul className="space-y-1 text-sm">
                {toolsUsed.map((tool, idx) => (
                  <li key={idx}>
                    {tool.tools?.code} - {tool.tools?.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {consumableUsage.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Consumables Used:</h4>
              <ul className="space-y-1 text-sm">
                {consumableUsage.map((usage, idx) => (
                  <li key={idx}>
                    {usage.mechanic_consumables?.name}: {usage.quantity_used} {usage.mechanic_consumables?.unit} 
                    @ ₱{usage.mechanic_consumables?.unit_cost} = ₱{(usage.quantity_used * (usage.mechanic_consumables?.unit_cost || 0)).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export to CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}