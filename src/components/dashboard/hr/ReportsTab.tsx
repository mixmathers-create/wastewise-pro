import IncidentReportForm from "./IncidentReportForm";
import IncidentReportsAdmin from "./IncidentReportsAdmin";

export default function ReportsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Incident Reports</h2>
        <p className="text-muted-foreground">Submit and review incident reports</p>
      </div>

      <IncidentReportForm />
      <IncidentReportsAdmin />
    </div>
  );
}
