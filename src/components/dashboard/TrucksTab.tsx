import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const TrucksTab = ({ profile }: { profile: any }) => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrucks = async () => {
      if (!profile?.team_id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("trucks")
        .select("id,code,type")
        .eq("team_id", profile.team_id)
        .order("code");
      if (error) setError(error.message);
      setTrucks(data || []);
      setLoading(false);
    };
    fetchTrucks();
  }, [profile?.team_id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trucks</CardTitle>
        <CardDescription>Manage your fleet of waste collection trucks</CardDescription>
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
