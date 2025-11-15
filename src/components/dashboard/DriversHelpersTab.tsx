import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AddDriverDialog from "./AddDriverDialog";
import AddHelperDialog from "./AddHelperDialog";

const DriversHelpersTab = ({ profile }: { profile: any }) => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = profile?.role === "admin";

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: d, error: de }, { data: h, error: he }] = await Promise.all([
      supabase.from("drivers").select("id,name,license_number").order("name"),
      supabase.from("helpers").select("id,name").order("name"),
    ]);
    if (de) setError(de.message);
    else if (he) setError(he.message);
    setDrivers(d || []);
    setHelpers(h || []);
    setLoading(false);
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
            {isAdmin && <AddDriverDialog profile={profile} onAdded={fetchAll} />}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.license_number}</TableCell>
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
            {isAdmin && <AddHelperDialog profile={profile} onAdded={fetchAll} />}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.license_number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Helpers</CardTitle>
          <CardDescription>Collection assistants</CardDescription>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {helpers.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
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
