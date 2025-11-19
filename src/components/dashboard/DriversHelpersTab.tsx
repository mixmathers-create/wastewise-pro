import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EquipmentInventory from "./drivershelpers/EquipmentInventory";

// Import will be resolved through circular reference resolution
const DriversHelpersInventory = ({ profile }: { profile: any }) => {
  // This will be the personnel management component
  return <div>Drivers and Helpers content here</div>;
};

export default function DriversHelpersTab({ profile }: { profile: any }) {
  return (
    <Tabs defaultValue="personnel" className="w-full">
      <TabsList>
        <TabsTrigger value="personnel">Drivers & Helpers</TabsTrigger>
        <TabsTrigger value="equipment">Equipment Inventory</TabsTrigger>
      </TabsList>
      
      <TabsContent value="personnel">
        <DriversHelpersInventory profile={profile} />
      </TabsContent>
      
      <TabsContent value="equipment">
        <EquipmentInventory />
      </TabsContent>
    </Tabs>
  );
}
