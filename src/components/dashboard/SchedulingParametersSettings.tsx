import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SchedulingParameter {
  id: string;
  parameter_key: string;
  parameter_value: { value: number };
  description: string;
}

export const SchedulingParametersSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parameters, setParameters] = useState<SchedulingParameter[]>([]);

  useEffect(() => {
    console.log('[SchedulingParametersSettings] Component mounted, loading parameters...');
    loadParameters();
  }, []);

  const loadParameters = async () => {
    try {
      setLoading(true);
      console.log('[SchedulingParametersSettings] Fetching parameters from database...');
      const { data, error } = await supabase
        .from("scheduling_parameters")
        .select("id,parameter_key,parameter_value,description")
        .order("parameter_key");

      if (error) {
        console.error('[SchedulingParametersSettings] Error loading parameters:', error);
        throw error;
      }
      
      console.log('[SchedulingParametersSettings] Parameters loaded:', data);
      setParameters(data || []);
    } catch (error: any) {
      console.error('[SchedulingParametersSettings] Load failed:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateParameter = async (key: string, value: number) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("scheduling_parameters")
        .update({ parameter_value: { value } })
        .eq("parameter_key", key);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Parameter updated successfully",
      });
      
      await loadParameters();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (key: string, newValue: string) => {
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      setParameters(prev =>
        prev.map(p =>
          p.parameter_key === key
            ? { ...p, parameter_value: { value: numValue } }
            : p
        )
      );
    }
  };

  const getParameterLabel = (key: string): string => {
    const labels: Record<string, string> = {
      regular_schedule_max_clients_per_truck: "Max Clients per Truck (Regular)",
      regular_schedule_capacity_buffer: "Capacity Buffer % (Regular)",
      special_dispatch_capacity_buffer: "Capacity Buffer % (Special Dispatch)",
      special_dispatch_multi_truck_threshold: "Multi-truck Threshold % (Special Dispatch)",
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling Parameters</CardTitle>
        <CardDescription>
          Configure smart scheduling parameters for regular schedules and special dispatch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parameters.map((param) => (
          <div key={param.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium">
                  {getParameterLabel(param.parameter_key)}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {param.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step={param.parameter_key.includes("buffer") || param.parameter_key.includes("threshold") ? "0.01" : "1"}
                min="0"
                max={param.parameter_key.includes("buffer") || param.parameter_key.includes("threshold") ? "1" : undefined}
                value={param.parameter_value.value}
                onChange={(e) => handleValueChange(param.parameter_key, e.target.value)}
                className="w-32"
              />
              <Button
                size="sm"
                onClick={() => updateParameter(param.parameter_key, param.parameter_value.value)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
