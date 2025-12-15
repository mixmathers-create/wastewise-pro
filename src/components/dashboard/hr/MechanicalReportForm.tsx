import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Wrench, Send, WifiOff } from "lucide-react";
import type { PendingMechanicalReport, Severity } from "@/lib/offlineDb";

const mechanicalReportSchema = z.object({
  truck_id: z.string().min(1, "Truck selection is required"),
  issue_description: z.string().min(20, "Description must be at least 20 characters"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  truck_operational: z.boolean(),
});

type MechanicalReportForm = z.infer<typeof mechanicalReportSchema>;

interface Truck {
  id: string;
  code: string;
  plate_number?: string | null;
  type: string;
}

interface MechanicalReportFormProps {
  isOnline?: boolean;
  profile?: any;
  cachedTrucks?: Truck[];
  createPendingMechanicalReport?: (data: Omit<PendingMechanicalReport, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  onOfflineSuccess?: () => void;
}

export default function MechanicalReportForm({
  isOnline = true,
  profile,
  cachedTrucks = [],
  createPendingMechanicalReport,
  onOfflineSuccess,
}: MechanicalReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  
  const form = useForm<MechanicalReportForm>({
    resolver: zodResolver(mechanicalReportSchema),
    defaultValues: {
      truck_id: "",
      issue_description: "",
      severity: "medium",
      truck_operational: true,
    },
  });

  useEffect(() => {
    if (isOnline) {
      fetchTrucks();
    } else {
      // Use cached trucks when offline
      setTrucks(cachedTrucks as Truck[]);
    }
  }, [isOnline, cachedTrucks]);

  const fetchTrucks = async () => {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .select("id, code, plate_number, type")
        .order("code");

      if (error) throw error;
      setTrucks(data || []);
    } catch (error: any) {
      console.error("Error fetching trucks:", error);
      toast.error("Failed to load trucks");
    }
  };

  const onSubmit = async (data: MechanicalReportForm) => {
    setIsSubmitting(true);
    try {
      const selectedTruck = trucks.find(t => t.id === data.truck_id);
      
      // Handle offline mode
      if (!isOnline) {
        if (!createPendingMechanicalReport || !profile) {
          toast.error("Profile information is required for offline submission");
          return;
        }

        await createPendingMechanicalReport({
          reporter_name: profile.full_name || "Unknown",
          truck_id: data.truck_id,
          truck_code: selectedTruck?.code || data.truck_id,
          issue_description: data.issue_description,
          severity: data.severity as Severity,
          truck_operational: data.truck_operational,
          report_date: new Date().toISOString().split('T')[0],
        });

        toast.success("Mechanical report saved offline. Will sync when online.");
        if (onOfflineSuccess) {
          onOfflineSuccess();
        }
        form.reset();
        return;
      }

      // Online mode
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase.from("mechanical_reports").insert({
        reported_by: user.id,
        reporter_name: userProfile?.full_name || "Unknown",
        report_date: new Date().toISOString().split('T')[0],
        ...data,
      });

      if (error) throw error;

      toast.success("Mechanical report submitted successfully. Mechanics have been notified.");
      form.reset();
    } catch (error: any) {
      console.error("Error submitting mechanical report:", error);
      toast.error(error.message || "Failed to submit mechanical report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Submit Mechanical Report
          </CardTitle>
          {!isOnline && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>
        <CardDescription>
          {!isOnline
            ? "Report will be saved locally and submitted when you're back online"
            : "Report vehicle issues for mechanic diagnosis and action"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="truck_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trucks.map((truck) => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.code} - {truck.plate_number || 'N/A'} ({truck.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="truck_operational"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Vehicle is Still Operational</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Can the vehicle still be safely operated?
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issue_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide detailed information about the mechanical issue, including symptoms, sounds, when it occurs, etc..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              <Send className="h-4 w-4 mr-2" />
              Submit Mechanical Report
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
