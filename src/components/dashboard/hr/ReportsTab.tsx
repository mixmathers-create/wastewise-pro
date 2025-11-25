import IncidentReportForm from "./IncidentReportForm";
import MechanicalReportForm from "./MechanicalReportForm";

export default function ReportsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-muted-foreground">Submit incident and mechanical reports</p>
      </div>

      <IncidentReportForm />
      <MechanicalReportForm />
    </div>
  );
}
