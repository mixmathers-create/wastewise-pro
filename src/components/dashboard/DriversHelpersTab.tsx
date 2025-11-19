import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EquipmentInventory from "./drivershelpers/EquipmentInventory";
import DriversHelpersPersonnel from "./drivershelpers/DriversHelpersPersonnel";

export default function DriversHelpersTab({ profile }: { profile: any }) {
  return (
    <Tabs defaultValue="personnel" className="w-full">
      <TabsList>
        <TabsTrigger value="personnel">Drivers & Helpers</TabsTrigger>
        <TabsTrigger value="equipment">Equipment Inventory</TabsTrigger>
      </TabsList>
      
      <TabsContent value="personnel">
        <DriversHelpersPersonnel profile={profile} />
      </TabsContent>
      
      <TabsContent value="equipment">
        <EquipmentInventory />
      </TabsContent>
    </Tabs>
  );
}
