import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Printer, Download, List, WifiOff, Loader2 } from "lucide-react";
import CreateReceiptForm from "../collection/CreateReceiptForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { generateCSV, downloadCSV } from "@/lib/csvUtils";
import { Input } from "@/components/ui/input";
import { printerService } from "@/lib/printerService";
import TallyTemplate, { TallyTemplateProps } from "../collection/TallyTemplate";
import { downloadReceiptPdf, downloadMultipleReceiptPdfs } from "@/lib/pdfUtils";
import type { CachedClient, CachedTruck, CachedDriver, CachedHelper } from "@/lib/offlineDb";

interface CollectionsTabProps {
  profile: any;
  isOnline?: boolean;
  cachedClients?: CachedClient[];
  cachedTrucks?: CachedTruck[];
  cachedDrivers?: CachedDriver[];
  cachedHelpers?: CachedHelper[];
}

const CollectionsTab = ({ 
  profile, 
  isOnline = true, 
  cachedClients = [], 
  cachedTrucks = [], 
  cachedDrivers = [], 
  cachedHelpers = [] 
}: CollectionsTabProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [tallyData, setTallyData] = useState<TallyTemplateProps | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const tallyTemplateRef = useRef<HTMLDivElement>(null);
  const isMobile = Capacitor.isNativePlatform();
  const isAdmin = profile?.role === "admin";
  const ITEMS_PER_PAGE = 10;

  const fetchReceipts = async (page = 1) => {
    if (!isOnline) {
      setError("Currently offline - cannot fetch collections");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors
    const from = (page - 1) * ITEMS_PER_PAGE; 
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("collection_receipts")
      .select("id,created_at,qr_code,signed_by", { count: 'exact' })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) setError(error.message);
    setReceipts(data || []);
    setTotalReceipts(count || 0);
    setLoading(false);
  };

 useEffect(() => {
    // Trigger fetch on isOnline or currentPage change
    fetchReceipts(currentPage);
  }, [isOnline, currentPage]);

  const handleSuccess = () => {
    setDialogOpen(false);
    // Only fetch if online, otherwise the offline message will remain
    if (isOnline) {
      fetchReceipts(currentPage); // Use currentPage to refresh the current page
    }
  };

  const fetchReceiptDetails = async (receiptId: string) => {
    const { data, error } = await supabase
      .from("collection_receipts")
      .select("*")
      .eq("id", receiptId)
      .single();

    if (error || !data) {
      throw error || new Error("Receipt not found");
    }

    const [clientRes, truckRes, driverRes, helpersRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", data.client_id).single(),
      supabase.from("trucks").select("*").eq("id", data.truck_id).maybeSingle(),
      supabase.from("drivers").select("*").eq("id", data.driver_id).single(),
      data.helper_ids && data.helper_ids.length > 0
        ? supabase.from("helpers").select("*").in("id", data.helper_ids)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (clientRes.error) throw clientRes.error;
    if (driverRes.error) throw driverRes.error;
    if (helpersRes.error) throw helpersRes.error;

    return {
      receipt: data,
      client: clientRes.data,
      truck: truckRes.data || {},
      driver: driverRes.data,
      helpers: helpersRes.data || [],
    };
  };

  const downloadReceiptPdfById = async (receiptId: string) => {
    const { receipt, client, truck, driver, helpers } = await fetchReceiptDetails(receiptId);

    await downloadReceiptPdf({
      receiptQR: receipt.qr_code,
      createdAt: receipt.created_at,
      client,
      truck,
      driver,
      helpers,
      items: receipt.items || [],
      signedBy: receipt.signed_by,
      signatureData: receipt.signature_data,
    });
  };

  const handleDownloadReceiptPdf = async (receiptId: string) => {
    if (!isOnline) {
      toast({ title: "Download Error", description: "Cannot download while offline", variant: "destructive" });
      return;
    }

    try {
      setPdfDownloading(true);
      await downloadReceiptPdfById(receiptId);
      toast({ title: "PDF Downloaded", description: "Receipt PDF downloaded successfully" });
    } catch (error: any) {
      toast({ title: "Download Error", description: error.message || "Failed to download receipt PDF", variant: "destructive" });
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleBulkDownloadPdfs = async () => {
    if (!isOnline) {
      toast({ title: "Download Error", description: "Cannot download while offline", variant: "destructive" });
      return;
    }

    if (selectedReceipts.size === 0) {
      toast({ title: "No Receipts Selected", description: "Select receipts to download PDFs", variant: "destructive" });
      return;
    }

    try {
      setPdfDownloading(true);
      const payloads = [];

      for (const receiptId of selectedReceipts) {
        const { receipt, client, truck, driver, helpers } = await fetchReceiptDetails(receiptId);
        payloads.push({
          receiptQR: receipt.qr_code,
          createdAt: receipt.created_at,
          client,
          truck,
          driver,
          helpers,
          items: receipt.items || [],
          signedBy: receipt.signed_by,
          signatureData: receipt.signature_data,
        });
      }

      await downloadMultipleReceiptPdfs(payloads);
      toast({ title: "Bulk PDF Download", description: `Downloaded ${payloads.length} receipt PDFs` });
    } catch (error: any) {
      toast({ title: "Download Error", description: error.message || "Failed to download PDFs", variant: "destructive" });
    } finally {
      setPdfDownloading(false);
    }
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
      fetchReceipts(currentPage);
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkDownloadPdfsByDateRange = async () => {
    if (!isOnline) {
      toast({ title: "Download Error", description: "Cannot download while offline", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Download Error", description: "Please select both start and end dates", variant: "destructive" });
      return;
    }

    // Convert local date strings to UTC ISO strings
    const startUTC = new Date(`${startDate}T00:00:00`).toISOString();
    const endUTC = new Date(`${endDate}T23:59:59`).toISOString();

    try {
      setPdfDownloading(true);

      // 1. Fetch all receipts in date range in one batched query
      let allReceipts: any[] = [];
      let page = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * batchSize;
        const { data, error } = await supabase
          .from("collection_receipts")
          .select("id,qr_code,created_at,client_id,truck_id,driver_id,helper_ids,items,signed_by,signature_data")
          .gte("created_at", startUTC)
          .lte("created_at", endUTC)
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allReceipts = allReceipts.concat(data);
        hasMore = data.length === batchSize;
        page++;
      }

      if (allReceipts.length === 0) {
        toast({ title: "No Receipts", description: "No receipts found for selected date range" });
        return;
      }

      // 2. Collect unique IDs for bulk lookup
      const clientIds = [...new Set(allReceipts.map(r => r.client_id).filter(Boolean))];
      const truckIds = [...new Set(allReceipts.map(r => r.truck_id).filter(Boolean))];
      const driverIds = [...new Set(allReceipts.map(r => r.driver_id).filter(Boolean))];
      const helperIds = [...new Set(allReceipts.flatMap(r => r.helper_ids || []).filter(Boolean))];

      // 3. Bulk fetch all related records in 4 queries total
      const [clientsRes, trucksRes, driversRes, helpersRes] = await Promise.all([
        clientIds.length > 0 ? supabase.from("clients").select("*").in("id", clientIds) : Promise.resolve({ data: [], error: null }),
        truckIds.length > 0 ? supabase.from("trucks").select("*").in("id", truckIds) : Promise.resolve({ data: [], error: null }),
        driverIds.length > 0 ? supabase.from("drivers").select("*").in("id", driverIds) : Promise.resolve({ data: [], error: null }),
        helperIds.length > 0 ? supabase.from("helpers").select("*").in("id", helperIds) : Promise.resolve({ data: [], error: null }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (driversRes.error) throw driversRes.error;

      // 4. Build lookup maps
      const clientMap = Object.fromEntries((clientsRes.data || []).map(c => [c.id, c]));
      const truckMap = Object.fromEntries((trucksRes.data || []).map(t => [t.id, t]));
      const driverMap = Object.fromEntries((driversRes.data || []).map(d => [d.id, d]));
      const helperMap = Object.fromEntries((helpersRes.data || []).map(h => [h.id, h]));

      // 5. Assemble payloads from maps — no extra queries needed
      const payloads = allReceipts.map(receipt => ({
        receiptQR: receipt.qr_code,
        createdAt: receipt.created_at,
        client: clientMap[receipt.client_id] || {},
        truck: truckMap[receipt.truck_id] || {},
        driver: driverMap[receipt.driver_id] || {},
        helpers: (receipt.helper_ids || []).map((id: string) => helperMap[id]).filter(Boolean),
        items: receipt.items || [],
        signedBy: receipt.signed_by,
        signatureData: receipt.signature_data,
      }));

      await downloadMultipleReceiptPdfs(payloads, `receipts-${startDate}-to-${endDate}.pdf`);
      toast({ title: "Bulk PDF Download", description: `Downloaded ${payloads.length} receipt PDFs` });
    } catch (error: any) {
      toast({ title: "Download Error", description: error.message || "Failed to download PDFs", variant: "destructive" });
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleExport = async () => {
    if (!isOnline) {
      toast({
        title: "Export Error",
        description: "Cannot export while offline",
        variant: "destructive"
      });
      return;
    }
    if (!startDate || !endDate) {
      toast({
        title: "Export Error",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    // Convert local date strings to UTC ISO strings
    const startUTC = new Date(`${startDate}T00:00:00`).toISOString();
    const endUTC = new Date(`${endDate}T23:59:59`).toISOString();

    try {
      setExporting(true);

      let query = supabase
        .from("collection_receipts")
        .select(`
          id,
          created_at,
          qr_code,
          client_id,
          items,
          waste_types,
          clients(name)
        `)
        .gte("created_at", startUTC)
        .lte("created_at", endUTC)
        .order("created_at", { ascending: false });

      // Batch fetch to bypass Supabase 1000-row limit
      let allReceipts: any[] = [];
      let page = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * batchSize;
        const to = from + batchSize - 1;
        const { data, error } = await query.range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allReceipts = allReceipts.concat(data);
        hasMore = data.length === batchSize;
        page++;
      }

      if (allReceipts.length === 0) {
        toast({
          title: "Export",
          description: "No receipts found for selected date range"
        });
        return;
      }

      const data = allReceipts.map(r => {
        const items = (r.items as any[]) || [];
        const totalWeight = items.reduce((sum, item) => {
          return sum + (item.quantity || 0);
        }, 0);

        const unit = items.length > 0 && items[0].unit ? items[0].unit : 'kg';

        const wasteTypes = Array.isArray(r.waste_types)
          ? r.waste_types.join(', ')
          : '-';

        const clientName = (r.clients as any)?.name || '-';

        return {
          date: new Date(r.created_at).toLocaleString(),
          receipt: r.qr_code,
          client_name: clientName,
          total_weight: `${totalWeight} ${unit}`,
          waste_type: wasteTypes
        };
      });

      const csv = generateCSV(data, ["date", "receipt", "client_name", "total_weight", "waste_type"]);

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const dateTime = `${year}-${month}-${day}T${hours}${minutes}`;
      const rangeSuffix = `-dates-${startDate}-to-${endDate}`;
      const filename = `collectionsExport-${dateTime}${rangeSuffix}.csv`;

      downloadCSV(csv, filename);
      toast({
        title: "Success",
        description: `Exported ${allReceipts.length} collection(s) successfully`
      });
    } catch (err: any) {
      toast({
        title: "Export Error",
        description: err.message || "Failed to export collections",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
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
      
      // Calculate totals by waste type, unit and bin size
      const totals: { [key: string]: { quantity: number; unit: string; bin_size?: string } } = {};
      tallyEntries.forEach(entry => {
        const key = `${entry.waste_type}-${entry.unit}-${entry.bin_size || ""}`;
        if (!totals[key]) {
          totals[key] = { quantity: 0, unit: entry.unit, bin_size: entry.bin_size };
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
                  <span class="entry-qty">${entry.quantity} ${entry.unit || 'pcs'}${entry.bin_size ? ` (${entry.bin_size})` : ''}</span>
                </div>
              `).join('')}
              
              <div class="section-title">Summary Totals</div>
              <div class="totals">
                ${Object.entries(totals).map(([key, total]) => {
                  const wasteType = key.split('-')[0];
                  return `
                    <div class="total-item">
                      <span class="total-label">${wasteType}</span>
                      <span class="total-value">${total.quantity} ${total.unit || 'pcs'}${total.bin_size ? ` (${total.bin_size})` : ''}</span>
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
              <>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-48 pr-9"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-48 pr-9"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!startDate || !endDate || exporting}
                  onClick={handleExport}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {exporting ? "Exporting..." : "Export CSV"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!startDate || !endDate || pdfDownloading}
                  onClick={handleBulkDownloadPdfsByDateRange}
                >
                  {pdfDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {pdfDownloading ? "Downloading..." : "Download PDFs"}
                </Button>
              </>
            )}
            {!isMobile && selectedReceipts.size > 0 && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleBulkDownloadPdfs}
                disabled={pdfDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {pdfDownloading ? "Downloading..." : `Download PDFs (${selectedReceipts.size})`}
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
                <CreateReceiptForm 
                  profile={profile} 
                  onSuccess={handleSuccess} 
                  isOnline={isOnline}
                  cachedClients={cachedClients}
                  cachedTrucks={cachedTrucks}
                  cachedDrivers={cachedDrivers}
                  cachedHelpers={cachedHelpers}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "p-2" : ""}>
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="rounded-full bg-muted p-3 mb-3">
              <WifiOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center font-medium">{error}</p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              You can still create new collections offline
            </p>
          </div>
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
                    onClick={() => handleDownloadReceiptPdf(r.id)}
                    disabled={pdfDownloading}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
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
                        onClick={() => handleDownloadReceiptPdf(r.id)}
                        disabled={pdfDownloading}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
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
        
        {!isMobile && totalReceipts > ITEMS_PER_PAGE && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {Math.ceil(totalReceipts / ITEMS_PER_PAGE)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalReceipts / ITEMS_PER_PAGE), p + 1))}
              disabled={currentPage >= Math.ceil(totalReceipts / ITEMS_PER_PAGE)}
            >
              Next
            </Button>
          </div>
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
