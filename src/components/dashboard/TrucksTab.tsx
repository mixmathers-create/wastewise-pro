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
import { Checkbox } from "@/components/ui/checkbox";

const TrucksTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrucks, setSelectedTrucks] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = profile?.role === "admin";

  const fetchTrucks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trucks")
      .select("id,code,type,plate_number,capacity,status")
      .order("code");
    if (error) setError(error.message);
    setTrucks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const downloadTemplate = () => {
    const csv = generateCSV([], ['code', 'plate_number', 'type', 'capacity']);
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
        plate_number: row.plate_number,
        type: row.type,
        capacity: row.capacity ? parseFloat(row.capacity) : (row.type === 'GC' ? 4 : 2)
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

  const toggleSelectTruck = (truckId: string) => {
    setSelectedTrucks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(truckId)) {
        newSet.delete(truckId);
      } else {
        newSet.add(truckId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTrucks.size === trucks.length) {
      setSelectedTrucks(new Set());
    } else {
      setSelectedTrucks(new Set(trucks.map(t => t.id)));
    }
  };

  const handleMassDelete = async () => {
    if (selectedTrucks.size === 0) return;

    try {
      const { error } = await supabase
        .from("trucks")
        .delete()
        .in("id", Array.from(selectedTrucks));

      if (error) throw error;

      toast({ title: "Success", description: `Deleted ${selectedTrucks.size} trucks` });
      setSelectedTrucks(new Set());
      fetchTrucks();
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    }
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
            <div className="flex gap-2 items-center">
              {selectedTrucks.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleMassDelete}
                >
                  Delete ({selectedTrucks.size})
                </Button>
              )}
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
              {isAdmin && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTrucks.size === trucks.length && trucks.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Code</TableHead>
              <TableHead>Plate Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity (MT)</TableHead>
              <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.map((t) => (
                <TableRow key={t.id}>
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedTrucks.has(t.id)}
                        onCheckedChange={() => toggleSelectTruck(t.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{t.code}</TableCell>
                  <TableCell>{t.plate_number || "N/A"}</TableCell>
                  <TableCell>{t.type}</TableCell>
                  <TableCell>{t.capacity || 0} MT</TableCell>
                  <TableCell><span className={`inline-flex px-2 py-1 text-xs rounded-full ${t.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{t.status}</span></TableCell>
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
