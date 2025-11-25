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
import { Wrench, Send } from "lucide-react";

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
  plate_number: string;
  type: string;
}

export default function MechanicalReportForm() {
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
    fetchTrucks();
  }, []);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase.from("mechanical_reports").insert({
        reported_by: user.id,
        reporter_name: profile?.full_name || "Unknown",
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
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Submit Mechanical Report
        </CardTitle>
        <CardDescription>
          Report vehicle issues for mechanic diagnosis and action
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
