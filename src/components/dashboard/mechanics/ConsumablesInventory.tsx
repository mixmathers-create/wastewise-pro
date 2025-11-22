import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ShoppingCart, Download, PackagePlus, AlertCircle } from "lucide-react";
import { AddConsumableDialog } from "./AddConsumableDialog";
import { EditConsumableDialog } from "./EditConsumableDialog";
import { CheckoutConsumableDialog } from "./CheckoutConsumableDialog";
import { RefillConsumableDialog } from "./RefillConsumableDialog";
import { format } from "date-fns";
import { generateCSV, downloadCSV } from "@/lib/csvUtils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ConsumablesInventory() {
  const [consumables, setConsumables] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<any>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [refillingConsumable, setRefillingConsumable] = useState<any>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchConsumables();
    fetchCheckouts();
  }, []);

  const fetchConsumables = async () => {
    const { data, error } = await supabase
      .from("mechanic_consumables")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setConsumables(data || []);
      
      // Check for low stock items
      const lowStock = (data || []).filter(item => item.quantity <= item.min_stock_level);
      setLowStockItems(lowStock);
    }
  };

  const fetchCheckouts = async () => {
    const { data } = await supabase
      .from("mechanic_consumable_checkouts")
      .select(`
        *,
        mechanic_consumables(name, code, unit),
        mechanics(name, id_number),
        trucks(code, plate_number),
        job_orders(job_number)
      `)
      .order("checked_out_at", { ascending: false });
    setCheckouts(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this consumable?")) return;

    try {
      const { error } = await supabase.from("mechanic_consumables").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Consumable deleted" });
      fetchConsumables();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleExportInventory = () => {
    const csvData = consumables.map(item => ({
      Code: item.code,
      Name: item.name,
      Category: item.category,
      Unit: item.unit,
      Quantity: item.quantity,
      'Min Stock': item.min_stock_level,
      Status: item.status
    }));
    const csv = generateCSV(csvData, ['Code', 'Name', 'Category', 'Unit', 'Quantity', 'Min Stock', 'Status']);
    downloadCSV(csv, `consumables-inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Success", description: "Inventory exported" });
  };

  const handleExportCheckouts = () => {
    const csvData = checkouts.map(checkout => ({
      Consumable: checkout.mechanic_consumables?.code || '',
      Name: checkout.mechanic_consumables?.name || '',
      Mechanic: checkout.mechanics?.name || '',
      'Mechanic ID': checkout.mechanics?.id_number || '',
      'Job Order': checkout.job_orders?.job_number || '',
      Truck: checkout.trucks?.code || '',
      'Quantity Used': checkout.quantity_used,
      Unit: checkout.mechanic_consumables?.unit || '',
      'Date Used': format(new Date(checkout.checked_out_at), 'yyyy-MM-dd HH:mm'),
      Notes: checkout.notes || ''
    }));
    const csv = generateCSV(csvData, ['Consumable', 'Name', 'Mechanic', 'Mechanic ID', 'Job Order', 'Truck', 'Quantity Used', 'Unit', 'Date Used', 'Notes']);
    downloadCSV(csv, `consumables-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Success", description: "Usage exported" });
  };

  return (
    <Tabs defaultValue="inventory" className="w-full">
      <TabsList>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="usage">Usage History</TabsTrigger>
      </TabsList>

      <TabsContent value="inventory">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Consumables Inventory</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportInventory}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Consumable
                </Button>
                <Button onClick={() => setShowCheckoutDialog(true)}>
                  <ShoppingCart className="h-4 w-4 mr-2" /> Use Consumable
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Low Stock Alert!</AlertTitle>
                <AlertDescription>
                  {lowStockItems.length} item(s) are at or below minimum stock level:
                  <ul className="list-disc list-inside mt-2">
                    {lowStockItems.map(item => (
                      <li key={item.id} className="flex items-center justify-between">
                        <span>
                          {item.name} - {item.quantity} {item.unit} (Min: {item.min_stock_level})
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setRefillingConsumable(item)}
                        >
                          <PackagePlus className="h-4 w-4 mr-1" />
                          Refill
                        </Button>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumables.map((item) => (
                  <TableRow key={item.id} className={item.quantity <= item.min_stock_level ? 'bg-orange-50' : ''}>
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className={item.quantity <= item.min_stock_level ? 'text-orange-600 font-bold' : ''}>
                      {item.quantity}
                    </TableCell>
                    <TableCell>{item.min_stock_level}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'in_stock' ? 'bg-green-100 text-green-800' : 
                        item.status === 'low_stock' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {item.quantity <= item.min_stock_level && (
                          <Button variant="default" size="sm" onClick={() => setRefillingConsumable(item)}>
                            <PackagePlus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setEditingConsumable(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="usage">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Consumable Usage History</CardTitle>
              <Button variant="outline" onClick={handleExportCheckouts}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consumable</TableHead>
                  <TableHead>Mechanic</TableHead>
                  <TableHead>Job Order</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Qty Used</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkouts.map((checkout) => (
                  <TableRow key={checkout.id}>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{checkout.mechanic_consumables?.code}</div>
                        <div className="text-sm text-muted-foreground">{checkout.mechanic_consumables?.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{checkout.mechanics?.name}</div>
                        <div className="text-xs text-muted-foreground">{checkout.mechanics?.id_number}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{checkout.job_orders?.job_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{checkout.trucks?.code}</div>
                        <div className="text-xs text-muted-foreground">{checkout.trucks?.plate_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {checkout.quantity_used} {checkout.mechanic_consumables?.unit}
                    </TableCell>
                    <TableCell>{format(new Date(checkout.checked_out_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{checkout.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <AddConsumableDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          fetchConsumables();
          setShowAddDialog(false);
        }}
      />

      {editingConsumable && (
        <EditConsumableDialog 
          consumable={editingConsumable}
          open={!!editingConsumable}
          onOpenChange={(open) => !open && setEditingConsumable(null)}
          onSuccess={() => {
            fetchConsumables();
            setEditingConsumable(null);
          }}
        />
      )}

      <CheckoutConsumableDialog 
        open={showCheckoutDialog}
        onOpenChange={setShowCheckoutDialog}
        onSuccess={() => {
          fetchConsumables();
          fetchCheckouts();
          setShowCheckoutDialog(false);
        }}
      />

      {refillingConsumable && (
        <RefillConsumableDialog 
          consumable={refillingConsumable}
          open={!!refillingConsumable}
          onOpenChange={(open) => !open && setRefillingConsumable(null)}
          onSuccess={() => {
            fetchConsumables();
            setRefillingConsumable(null);
          }}
        />
      )}
    </Tabs>
  );
}