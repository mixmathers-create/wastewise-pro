import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Plus, Edit, Trash2 } from "lucide-react";
import { generateCSV, downloadCSV, parseCSV } from "@/lib/csvUtils";
import { AddToolDialog } from "./AddToolDialog";
import { EditToolDialog } from "./EditToolDialog";

export function ToolsInventory() {
  const [tools, setTools] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTool, setEditingTool] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    const { data, error } = await supabase.from("tools").select("*").order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTools(data || []);
    }
  };

  const handleExport = () => {
    const data = tools.map(t => ({
      name: t.name,
      code: t.code,
      category: t.category || "",
      condition: t.condition
    }));
    const csv = generateCSV(data, ["name", "code", "category", "condition"]);
    downloadCSV(csv, "tools.csv");
  };

  const downloadTemplate = () => {
    const exampleData = [{
      name: "Power Drill",
      code: "TOOL-001",
      category: "Power Tools",
      condition: "good"
    }];
    const csv = generateCSV(exampleData, ["name", "code", "category", "condition"]);
    downloadCSV(csv, "tools-template.csv");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const invalidRows = rows.filter(row => !row.name || !row.code);
      if (invalidRows.length > 0) {
        toast({ title: "Import Error", description: "All rows must have name and code", variant: "destructive" });
        return;
      }

      const toolsToInsert = rows.map(row => ({
        name: row.name,
        code: row.code,
        category: row.category || null,
        condition: row.condition || "good",
        status: "available"
      }));

      const { error } = await supabase.from("tools").insert(toolsToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${toolsToInsert.length} tools` });
      fetchTools();
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    }
    event.target.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tool?")) return;

    try {
      const { error } = await supabase.from("tools").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Tool deleted" });
      fetchTools();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tools Inventory</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Template
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label>
                <Upload className="h-4 w-4 mr-2" /> Import
                <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
              </label>
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Tool
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tools.map((tool) => (
              <TableRow key={tool.id}>
                <TableCell className="font-mono">{tool.code}</TableCell>
                <TableCell className="font-medium">{tool.name}</TableCell>
                <TableCell>{tool.category || "N/A"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    tool.condition === "good" ? "bg-green-100 text-green-800" :
                    tool.condition === "fair" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {tool.condition}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    tool.status === "available" ? "bg-green-100 text-green-800" :
                    "bg-orange-100 text-orange-800"
                  }`}>
                    {tool.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingTool(tool)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(tool.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <AddToolDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={fetchTools} />
      {editingTool && (
        <EditToolDialog
          tool={editingTool}
          open={!!editingTool}
          onOpenChange={(open) => !open && setEditingTool(null)}
          onSuccess={fetchTools}
        />
      )}
    </Card>
  );
}
