import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddTruckDialog from "./AddTruckDialog";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { generateCSV, downloadCSV, parseCSV } from "@/lib/csvUtils";
import { useToast } from "@/hooks/use-toast";

const TrucksTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = profile?.role === "admin";

  const fetchTrucks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trucks")
      .select("id,code,type")
      .order("code");
    if (error) setError(error.message);
    setTrucks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const downloadTemplate = () => {
    const csv = generateCSV([], ['code', 'type']);
    downloadCSV(csv, 'trucks-template.csv');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const trucksToInsert = rows.map(row => ({
        code: row.code,
        type: row.type,
        team_id: profile?.team_id || ''
      }));

      const { error } = await supabase.from("trucks").insert(trucksToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${trucksToInsert.length} trucks` });
      fetchTrucks();
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trucks</CardTitle>
            <CardDescription>Manage your fleet</CardDescription>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />Import CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
              <AddTruckDialog profile={profile} onAdded={fetchTrucks} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : trucks.length === 0 ? (
          <p className="text-muted-foreground">No trucks yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.code}</TableCell>
                  <TableCell>{t.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TrucksTab;
