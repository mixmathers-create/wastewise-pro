import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MechanicsInventory } from "./mechanics/MechanicsInventory";
import { MechanicsTimeTracking } from "./mechanics/MechanicsTimeTracking";
import { ToolsInventory } from "./mechanics/ToolsInventory";
import { ToolCheckouts } from "./mechanics/ToolCheckouts";
import { JobOrders } from "./mechanics/JobOrders";
import { ConsumablesInventory } from "./mechanics/ConsumablesInventory";

export function MechanicsTab() {
  return (
    <Tabs defaultValue="inventory" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="inventory">Mechanics</TabsTrigger>
        <TabsTrigger value="time">Time Tracking</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
        <TabsTrigger value="checkouts">Checkouts</TabsTrigger>
        <TabsTrigger value="consumables">Consumables</TabsTrigger>
        <TabsTrigger value="jobs">Job Orders</TabsTrigger>
      </TabsList>
      
      <TabsContent value="inventory">
        <MechanicsInventory />
      </TabsContent>
      
      <TabsContent value="time">
        <MechanicsTimeTracking />
      </TabsContent>
      
      <TabsContent value="tools">
        <ToolsInventory />
      </TabsContent>
      
      <TabsContent value="checkouts">
        <ToolCheckouts />
      </TabsContent>
      
      <TabsContent value="consumables">
        <ConsumablesInventory />
      </TabsContent>
      
      <TabsContent value="jobs">
        <JobOrders />
      </TabsContent>
    </Tabs>
  );
}
