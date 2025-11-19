import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LogOut, LogIn } from "lucide-react";

export function ToolCheckouts() {
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [selectedTool, setSelectedTool] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchCheckouts();
    fetchMechanics();
    fetchAvailableTools();
  }, []);

  const fetchCheckouts = async () => {
    const { data } = await supabase
      .from("tool_checkouts")
      .select("*, tools(name, code), mechanics(name)")
      .order("checked_out_at", { ascending: false });
    setCheckouts(data || []);
  };

  const fetchMechanics = async () => {
    const { data } = await supabase.from("mechanics").select("*").order("name");
    setMechanics(data || []);
  };

  const fetchAvailableTools = async () => {
    const { data } = await supabase
      .from("tools")
      .select("*")
      .eq("status", "available")
      .order("name");
    setTools(data || []);
  };

  const handleCheckout = async () => {
    if (!selectedMechanic || !selectedTool) {
      toast({ title: "Error", description: "Please select both mechanic and tool", variant: "destructive" });
      return;
    }

    try {
      const { error: checkoutError } = await supabase.from("tool_checkouts").insert({
        mechanic_id: selectedMechanic,
        tool_id: selectedTool,
        status: "checked_out"
      });

      if (checkoutError) throw checkoutError;

      const { error: toolError } = await supabase
        .from("tools")
        .update({ status: "checked_out" })
        .eq("id", selectedTool);

      if (toolError) throw toolError;

      toast({ title: "Success", description: "Tool checked out successfully" });
      fetchCheckouts();
      fetchAvailableTools();
      setSelectedMechanic("");
      setSelectedTool("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCheckin = async (checkoutId: string, toolId: string) => {
    try {
      const { error: checkoutError } = await supabase
        .from("tool_checkouts")
        .update({
          checked_in_at: new Date().toISOString(),
          status: "returned"
        })
        .eq("id", checkoutId);

      if (checkoutError) throw checkoutError;

      const { error: toolError } = await supabase
        .from("tools")
        .update({ status: "available" })
        .eq("id", toolId);

      if (toolError) throw toolError;

      toast({ title: "Success", description: "Tool checked in successfully" });
      fetchCheckouts();
      fetchAvailableTools();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tool Checkouts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Mechanic</label>
            <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
              <SelectTrigger>
                <SelectValue placeholder="Select mechanic" />
              </SelectTrigger>
              <SelectContent>
                {mechanics.map((mechanic) => (
                  <SelectItem key={mechanic.id} value={mechanic.id}>
                    {mechanic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Tool</label>
            <Select value={selectedTool} onValueChange={setSelectedTool}>
              <SelectTrigger>
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent>
                {tools.map((tool) => (
                  <SelectItem key={tool.id} value={tool.id}>
                    {tool.code} - {tool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCheckout}>
            <LogOut className="h-4 w-4 mr-2" /> Check Out
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Mechanic</TableHead>
              <TableHead>Checked Out</TableHead>
              <TableHead>Checked In</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checkouts.map((checkout) => (
              <TableRow key={checkout.id}>
                <TableCell className="font-mono">{checkout.tools?.code} - {checkout.tools?.name}</TableCell>
                <TableCell>{checkout.mechanics?.name}</TableCell>
                <TableCell>{new Date(checkout.checked_out_at).toLocaleString()}</TableCell>
                <TableCell>
                  {checkout.checked_in_at ? new Date(checkout.checked_in_at).toLocaleString() : "—"}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    checkout.status === "checked_out" ? "bg-orange-100 text-orange-800" :
                    "bg-green-100 text-green-800"
                  }`}>
                    {checkout.status}
                  </span>
                </TableCell>
                <TableCell>
                  {checkout.status === "checked_out" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckin(checkout.id, checkout.tool_id)}
                    >
                      <LogIn className="h-4 w-4 mr-2" /> Check In
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
