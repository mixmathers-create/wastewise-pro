import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const CollectionsTab = ({ profile }: { profile: any }) => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipts = async () => {
      if (!profile?.team_id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("collection_receipts")
        .select("id,created_at,qr_code,signed_by,pdf_url")
        .eq("team_id", profile.team_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) setError(error.message);
      setReceipts(data || []);
      setLoading(false);
    };
    fetchReceipts();
  }, [profile?.team_id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Collections</CardTitle>
        <CardDescription>Recent collection receipts</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : receipts.length === 0 ? (
          <p className="text-muted-foreground">No receipts yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Signed By</TableHead>
                <TableHead>PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{r.qr_code}</TableCell>
                  <TableCell>{r.signed_by || '-'}</TableCell>
                  <TableCell>{r.pdf_url ? <a className="underline" href={r.pdf_url} target="_blank" rel="noreferrer">Open</a> : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CollectionsTab;
