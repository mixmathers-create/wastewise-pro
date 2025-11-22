import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Printer, Download, List } from "lucide-react";
import CreateReceiptForm from "../collection/CreateReceiptForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { generateCSV, downloadCSV } from "@/lib/csvUtils";
import { printerService } from "@/lib/printerService";

const CollectionsTab = ({ profile }: { profile: any }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const isMobile = Capacitor.isNativePlatform();
  const isAdmin = profile?.role === "admin";

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

  const handleViewReceipt = (receiptId: string) => {
    navigate(`/receipt-preview?id=${receiptId}`);
  };

  const toggleSelectReceipt = (receiptId: string) => {
    setSelectedReceipts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(receiptId)) {
        newSet.delete(receiptId);
      } else {
        newSet.add(receiptId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedReceipts.size === receipts.length) {
      setSelectedReceipts(new Set());
    } else {
      setSelectedReceipts(new Set(receipts.map(r => r.id)));
    }
  };

  const handleMassDelete = async () => {
    if (selectedReceipts.size === 0) return;

    try {
      const { error } = await supabase
        .from("collection_receipts")
        .delete()
        .in("id", Array.from(selectedReceipts));

      if (error) throw error;

      toast({ title: "Success", description: `Deleted ${selectedReceipts.size} receipts` });
      setSelectedReceipts(new Set());
      fetchReceipts();
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    const data = receipts.map(r => ({
      date: new Date(r.created_at).toLocaleString(),
      qr_code: r.qr_code,
      signed_by: r.signed_by || '-',
      pdf_url: r.pdf_url || '-'
    }));
    const csv = generateCSV(data, ["date", "qr_code", "signed_by", "pdf_url"]);
    downloadCSV(csv, "collections-export.csv");
    toast({ title: "Success", description: "Collections exported successfully" });
  };

  const handlePrintTally = async (receiptId: string) => {
    try {
      // Fetch full receipt details with all items
      const { data, error } = await supabase
        .from("collection_receipts")
        .select("*")
        .eq("id", receiptId)
        .single();

      if (error) throw error;

      const items = data.items as any[];
      
      if (isMobile) {
        // Print to internal printer on mobile
        await printerService.printReceipt({
          header: "COLLECTION TALLY",
          items: [
            { label: "Date:", value: new Date(data.created_at).toLocaleDateString() },
            { label: "QR Code:", value: data.qr_code },
            { label: "Signed By:", value: data.signed_by || "-" },
            { label: "", value: "" },
            { label: "ITEMS COLLECTED:", value: "" },
            ...items.map(item => ({
              label: item.waste_type,
              value: `${item.quantity} ${item.unit || 'pcs'}`
            })),
            { label: "", value: "" },
            { label: "Total Items:", value: items.length.toString() }
          ],
          footer: `Printed: ${new Date().toLocaleString()}`
        });
        toast({ title: "Success", description: "Tally printed successfully" });
      } else {
        // Print using window.print on web
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast({ title: "Error", description: "Please allow pop-ups to print", variant: "destructive" });
          return;
        }
        
        printWindow.document.write(`
          <html>
            <head>
              <title>Collection Tally - ${data.qr_code}</title>
              <style>
                body { font-family: 'Courier New', monospace; padding: 20px; }
                h1 { text-align: center; font-size: 24px; margin-bottom: 10px; }
                .divider { border-top: 2px dashed #000; margin: 10px 0; }
                .info { margin: 5px 0; }
                .info-label { font-weight: bold; display: inline-block; width: 150px; }
                .items { margin-top: 20px; }
                .item { margin: 8px 0; padding: 8px; border: 1px solid #ccc; }
                .item-type { font-weight: bold; font-size: 16px; }
                .item-qty { color: #555; }
                .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <h1>COLLECTION TALLY</h1>
              <div class="divider"></div>
              <div class="info"><span class="info-label">Date:</span> ${new Date(data.created_at).toLocaleString()}</div>
              <div class="info"><span class="info-label">QR Code:</span> ${data.qr_code}</div>
              <div class="info"><span class="info-label">Signed By:</span> ${data.signed_by || '-'}</div>
              <div class="divider"></div>
              <h2>Items Collected (${items.length})</h2>
              <div class="items">
                ${items.map(item => `
                  <div class="item">
                    <div class="item-type">${item.waste_type}</div>
                    <div class="item-qty">Quantity: ${item.quantity} ${item.unit || 'pcs'}</div>
                  </div>
                `).join('')}
              </div>
              <div class="divider"></div>
              <div class="footer">Printed: ${new Date().toLocaleString()}</div>
              <script>window.print(); window.onafterprint = function(){ window.close(); }</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err: any) {
      toast({ title: "Print Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>QR Collections</CardTitle>
            <CardDescription>Create and view collection receipts</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            {!isMobile && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {!isMobile && isAdmin && selectedReceipts.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleMassDelete}
              >
                Delete ({selectedReceipts.size})
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size={isMobile ? "default" : "lg"}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Receipt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Collection Receipt</DialogTitle>
                </DialogHeader>
                <CreateReceiptForm profile={profile} onSuccess={handleSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "p-2" : ""}>
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : receipts.length === 0 ? (
          <p className="text-muted-foreground">No receipts yet.</p>
        ) : isMobile ? (
          <div className="space-y-2">
            {receipts.map((r) => (
              <div key={r.id} className="bg-card border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div className="font-medium text-sm break-all">{r.qr_code}</div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Signed by: </span>
                      {r.signed_by || '-'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleViewReceipt(r.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="flex-1"
                    onClick={() => handleViewReceipt(r.id)}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => handlePrintTally(r.id)}
                  >
                    <List className="h-4 w-4 mr-1" />
                    Tally
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedReceipts.size === receipts.length && receipts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Date</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Signed By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((r) => (
                <TableRow key={r.id}>
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedReceipts.has(r.id)}
                        onCheckedChange={() => toggleSelectReceipt(r.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{r.qr_code}</TableCell>
                  <TableCell>{r.signed_by || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewReceipt(r.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleViewReceipt(r.id)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handlePrintTally(r.id)}
                      >
                        <List className="h-4 w-4 mr-1" />
                        Tally
                      </Button>
                    </div>
                  </TableCell>
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
