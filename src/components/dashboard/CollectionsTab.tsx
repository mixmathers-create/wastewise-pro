import { useState, useEffect, useRef } from "react";
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
import TallyTemplate, { TallyTemplateProps } from "../collection/TallyTemplate";

const CollectionsTab = ({ profile }: { profile: any }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [tallyData, setTallyData] = useState<TallyTemplateProps | null>(null);
  const tallyTemplateRef = useRef<HTMLDivElement>(null);
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
      // Fetch full receipt details with all tally entries
      const { data, error } = await supabase
        .from("collection_receipts")
        .select("*")
        .eq("id", receiptId)
        .single();

      if (error) throw error;

      const tallyEntries = (data.tally_entries || []) as any[];
      
      // Calculate totals by waste type and unit
      const totals: { [key: string]: { quantity: number; unit: string } } = {};
      tallyEntries.forEach(entry => {
        const key = `${entry.waste_type}-${entry.unit}`;
        if (!totals[key]) {
          totals[key] = { quantity: 0, unit: entry.unit };
        }
        totals[key].quantity += entry.quantity;
      });
      
      if (isMobile) {
        // Set tally data for template
        setTallyData({
          receiptQR: data.qr_code,
          createdAt: new Date(data.created_at),
          tallyEntries,
          totals,
        });
        
        // Wait for template to render
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!tallyTemplateRef.current) {
          toast({ title: "Error", description: "Tally template not ready", variant: "destructive" });
          return;
        }
        
        // Print the template as image
        await printerService.printElement(tallyTemplateRef.current, 1);
        toast({ title: "Success", description: "Tally printed successfully" });
        
        // Clear tally data
        setTallyData(null);
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
                body { font-family: 'Courier New', monospace; padding: 20px; max-width: 800px; margin: 0 auto; }
                h1 { text-align: center; font-size: 24px; margin-bottom: 10px; }
                .divider { border-top: 2px dashed #000; margin: 15px 0; }
                .info { margin: 5px 0; }
                .info-label { font-weight: bold; display: inline-block; width: 120px; }
                .section-title { font-weight: bold; font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
                .tally-entry { margin: 5px 0; padding: 8px; background: #f5f5f5; border-left: 3px solid #333; }
                .entry-number { display: inline-block; width: 40px; font-weight: bold; }
                .entry-type { font-weight: bold; }
                .entry-qty { float: right; }
                .totals { margin-top: 20px; padding: 10px; background: #e8e8e8; border: 2px solid #333; }
                .total-item { margin: 5px 0; padding: 5px; }
                .total-label { font-weight: bold; display: inline-block; width: 200px; }
                .total-value { float: right; font-weight: bold; }
                .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <h1>COLLECTION TALLY SHEET</h1>
              <div class="divider"></div>
              <div class="info"><span class="info-label">Date:</span> ${new Date(data.created_at).toLocaleString()}</div>
              <div class="info"><span class="info-label">QR Code:</span> ${data.qr_code}</div>
              <div class="divider"></div>
              
              <div class="section-title">Individual Tally Entries (${tallyEntries.length} entries)</div>
              ${tallyEntries.map((entry, idx) => `
                <div class="tally-entry">
                  <span class="entry-number">#${idx + 1}</span>
                  <span class="entry-type">${entry.waste_type}</span>
                  <span class="entry-qty">${entry.quantity} ${entry.unit || 'pcs'}</span>
                </div>
              `).join('')}
              
              <div class="section-title">Summary Totals</div>
              <div class="totals">
                ${Object.entries(totals).map(([key, total]) => {
                  const wasteType = key.split('-')[0];
                  return `
                    <div class="total-item">
                      <span class="total-label">${wasteType}</span>
                      <span class="total-value">${total.quantity} ${total.unit || 'pcs'}</span>
                    </div>
                  `;
                }).join('')}
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
                <div className="space-y-1 overflow-hidden">
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                  <div className="font-medium text-sm break-all">{r.qr_code}</div>
                  <div className="text-sm truncate">
                    <span className="text-muted-foreground">Signed by: </span>
                    {r.signed_by || '-'}
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
                  <TableCell className="max-w-[150px]">
                    <span className="block truncate" title={r.signed_by || '-'}>{r.signed_by || '-'}</span>
                  </TableCell>
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

      {tallyData && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div ref={tallyTemplateRef} style={{ paddingRight: "15mm", backgroundColor: "#ffffff" }}>
            <TallyTemplate {...tallyData} />
          </div>
        </div>
      )}
    </Card>
  );
};

export default CollectionsTab;
