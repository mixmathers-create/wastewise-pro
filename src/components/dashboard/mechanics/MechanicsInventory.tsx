import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Plus, Edit, Trash2 } from "lucide-react";
import { generateCSV, downloadCSV, parseCSV } from "@/lib/csvUtils";
import { AddMechanicDialog } from "./AddMechanicDialog";
import { EditMechanicDialog } from "./EditMechanicDialog";

export function MechanicsInventory() {
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMechanics();
  }, []);

  const fetchMechanics = async () => {
    try {
      const { data, error } = await supabase
        .from("mechanics")
        .select("*")
        .order("name");

      if (error) throw error;
      setMechanics(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching mechanics", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const data = mechanics.map(m => ({
      name: m.name,
      contact_number: m.contact_number || "",
      birthdate: m.birthdate || "",
      availability_days: (m.availability?.days || []).join("|"),
      availability_shifts: (m.availability?.shifts || []).join("|")
    }));
    const csv = generateCSV(data, ["name", "contact_number", "birthdate", "availability_days", "availability_shifts"]);
    downloadCSV(csv, "mechanics.csv");
  };

  const downloadTemplate = () => {
    const exampleData = [{
      name: "John Mechanic",
      contact_number: "+63 912 345 6789",
      birthdate: "1990-01-15",
      availability_days: "Mon|Tue|Wed|Thu|Fri",
      availability_shifts: "AM|PM"
    }];
    const csv = generateCSV(exampleData, ["name", "contact_number", "birthdate", "availability_days", "availability_shifts"]);
    downloadCSV(csv, "mechanics-template.csv");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const invalidRows = rows.filter(row => !row.name);
      if (invalidRows.length > 0) {
        toast({ title: "Import Error", description: "All rows must have a name", variant: "destructive" });
        return;
      }

      const mechanicsToInsert = rows.map(row => ({
        name: row.name,
        contact_number: row.contact_number || null,
        birthdate: row.birthdate || null,
        availability: {
          days: row.availability_days ? row.availability_days.split("|") : ["Mon", "Tue", "Wed", "Thu", "Fri"],
          shifts: row.availability_shifts ? row.availability_shifts.split("|") : ["AM", "PM"]
        },
        status: "available"
      }));

      const { error } = await supabase.from("mechanics").insert(mechanicsToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${mechanicsToInsert.length} mechanics` });
      fetchMechanics();
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    }
    event.target.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this mechanic?")) return;

    try {
      const { error } = await supabase.from("mechanics").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Mechanic deleted" });
      fetchMechanics();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Mechanics Inventory</CardTitle>
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
              <Plus className="h-4 w-4 mr-2" /> Add Mechanic
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mechanics.map((mechanic) => (
              <TableRow key={mechanic.id}>
                <TableCell className="font-medium">{mechanic.name}</TableCell>
                <TableCell>{mechanic.contact_number || "N/A"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    mechanic.status === "available" ? "bg-green-100 text-green-800" :
                    mechanic.status === "suspended" ? "bg-red-100 text-red-800" :
                    mechanic.status === "on_duty" ? "bg-blue-100 text-blue-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {mechanic.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  {mechanic.availability?.days?.join(", ") || "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingMechanic(mechanic)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(mechanic.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <AddMechanicDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={fetchMechanics} />
      {editingMechanic && (
        <EditMechanicDialog
          mechanic={editingMechanic}
          open={!!editingMechanic}
          onOpenChange={(open) => !open && setEditingMechanic(null)}
          onSuccess={fetchMechanics}
        />
      )}
    </Card>
  );
}
