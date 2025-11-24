import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

const leaveFormSchema = z.object({
  personnel_type: z.enum(["driver", "helper", "mechanic", "recycler", "management"]),
  personnel_id: z.string().min(1, "Please select personnel"),
  personnel_id_number: z.string().min(1, "Personnel ID number is required for confirmation"),
  leave_type: z.enum(["sick", "vacation", "emergency", "medical", "personal", "unpaid"]),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  reason: z.string().min(10, "Please provide a detailed reason (at least 10 characters)"),
});

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

const LeaveFilingForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [availableLeaves, setAvailableLeaves] = useState<number>(0);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      personnel_type: "driver",
      personnel_id: "",
      personnel_id_number: "",
      leave_type: "vacation",
      start_date: "",
      end_date: "",
      reason: "",
    },
  });

  const personnelType = form.watch("personnel_type");
  const leaveType = form.watch("leave_type");
  const personnelId = form.watch("personnel_id");
  const startDate = form.watch("start_date");
  const endDate = form.watch("end_date");

  useEffect(() => {
    fetchPersonnel();
  }, [personnelType]);

  useEffect(() => {
    if (personnelId) {
      checkAvailableLeaves();
    }
  }, [personnelId]);

  useEffect(() => {
    if (startDate && endDate) {
      const days = calculateLeaveDays(startDate, endDate);
      if (days > availableLeaves && leaveType !== "unpaid") {
        setInsufficientCredits(true);
        form.setValue("leave_type", "unpaid");
        toast({
          title: "Insufficient Leave Credits",
          description: `You only have ${availableLeaves} leave days available. This leave has been set to unpaid.`,
          variant: "destructive",
        });
      } else {
        setInsufficientCredits(false);
      }
    }
  }, [startDate, endDate, availableLeaves]);

  const fetchPersonnel = async () => {
    const { data } = await supabase
      .from(`${personnelType}s`)
      .select("id, name, id_number, leaves_available")
      .order("name");
    
    setPersonnel(data || []);
  };

  const checkAvailableLeaves = async () => {
    const selectedPerson = personnel.find(p => p.id === personnelId);
    if (selectedPerson) {
      setAvailableLeaves(selectedPerson.leaves_available || 0);
    }
  };

  const calculateLeaveDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
    return diffDays;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMedicalFile(e.target.files[0]);
    }
  };

  const uploadMedicalCertificate = async () => {
    if (!medicalFile) return null;

    setUploading(true);
    try {
      const fileExt = medicalFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `medical-certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('personnel-photos')
        .upload(filePath, medicalFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('personnel-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Error",
        description: "Failed to upload medical certificate",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: LeaveFormValues) => {
    try {
      setLoading(true);

      // Verify personnel ID number
      const selectedPerson = personnel.find(p => p.id === values.personnel_id);
      if (!selectedPerson) {
        toast({
          title: "Error",
          description: "Selected personnel not found",
          variant: "destructive",
        });
        return;
      }

      if (selectedPerson.id_number !== values.personnel_id_number) {
        toast({
          title: "Verification Failed",
          description: "Personnel ID number does not match. Please enter the correct ID number.",
          variant: "destructive",
        });
        return;
      }

      // Check if medical documentation is required
      if (leaveType === "medical" && !medicalFile) {
        toast({
          title: "Medical Documentation Required",
          description: "Please upload a medical certificate or photo of injury for medical leave",
          variant: "destructive",
        });
        return;
      }

      let medicalCertUrl = null;
      if (medicalFile) {
        medicalCertUrl = await uploadMedicalCertificate();
        if (!medicalCertUrl) return;
      }

      const leaveDays = calculateLeaveDays(values.start_date, values.end_date);
      const isPaid = values.leave_type !== "unpaid" && leaveDays <= availableLeaves;

      const { error } = await supabase.from("leaves").insert({
        personnel_type: values.personnel_type,
        personnel_id: values.personnel_id,
        personnel_name: selectedPerson.name,
        personnel_id_number: values.personnel_id_number,
        leave_type: values.leave_type,
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason,
        medical_certificate_url: medicalCertUrl,
        status: "pending",
        leave_days: leaveDays,
        is_paid: isPaid,
      });

      if (error) throw error;

      toast({
        title: "Leave Filed Successfully",
        description: "Your leave request has been submitted for approval",
      });

      form.reset();
      setMedicalFile(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Leave Request</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="personnel_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personnel Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="helper">Helper</SelectItem>
                        <SelectItem value="mechanic">Mechanic</SelectItem>
                        <SelectItem value="recycler">Recycler</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personnel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Personnel</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose personnel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {personnel.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="personnel_id_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personnel ID Number (for confirmation)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter ID number to confirm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {personnelId && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Available Leave Credits: <span className="text-primary">{availableLeaves} days</span></p>
                {insufficientCredits && (
                  <p className="text-sm text-destructive mt-1">⚠️ Insufficient credits - Leave will be unpaid</p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="leave_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                      <SelectContent>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="vacation">Vacation Leave</SelectItem>
                        <SelectItem value="emergency">Emergency Leave</SelectItem>
                        <SelectItem value="medical">Medical Leave</SelectItem>
                        <SelectItem value="personal">Personal Leave</SelectItem>
                        <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Provide detailed reason for leave" rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {leaveType === "medical" && (
              <div className="space-y-2">
                <FormLabel>Medical Certificate or Injury Photo *</FormLabel>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.heic"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {medicalFile && (
                    <span className="text-sm text-muted-foreground">{medicalFile.name}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Required: Upload either a medical certificate (PDF) or photo of injury (JPG, PNG)
                </p>
              </div>
            )}

            <Button type="submit" disabled={loading || uploading} className="w-full">
              {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Leave Request
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default LeaveFilingForm;