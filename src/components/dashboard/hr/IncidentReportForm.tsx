import { useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Send, WifiOff, Camera, X } from "lucide-react";
import type { PendingIncidentReport, Severity } from "@/lib/offlineDb";

const incidentReportSchema = z.object({
  incident_type: z.string().min(1, "Incident type is required"),
  incident_date: z.string().min(1, "Incident date is required"),
  incident_hour: z.string().optional(),
  incident_minute: z.string().optional(),
  location: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

type IncidentReportForm = z.infer<typeof incidentReportSchema>;

const incidentTypes = [
  "Accident",
  "Injury",
  "Equipment Damage",
  "Argument/Conflict",
  "Insubordination",
  "Safety Violation",
  "Property Damage",
  "Near Miss",
  "Other"
];

const generateHourOptions = () => {
  const hours = [];
  for (let hour = 0; hour < 24; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const label = `${hour12} ${period}`;
    const value = hour.toString().padStart(2, '0');
    hours.push({ value, label });
  }
  return hours;
};

const generateMinuteOptions = () => {
  const minutes = [];
  for (let minute = 0; minute < 60; minute++) {
    const value = minute.toString().padStart(2, '0');
    minutes.push({ value, label: value });
  }
  return minutes;
};

interface IncidentReportFormProps {
  isOnline?: boolean;
  profile?: any;
  createPendingIncidentReport?: (data: Omit<PendingIncidentReport, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  onOfflineSuccess?: () => void;
}

export default function IncidentReportForm({ 
  isOnline = true, 
  profile,
  createPendingIncidentReport,
  onOfflineSuccess,
}: IncidentReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const currentTime = useMemo(() => {
    const now = new Date();
    return {
      hours: now.getHours(),
      minutes: now.getMinutes(),
    };
  }, []);

  const form = useForm<IncidentReportForm>({
    resolver: zodResolver(incidentReportSchema),
    defaultValues: {
      incident_type: "",
      incident_date: new Date().toISOString().split('T')[0],
      incident_hour: currentTime.hours.toString().padStart(2, '0'),
      incident_minute: "",
      location: "",
      description: "",
      severity: "medium",
    },
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setPhotos(prev => [...prev, result]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const startCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 }
      }).catch(() => 
        navigator.mediaDevices.getUserMedia({ video: true })
      );

      setCameraStream(stream);
      setShowCamera(true);
      
      // Wait for Dialog to mount, then assign stream to video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 200);
      
    } catch (error: any) {
      console.error("Camera error:", error);
      toast.error(error.name === "NotAllowedError" 
        ? "Camera permission denied" 
        : "Failed to access camera");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error("Video or canvas ref is null");
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera not ready. Please wait a moment.");
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const photoData = canvas.toDataURL("image/jpeg", 0.9);
      
      if (photoData === 'data:,' || photoData.length < 100) {
        toast.error("Failed to capture photo. Please try again.");
        return;
      }
      
      setPhotos(prev => [...prev, photoData]);
      setShowCamera(false);
      
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      
      toast.success("Photo captured successfully");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const onSubmit = async (data: IncidentReportForm) => {
    setIsSubmitting(true);
    try {
      const incident_time = data.incident_hour && data.incident_minute 
        ? `${data.incident_hour}:${data.incident_minute}` 
        : null;

      // Handle offline mode
      if (!isOnline) {
        if (!createPendingIncidentReport || !profile) {
          toast.error("Profile information is required for offline submission");
          return;
        }

        await createPendingIncidentReport({
          reporter_name: profile.full_name || "Unknown",
          incident_type: data.incident_type,
          incident_date: data.incident_date,
          incident_time: incident_time,
          location: data.location || null,
          description: data.description,
          severity: data.severity as Severity,
          photos_base64: photos.length > 0 ? photos : null,
        });

        toast.success("Incident report saved offline. Will sync when online.");
        if (onOfflineSuccess) {
          onOfflineSuccess();
        }
        form.reset();
        setPhotos([]);
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

      const { error } = await supabase.from("incident_reports").insert({
        reported_by: user.id,
        reporter_name: userProfile?.full_name || "Unknown",
        incident_type: data.incident_type,
        incident_date: data.incident_date,
        incident_time: incident_time,
        location: data.location,
        description: data.description,
        severity: data.severity,
        photos: photos.length > 0 ? photos : null,
      });

      if (error) throw error;

      toast.success("Incident report submitted successfully");
      form.reset();
      setPhotos([]);
    } catch (error: any) {
      console.error("Error submitting incident report:", error);
      toast.error(error.message || "Failed to submit incident report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Submit Incident Report
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
            : "Report accidents, injuries, conflicts, or any noteworthy incidents"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="incident_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select incident type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incidentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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

              <FormField
                control={form.control}
                name="incident_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Date *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        max={new Date().toISOString().split('T')[0]}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Incident Time</label>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="incident_hour"
                    render={({ field }) => {
                      const selectedDate = form.watch("incident_date");
                      const today = new Date().toISOString().split('T')[0];
                      const isToday = selectedDate === today;
                      
                      // Get all hour options
                      const allHours = generateHourOptions();
                      
                      // Filter hours if today is selected
                      const availableHours = isToday
                        ? allHours.filter(hour => {
                            const hourValue = parseInt(hour.value);
                            return hourValue <= currentTime.hours;
                          })
                        : allHours;
                      
                      return (
                        <FormItem>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset minute when hour changes
                              form.setValue('incident_minute', '');
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Hour" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px]">
                              {availableHours.map((hour) => (
                                <SelectItem key={hour.value} value={hour.value}>
                                  {hour.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="incident_minute"
                    render={({ field }) => {
                      const selectedDate = form.watch("incident_date");
                      const selectedHour = form.watch("incident_hour");
                      const today = new Date().toISOString().split('T')[0];
                      const isToday = selectedDate === today;
                      const isCurrentHour = isToday && selectedHour && parseInt(selectedHour) === currentTime.hours;
                      
                      // Get all minute options
                      const allMinutes = generateMinuteOptions();
                      
                      // Filter minutes if current hour is selected on today
                      const availableMinutes = isCurrentHour
                        ? allMinutes.filter(minute => {
                            const minuteValue = parseInt(minute.value);
                            return minuteValue <= currentTime.minutes;
                          })
                        : allMinutes;
                      
                      const isDisabled = !selectedHour;
                      
                      return (
                        <FormItem>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isDisabled}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isDisabled ? "Min" : "Minute"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[200px]">
                              {availableMinutes.length > 0 ? (
                                availableMinutes.map((minute) => (
                                  <SelectItem key={minute.value} value={minute.value}>
                                    {minute.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  No minutes
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
                {(() => {
                  const selectedDate = form.watch("incident_date");
                  const selectedHour = form.watch("incident_hour");
                  const today = new Date().toISOString().split('T')[0];
                  const isToday = selectedDate === today;
                  const isCurrentHour = isToday && selectedHour && parseInt(selectedHour) === currentTime.hours;
                  
                  if (isCurrentHour) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Only times up to {currentTime.hours.toString().padStart(2, '0')}:{currentTime.minutes.toString().padStart(2, '0')} are available
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Where did the incident occur?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide detailed information about the incident..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Photos (Optional)</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    size="icon"
                    title="Take Photo"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="cursor-pointer flex-1"
                  />
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`Incident photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Camera Dialog */}
            <Dialog open={showCamera} onOpenChange={(open) => {
              if (!open) {
                stopCamera();
              }
            }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Capture Photo</DialogTitle>
                  <DialogDescription>
                    Position the camera and tap capture to take a photo
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-auto max-h-[60vh]"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button onClick={capturePhoto} disabled={!cameraStream}>
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={stopCamera}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              <Send className="h-4 w-4 mr-2" />
              Submit Incident Report
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
