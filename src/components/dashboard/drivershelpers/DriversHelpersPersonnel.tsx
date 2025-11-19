import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Upload, Edit, Trash2, Users, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateCSV, downloadCSV, parseCSV } from "@/lib/csvUtils";
import AddDriverDialog from "../AddDriverDialog";
import AddHelperDialog from "../AddHelperDialog";
import DriverEditDialog from "../DriverEditDialog";
import HelperEditDialog from "../HelperEditDialog";

export default function DriversHelpersPersonnel({ profile }: { profile: any }) {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [editingHelper, setEditingHelper] = useState<any>(null);
  const driverFileInputRef = useRef<HTMLInputElement>(null);
  const helperFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDrivers();
    fetchHelpers();
  }, []);

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDrivers(data || []);
    }
  };

  const fetchHelpers = async () => {
    const { data, error } = await supabase
      .from("helpers")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setHelpers(data || []);
    }
  };

  const exportDrivers = () => {
    const csv = generateCSV(drivers, [
      "name", "license_number", "id_number", "birthdate", 
      "contact_number", "status", "license_expiry_date",
      "suspension_start_date", "suspension_end_date"
    ]);
    downloadCSV(csv, "drivers-export.csv");
  };

  const exportHelpers = () => {
    const csv = generateCSV(helpers, [
      "name", "id_number", "birthdate", "contact_number", 
      "status", "suspension_start_date", "suspension_end_date"
    ]);
    downloadCSV(csv, "helpers-export.csv");
  };

  const handleDriverImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const driversToInsert = rows.map(row => ({
        name: row.name,
        license_number: row.license_number || null,
        id_number: row.id_number || null,
        birthdate: row.birthdate || null,
        contact_number: row.contact_number || null,
        status: row.status || "available",
        license_expiry_date: row.license_expiry_date || null,
        suspension_start_date: row.suspension_start_date || null,
        suspension_end_date: row.suspension_end_date || null,
      }));

      const { error } = await supabase.from("drivers").insert(driversToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${rows.length} drivers` });
      fetchDrivers();
    } catch (error: any) {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
    }

    if (driverFileInputRef.current) driverFileInputRef.current.value = "";
  };

  const handleHelperImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const helpersToInsert = rows.map(row => ({
        name: row.name,
        id_number: row.id_number || null,
        birthdate: row.birthdate || null,
        contact_number: row.contact_number || null,
        status: row.status || "available",
        suspension_start_date: row.suspension_start_date || null,
        suspension_end_date: row.suspension_end_date || null,
      }));

      const { error } = await supabase.from("helpers").insert(helpersToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${rows.length} helpers` });
      fetchHelpers();
    } catch (error: any) {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
    }

    if (helperFileInputRef.current) helperFileInputRef.current.value = "";
  };

  const deleteDriver = async (id: string) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;

    try {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Driver deleted" });
      fetchDrivers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteHelper = async (id: string) => {
    if (!confirm("Are you sure you want to delete this helper?")) return;

    try {
      const { error } = await supabase.from("helpers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Helper deleted" });
      fetchHelpers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Tabs defaultValue="drivers" className="w-full">
      <TabsList>
        <TabsTrigger value="drivers">
          <UserCog className="h-4 w-4 mr-2" />
          Drivers
        </TabsTrigger>
        <TabsTrigger value="helpers">
          <Users className="h-4 w-4 mr-2" />
          Helpers
        </TabsTrigger>
      </TabsList>

      <TabsContent value="drivers">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Drivers</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportDrivers}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => driverFileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <input
                  ref={driverFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleDriverImport}
                  className="hidden"
                />
                <AddDriverDialog profile={profile} onAdded={fetchDrivers} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>License #</TableHead>
                  <TableHead>ID #</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>License Expiry</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.license_number || "—"}</TableCell>
                    <TableCell>{driver.id_number || "—"}</TableCell>
                    <TableCell>{driver.contact_number || "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        driver.status === "available" ? "bg-green-100 text-green-800" :
                        driver.status === "on_duty" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {driver.status?.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {driver.license_expiry_date
                        ? new Date(driver.license_expiry_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingDriver(driver)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDriver(driver.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="helpers">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Helpers</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportHelpers}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => helperFileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <input
                  ref={helperFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleHelperImport}
                  className="hidden"
                />
                <AddHelperDialog profile={profile} onAdded={fetchHelpers} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID #</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {helpers.map((helper) => (
                  <TableRow key={helper.id}>
                    <TableCell className="font-medium">{helper.name}</TableCell>
                    <TableCell>{helper.id_number || "—"}</TableCell>
                    <TableCell>{helper.contact_number || "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        helper.status === "available" ? "bg-green-100 text-green-800" :
                        helper.status === "on_duty" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {helper.status?.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingHelper(helper)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteHelper(helper.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {editingDriver && (
        <DriverEditDialog
          driver={editingDriver}
          open={!!editingDriver}
          onOpenChange={(open) => !open && setEditingDriver(null)}
          onUpdated={fetchDrivers}
        />
      )}

      {editingHelper && (
        <HelperEditDialog
          helper={editingHelper}
          open={!!editingHelper}
          onOpenChange={(open) => !open && setEditingHelper(null)}
          onUpdated={fetchHelpers}
        />
      )}
    </Tabs>
  );
}
