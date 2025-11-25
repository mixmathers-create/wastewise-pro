import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MechanicsTimeTracking } from "./mechanics/MechanicsTimeTracking";
import { ToolsInventory } from "./mechanics/ToolsInventory";
import { JobOrders } from "./mechanics/JobOrders";
import { ConsumablesInventory } from "./mechanics/ConsumablesInventory";
import MechanicalReportsNotifications from "./mechanics/MechanicalReportsNotifications";

export function MechanicsTab() {
  return (
    <Tabs defaultValue="time" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="time">Time Tracking</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
        <TabsTrigger value="consumables">Consumables</TabsTrigger>
        <TabsTrigger value="jobs">Job Orders</TabsTrigger>
        <TabsTrigger value="reports">Mechanical Reports</TabsTrigger>
      </TabsList>
      
      <TabsContent value="time">
        <MechanicsTimeTracking />
      </TabsContent>
      
      <TabsContent value="tools">
        <ToolsInventory />
      </TabsContent>
      
      <TabsContent value="consumables">
        <ConsumablesInventory />
      </TabsContent>
      
      <TabsContent value="jobs">
        <JobOrders />
      </TabsContent>
      
      <TabsContent value="reports">
        <MechanicalReportsNotifications />
      </TabsContent>
    </Tabs>
  );
}
