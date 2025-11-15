import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddDriverDialog from "./AddDriverDialog";
import AddHelperDialog from "./AddHelperDialog";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { generateCSV, downloadCSV, parseCSV } from "@/lib/csvUtils";
import { useToast } from "@/hooks/use-toast";

const DriversHelpersTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const driverFileRef = useRef<HTMLInputElement>(null);
  const helperFileRef = useRef<HTMLInputElement>(null);
  const isAdmin = profile?.role === "admin";

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: d, error: de }, { data: h, error: he }] = await Promise.all([
      supabase.from("drivers").select("id,name,license_number,id_number,birthdate,contact_number").order("name"),
      supabase.from("helpers").select("id,name,id_number,birthdate,contact_number").order("name"),
    ]);
    if (de) setError(de.message);
    else if (he) setError(he.message);
    setDrivers(d || []);
    setHelpers(h || []);
    setLoading(false);
  };

  const downloadDriverTemplate = () => {
    const csv = generateCSV([], ['name', 'license_number', 'id_number', 'birthdate', 'contact_number']);
    downloadCSV(csv, 'drivers-template.csv');
  };

  const downloadHelperTemplate = () => {
    const csv = generateCSV([], ['name', 'id_number', 'birthdate', 'contact_number']);
    downloadCSV(csv, 'helpers-template.csv');
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
        id_number: row.id_number || `DRV-${Date.now().toString().slice(-6)}`,
        birthdate: row.birthdate || null,
        contact_number: row.contact_number || null,
        team_id: profile?.team_id || '00000000-0000-0000-0000-000000000001'
      }));

      const { error } = await supabase.from("drivers").insert(driversToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${driversToInsert.length} drivers` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    }

    if (driverFileRef.current) driverFileRef.current.value = '';
  };

  const handleHelperImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const helpersToInsert = rows.map(row => ({
        name: row.name,
        id_number: row.id_number || `HLP-${Date.now().toString().slice(-6)}`,
        birthdate: row.birthdate || null,
        contact_number: row.contact_number || null,
        team_id: profile?.team_id || '00000000-0000-0000-0000-000000000001'
      }));

      const { error } = await supabase.from("helpers").insert(helpersToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${helpersToInsert.length} helpers` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    }

    if (helperFileRef.current) helperFileRef.current.value = '';
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Drivers</CardTitle>
              <CardDescription>Licensed vehicle operators</CardDescription>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadDriverTemplate}>
                  <Download className="h-4 w-4 mr-2" />Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => driverFileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Import CSV
                </Button>
                <input
                  ref={driverFileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleDriverImport}
                  className="hidden"
                />
                <AddDriverDialog profile={profile} onAdded={fetchAll} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : drivers.length === 0 ? (
            <p className="text-muted-foreground">No drivers yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>License</TableHead>
              <TableHead>ID Number</TableHead>
              <TableHead>Birth Date</TableHead>
              <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.license_number || "N/A"}</TableCell>
                    <TableCell>{d.id_number || "N/A"}</TableCell>
                    <TableCell>{d.birthdate ? new Date(d.birthdate).toLocaleDateString() : "N/A"}</TableCell>
                    <TableCell>{d.contact_number || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Helpers</CardTitle>
              <CardDescription>Collection assistants</CardDescription>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadHelperTemplate}>
                  <Download className="h-4 w-4 mr-2" />Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => helperFileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Import CSV
                </Button>
                <input
                  ref={helperFileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleHelperImport}
                  className="hidden"
                />
                <AddHelperDialog profile={profile} onAdded={fetchAll} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : helpers.length === 0 ? (
            <p className="text-muted-foreground">No helpers yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID Number</TableHead>
              <TableHead>Birth Date</TableHead>
              <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {helpers.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{h.id_number || "N/A"}</TableCell>
                    <TableCell>{h.birthdate ? new Date(h.birthdate).toLocaleDateString() : "N/A"}</TableCell>
                    <TableCell>{h.contact_number || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriversHelpersTab;
