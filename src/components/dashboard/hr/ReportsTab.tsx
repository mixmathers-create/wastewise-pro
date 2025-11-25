import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Wrench } from "lucide-react";
import IncidentReportForm from "./IncidentReportForm";
import MechanicalReportForm from "./MechanicalReportForm";
import ReportsList from "./ReportsList";

export default function ReportsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-muted-foreground">Submit and manage incident and mechanical reports</p>
      </div>

      <Tabs defaultValue="incident" className="space-y-6">
        <TabsList>
          <TabsTrigger value="incident" className="gap-2">
            <FileText className="h-4 w-4" />
            Incident Reports
          </TabsTrigger>
          <TabsTrigger value="mechanical" className="gap-2">
            <Wrench className="h-4 w-4" />
            Mechanical Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incident" className="space-y-6">
          <IncidentReportForm />
          <ReportsList type="incident" />
        </TabsContent>

        <TabsContent value="mechanical" className="space-y-6">
          <MechanicalReportForm />
          <ReportsList type="mechanical" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
