import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AnalyticsTab = ({ profile }: { profile: any }) => {
  const [stats, setStats] = useState({ clients: 0, trucks: 0, drivers: 0, helpers: 0, receipts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [clients, trucks, drivers, helpers, receipts] = await Promise.all([
          supabase.from("clients").select("id"),
          supabase.from("trucks").select("id"),
          supabase.from("drivers").select("id"),
          supabase.from("helpers").select("id"),
          supabase.from("collection_receipts").select("id"),
        ]);
        setStats({
          clients: clients.data?.length || 0,
          trucks: trucks.data?.length || 0,
          drivers: drivers.data?.length || 0,
          helpers: helpers.data?.length || 0,
          receipts: receipts.data?.length || 0,
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
        <CardDescription>Collection statistics and resources overview</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Clients</p><p className="text-2xl font-bold">{stats.clients}</p></div>
            <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Trucks</p><p className="text-2xl font-bold">{stats.trucks}</p></div>
            <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Drivers</p><p className="text-2xl font-bold">{stats.drivers}</p></div>
            <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Helpers</p><p className="text-2xl font-bold">{stats.helpers}</p></div>
            <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Receipts</p><p className="text-2xl font-bold">{stats.receipts}</p></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsTab;
