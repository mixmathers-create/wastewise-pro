import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, LogOut, LogIn, Download } from "lucide-react";
import { AddEquipmentDialog } from "./AddEquipmentDialog";
import { EditEquipmentDialog } from "./EditEquipmentDialog";
import { CheckoutEquipmentDialog } from "./CheckoutEquipmentDialog";
import { CheckinEquipmentDialog } from "./CheckinEquipmentDialog";
import { generateCSV, downloadCSV } from "@/lib/csvUtils";
import { format } from "date-fns";

export default function EquipmentInventory() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [checkinEquipment, setCheckinEquipment] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEquipment();
    fetchCheckouts();
  }, []);

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from("equipment_inventory")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEquipment(data || []);
    }
  };

  const fetchCheckouts = async () => {
    const { data } = await supabase
      .from("equipment_checkouts")
      .select(`
        *,
        equipment_inventory(name, code, type, is_consumable),
        drivers(name),
        helpers(name)
      `)
      .order("checked_out_at", { ascending: false });
    setCheckouts(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment?")) return;

    try {
      const { error } = await supabase.from("equipment_inventory").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Equipment deleted" });
      fetchEquipment();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleExportInventory = () => {
    const csvData = equipment.map(item => ({
      Code: item.code,
      Name: item.name,
      Type: item.type,
      Consumable: item.is_consumable ? 'Yes' : 'No',
      Quantity: item.quantity,
      Status: item.status
    }));
    const csv = generateCSV(csvData, ['Code', 'Name', 'Type', 'Consumable', 'Quantity', 'Status']);
    downloadCSV(csv, `equipment-inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Success", description: "Inventory exported" });
  };

  const handleExportCheckouts = () => {
    const csvData = checkouts.map(checkout => ({
      Equipment: checkout.equipment_inventory?.code || '',
      Name: checkout.equipment_inventory?.name || '',
      'Assigned To': checkout.assigned_to_type === 'driver' 
        ? checkout.drivers?.name || '' 
        : checkout.helpers?.name || '',
      Type: checkout.assigned_to_type,
      Quantity: checkout.quantity,
      'Checked Out': format(new Date(checkout.checked_out_at), 'yyyy-MM-dd HH:mm'),
      'Checked In': checkout.checked_in_at ? format(new Date(checkout.checked_in_at), 'yyyy-MM-dd HH:mm') : '',
      Status: checkout.status
    }));
    const csv = generateCSV(csvData, ['Equipment', 'Name', 'Assigned To', 'Type', 'Quantity', 'Checked Out', 'Checked In', 'Status']);
    downloadCSV(csv, `equipment-checkouts-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Success", description: "Checkouts exported" });
  };

  return (
    <Tabs defaultValue="inventory" className="w-full">
      <TabsList>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="checkouts">Checkouts</TabsTrigger>
      </TabsList>

      <TabsContent value="inventory">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Equipment Inventory</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportInventory}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Equipment
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Consumable</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>
                      {item.is_consumable ? (
                        <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Yes</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">No</span>
                      )}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.status === "available" ? "bg-green-100 text-green-800" :
                        "bg-orange-100 text-orange-800"
                      }`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingEquipment(item)}>
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

      <TabsContent value="checkouts">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Equipment Checkouts</CardTitle>
              <Button onClick={() => setShowCheckoutDialog(true)}>
                <LogOut className="h-4 w-4 mr-2" /> Check Out Equipment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Checked Out</TableHead>
                  <TableHead>Checked In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkouts.map((checkout) => (
                  <TableRow key={checkout.id}>
                    <TableCell className="font-mono">
                      {checkout.equipment_inventory?.code} - {checkout.equipment_inventory?.name}
                    </TableCell>
                    <TableCell>{checkout.assigned_to_type}</TableCell>
                    <TableCell>
                      {checkout.assigned_to_type === "driver" 
                        ? checkout.drivers?.name 
                        : checkout.helpers?.name}
                    </TableCell>
                    <TableCell>{checkout.quantity}</TableCell>
                    <TableCell>{new Date(checkout.checked_out_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {checkout.checked_in_at ? new Date(checkout.checked_in_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        checkout.status === "checked_out" ? "bg-orange-100 text-orange-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {checkout.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {checkout.status === "checked_out" && !checkout.equipment_inventory?.is_consumable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCheckinEquipment(checkout)}
                        >
                          <LogIn className="h-4 w-4 mr-2" /> Check In
                        </Button>
                      )}
                      {checkout.equipment_inventory?.is_consumable && checkout.status === 'checked_out' && (
                        <span className="text-xs text-muted-foreground">Consumable</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <AddEquipmentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchEquipment}
      />

      {editingEquipment && (
        <EditEquipmentDialog
          equipment={editingEquipment}
          open={!!editingEquipment}
          onOpenChange={(open) => !open && setEditingEquipment(null)}
          onSuccess={fetchEquipment}
        />
      )}

      <CheckoutEquipmentDialog
        open={showCheckoutDialog}
        onOpenChange={setShowCheckoutDialog}
        onSuccess={() => {
          fetchCheckouts();
          fetchEquipment();
        }}
      />

      {checkinEquipment && (
        <CheckinEquipmentDialog
          checkout={checkinEquipment}
          open={!!checkinEquipment}
          onOpenChange={(open) => !open && setCheckinEquipment(null)}
          onSuccess={() => {
            fetchCheckouts();
            fetchEquipment();
          }}
        />
      )}
    </Tabs>
  );
}
