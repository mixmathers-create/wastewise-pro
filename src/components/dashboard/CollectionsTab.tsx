import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CreateReceiptForm from "../collection/CreateReceiptForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CollectionsTab = ({ profile }: { profile: any }) => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchReceipts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("collection_receipts")
      .select("id,created_at,qr_code,signed_by,pdf_url")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) setError(error.message);
    setReceipts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleSuccess = () => {
    setDialogOpen(false);
    fetchReceipts();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>QR Collections</CardTitle>
            <CardDescription>Create and view collection receipts</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg"><Plus className="mr-2 h-5 w-5" />Create Receipt</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Collection Receipt</DialogTitle>
              </DialogHeader>
              <CreateReceiptForm profile={profile} onSuccess={handleSuccess} />
            </DialogContent>
          </Dialog>
        </div>
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
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{r.qr_code}</TableCell>
                  <TableCell>{r.signed_by || '-'}</TableCell>
                  <TableCell><span className="text-green-600">Completed</span></TableCell>
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
