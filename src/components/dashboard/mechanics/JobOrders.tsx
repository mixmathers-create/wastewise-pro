import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, PauseCircle, Trash2, Play, Download, FileSpreadsheet, Wrench, Eye, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { generateCSV, downloadCSV } from "@/lib/csvUtils";
import { CreateJobOrderDialog } from "./CreateJobOrderDialog";
import { CompleteJobOrderDialog } from "./CompleteJobOrderDialog";
import { SuspendJobOrderDialog } from "./SuspendJobOrderDialog";
import { ExportJobOrderDialog } from "./ExportJobOrderDialog";
import { AddServiceDialog } from "./AddServiceDialog";
import { ServicesList } from "./ServicesList";
import { ViewJobOrderDialog } from "./ViewJobOrderDialog";
import { JobOrderCommentsDialog } from "./JobOrderCommentsDialog";

export function JobOrders() {
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [completedJobOrders, setCompletedJobOrders] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [completingJob, setCompletingJob] = useState<any>(null);
  const [suspendingJob, setSuspendingJob] = useState<any>(null);
  const [exportingJob, setExportingJob] = useState<any>(null);
  const [addingServiceToJob, setAddingServiceToJob] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [viewingJob, setViewingJob] = useState<any>(null);
  const [commentingJob, setCommentingJob] = useState<any>(null);
  const [selectedJobOrders, setSelectedJobOrders] = useState<Set<string>>(new Set());
  const [activeTimers, setActiveTimers] = useState<{[key: string]: number}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
  const { toast } = useToast();
  
  const ITEMS_PER_PAGE = 5;
  const MAX_ITEMS = 100;

  useEffect(() => {
    fetchJobOrders();
    checkEndOfDayJobs();
    
    // Update timers every second for in-progress jobs
    const interval = setInterval(() => {
      updateActiveTimers();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const updateActiveTimers = () => {
    const newTimers: {[key: string]: number} = {};
    jobOrders.forEach(job => {
      if (job.status === 'in_progress' && job.last_resume_at) {
        const elapsed = Math.floor((Date.now() - new Date(job.last_resume_at).getTime()) / 1000);
        const totalMinutes = job.total_active_minutes || 0;
        newTimers[job.id] = totalMinutes * 60 + elapsed;
      }
    });
    setActiveTimers(newTimers);
  };

  const fetchJobOrders = async () => {
    // Fetch active job orders
    const { data: activeData } = await supabase
      .from("job_orders")
      .select("id,job_number,title,status,priority,scheduled_date,created_at,started_at,total_active_minutes,last_resume_at,mechanic_ids,mechanic_comments,description,truck_id,trucks(code)")
      .in("status", ["pending", "in_progress", "suspended"])
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS);
    
    // Fetch completed job orders
    const { data: completedData } = await supabase
      .from("job_orders")
      .select("id,job_number,title,status,priority,scheduled_date,created_at,completed_at,total_active_minutes,mechanic_ids,description,mechanic_comments,truck_id,trucks(code)")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(MAX_ITEMS);
    
    // Process active job orders
    if (activeData && activeData.length > 0) {
      const allMechanicIds = [...new Set(activeData.flatMap(job => job.mechanic_ids || []))];
      
      if (allMechanicIds.length > 0) {
        const { data: mechanicsData } = await supabase
          .from("mechanics")
          .select("id,name")
          .in("id", allMechanicIds);
        
        const mechanicsMap = new Map(mechanicsData?.map(m => [m.id, m]) || []);
        
        const jobOrdersWithMechanics = activeData.map(job => ({
          ...job,
          mechanics: (job.mechanic_ids || []).map(id => mechanicsMap.get(id)).filter(Boolean)
        }));
        
        setJobOrders(jobOrdersWithMechanics);
      } else {
        setJobOrders(activeData);
      }
    } else {
      setJobOrders([]);
    }

    // Process completed job orders
    if (completedData && completedData.length > 0) {
      const allCompletedMechanicIds = [...new Set(completedData.flatMap(job => job.mechanic_ids || []))];
      
      if (allCompletedMechanicIds.length > 0) {
        const { data: mechanicsData } = await supabase
          .from("mechanics")
          .select("id,name")
          .in("id", allCompletedMechanicIds);
        
        const mechanicsMap = new Map(mechanicsData?.map(m => [m.id, m]) || []);
        
        const completedWithMechanics = completedData.map(job => ({
          ...job,
          mechanics: (job.mechanic_ids || []).map(id => mechanicsMap.get(id)).filter(Boolean)
        }));
        
        setCompletedJobOrders(completedWithMechanics);
      } else {
        setCompletedJobOrders(completedData);
      }
    } else {
      setCompletedJobOrders([]);
    }
  };

  const handleStart = async (job: any) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("job_orders")
        .update({
          status: "in_progress",
          started_at: job.started_at || now,
          last_resume_at: now,
          updated_at: now
        })
        .eq("id", job.id);

      if (error) throw error;
      toast({ title: "Success", description: "Job order started" });
      fetchJobOrders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job order?")) return;

    try {
      const { error } = await supabase.from("job_orders").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Job order deleted" });
      fetchJobOrders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const checkEndOfDayJobs = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour >= 18) {
      const today = now.toISOString().split('T')[0];
      
      const { data: openJobs } = await supabase
        .from("job_orders")
        .select("id,job_number,status,scheduled_date")
        .eq("status", "in_progress")
        .lte("scheduled_date", today);

      if (openJobs && openJobs.length > 0) {
        toast({
          title: "Pending Job Orders",
          description: `${openJobs.length} job order(s) are still open. Please add remarks or complete them.`,
          variant: "destructive"
        });
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleJobOrderSelection = (jobId: string) => {
    const newSelection = new Set(selectedJobOrders);
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId);
    } else {
      newSelection.add(jobId);
    }
    setSelectedJobOrders(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedJobOrders.size === jobOrders.length) {
      setSelectedJobOrders(new Set());
    } else {
      setSelectedJobOrders(new Set(jobOrders.map(j => j.id)));
    }
  };

  const handleMassExport = async () => {
    if (selectedJobOrders.size === 0) {
      toast({ title: "Error", description: "Please select at least one job order", variant: "destructive" });
      return;
    }

    try {
      const selectedJobs = jobOrders.filter(j => selectedJobOrders.has(j.id));
      const allData: any[] = [];

      for (const job of selectedJobs) {
        // Fetch mechanics for this job
        let mechanicsNames = "Unassigned";
        if (job.mechanic_ids && job.mechanic_ids.length > 0) {
          const { data: mechanicsData } = await supabase
            .from("mechanics")
            .select("name")
            .in("id", job.mechanic_ids);
          if (mechanicsData && mechanicsData.length > 0) {
            mechanicsNames = mechanicsData.map(m => m.name).join(", ");
          }
        }

        // Fetch consumables
        const { data: checkouts } = await supabase
          .from("mechanic_consumable_checkouts")
          .select(`
            *,
            mechanic_consumables(name, unit, unit_cost)
          `)
          .eq("job_order_id", job.id);

        const consumableCost = (checkouts || []).reduce((sum, checkout) => {
          const unitCost = checkout.mechanic_consumables?.unit_cost || 0;
          return sum + (checkout.quantity_used * unitCost);
        }, 0);

        // Fetch tools
        const { data: toolCheckouts } = await supabase
          .from("tool_checkouts")
          .select(`
            *,
            tools(name, code)
          `)
          .eq("job_order_id", job.id);

        // Fetch third-party services
        const { data: services } = await supabase
          .from("job_order_services")
          .select("id,service_type,category,cost,provider_name")
          .eq("job_order_id", job.id);

        const serviceCost = (services || []).reduce((sum, s) => sum + (s.cost || 0), 0);
        const totalCost = consumableCost + serviceCost;

        const totalHours = (job.total_active_minutes || 0) / 60;
        const toolsList = (toolCheckouts || []).map(t => t.tools?.code).filter(Boolean).join(", ");
        const consumablesList = (checkouts || []).map(c => 
          `${c.mechanic_consumables?.name} (${c.quantity_used} ${c.mechanic_consumables?.unit})`
        ).join("; ");
        const servicesList = (services || []).map(s => 
          `${s.service_type} - ${s.provider_name || 'N/A'} (₱${(s.cost || 0).toFixed(2)})`
        ).join("; ");
        
        // Extract comments from mechanic_comments and description
        const mechanicComments = (job.mechanic_comments || []).map((c: any) => 
          `[${format(new Date(c.created_at), 'MMM dd HH:mm')}] ${c.user_name}: ${c.comment}`
        ).join(" | ");
        
        const descriptionText = job.description || 'N/A';

        allData.push({
          'Job Order #': job.job_number,
          'Title': job.title,
          'Truck': job.trucks?.code || 'N/A',
          'Mechanics': mechanicsNames,
          'Priority': job.priority,
          'Status': job.status,
          'Scheduled Date': job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM dd, yyyy') : 'N/A',
          'Started': job.started_at ? format(new Date(job.started_at), 'MMM dd, yyyy HH:mm') : 'Not started',
          'Completed': job.completed_at ? format(new Date(job.completed_at), 'MMM dd, yyyy HH:mm') : 'Not completed',
          'Total Man Hours': totalHours.toFixed(2),
          'Tools Used': toolsList || 'None',
          'Consumables Used': consumablesList || 'None',
          'Consumables Cost': `₱${consumableCost.toFixed(2)}`,
          'Third-Party Services': servicesList || 'None',
          'Services Cost': `₱${serviceCost.toFixed(2)}`,
          'Total Cost': `₱${totalCost.toFixed(2)}`,
          'Description & Remarks': descriptionText,
          'Mechanic Comments': mechanicComments || 'No comments'
        });
      }

      const csv = generateCSV(allData, Object.keys(allData[0]));
      downloadCSV(csv, `job-orders-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
      toast({ title: "Success", description: `${selectedJobOrders.size} job order(s) exported` });
      setSelectedJobOrders(new Set());
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="active">Active Job Orders ({jobOrders.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed Job Orders ({completedJobOrders.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="active">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Job Orders</CardTitle>
              <div className="flex gap-2">
                {selectedJobOrders.size > 0 && (
                  <Button variant="outline" onClick={handleMassExport}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Selected ({selectedJobOrders.size})
                  </Button>
                )}
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create Job Order
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedJobOrders.size === jobOrders.length && jobOrders.length > 0}
                      onCheckedChange={toggleAllSelection}
                    />
                  </TableHead>
                  <TableHead>Job #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Mechanic</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time Elapsed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((job) => (
                  <>
                    <TableRow key={job.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedJobOrders.has(job.id)}
                          onCheckedChange={() => toggleJobOrderSelection(job.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{job.job_number}</TableCell>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.trucks?.code || "N/A"}</TableCell>
                      <TableCell>
                        {job.mechanics && job.mechanics.length > 0 
                          ? job.mechanics.map((m: any) => m.name).join(", ")
                          : "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.priority === "high" ? "bg-red-100 text-red-800" :
                          job.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                          "bg-green-100 text-green-800"
                        }`}>
                          {job.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.status === "suspended" ? "bg-orange-100 text-orange-800" :
                          job.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">
                        {job.status === 'in_progress' && activeTimers[job.id] 
                          ? formatTime(activeTimers[job.id])
                          : job.total_active_minutes 
                          ? formatTime(job.total_active_minutes * 60)
                          : '00:00:00'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingJob(job)}
                          >
                            <FileText className="h-4 w-4 mr-1" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Services
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCommentingJob(job)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" /> 
                            Comments {job.mechanic_comments?.length > 0 && `(${job.mechanic_comments.length})`}
                          </Button>
                          {job.status === "pending" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleStart(job)}
                            >
                              <Play className="h-4 w-4 mr-1" /> Start
                            </Button>
                          )}
                          {(job.status === "in_progress" || job.status === "suspended") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAddingServiceToJob(job.id)}
                            >
                              <Wrench className="h-4 w-4 mr-1" /> Add Service
                            </Button>
                          )}
                          {job.status === "in_progress" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCompletingJob(job)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSuspendingJob(job)}
                              >
                                <PauseCircle className="h-4 w-4 mr-1" /> Suspend
                              </Button>
                            </>
                          )}
                          {job.status === "suspended" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleStart(job)}
                              >
                                <Play className="h-4 w-4 mr-1" /> Resume
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCompletingJob(job)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(job.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedJobId === job.id && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/50">
                          <ServicesList 
                            jobOrderId={job.id} 
                            onServicesUpdate={fetchJobOrders}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
            {jobOrders.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(jobOrders.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(jobOrders.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage >= Math.ceil(jobOrders.length / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="completed">
        <Card>
          <CardHeader>
            <CardTitle>Completed Job Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Mechanic</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Total Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedJobOrders.slice((completedCurrentPage - 1) * ITEMS_PER_PAGE, completedCurrentPage * ITEMS_PER_PAGE).map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono">{job.job_number}</TableCell>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.trucks?.code || "N/A"}</TableCell>
                    <TableCell>
                      {job.mechanics && job.mechanics.length > 0 
                        ? job.mechanics.map((m: any) => m.name).join(", ")
                        : "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        job.priority === "high" ? "bg-red-100 text-red-800" :
                        job.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {job.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      {job.completed_at ? format(new Date(job.completed_at), "MMM dd, yyyy HH:mm") : "N/A"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {job.total_active_minutes ? formatTime(job.total_active_minutes * 60) : '00:00:00'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingJob(job)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExportingJob(job)}
                        >
                          <Download className="h-4 w-4 mr-1" /> Export
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(job.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {completedJobOrders.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompletedCurrentPage(p => Math.max(1, p - 1))}
                  disabled={completedCurrentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {completedCurrentPage} of {Math.ceil(completedJobOrders.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompletedCurrentPage(p => Math.min(Math.ceil(completedJobOrders.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={completedCurrentPage >= Math.ceil(completedJobOrders.length / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <CreateJobOrderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchJobOrders}
      />

      {completingJob && (
        <CompleteJobOrderDialog
          job={completingJob}
          open={!!completingJob}
          onOpenChange={(open) => !open && setCompletingJob(null)}
          onSuccess={fetchJobOrders}
        />
      )}

      {suspendingJob && (
        <SuspendJobOrderDialog
          job={suspendingJob}
          open={!!suspendingJob}
          onOpenChange={(open) => !open && setSuspendingJob(null)}
          onSuccess={fetchJobOrders}
        />
      )}

      {exportingJob && (
        <ExportJobOrderDialog
          job={exportingJob}
          open={!!exportingJob}
          onOpenChange={(open) => !open && setExportingJob(null)}
        />
      )}

      {addingServiceToJob && (
        <AddServiceDialog
          jobOrderId={addingServiceToJob}
          open={!!addingServiceToJob}
          onOpenChange={(open) => !open && setAddingServiceToJob(null)}
          onSuccess={fetchJobOrders}
        />
      )}

      {viewingJob && (
        <ViewJobOrderDialog
          job={viewingJob}
          open={!!viewingJob}
          onOpenChange={(open) => !open && setViewingJob(null)}
        />
      )}

      {commentingJob && (
        <JobOrderCommentsDialog
          job={commentingJob}
          open={!!commentingJob}
          onOpenChange={(open) => !open && setCommentingJob(null)}
          onSuccess={fetchJobOrders}
        />
      )}
    </Tabs>
  );
}