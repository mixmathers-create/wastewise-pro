import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";

interface Schedule {
  id?: string;
  date: string;
  shift: string;
  driver_id: string | null;
  helper_ids: string[];
  truck_id: string | null;
  status: string;
  mt_requirement?: number;
}

interface Driver {
  id: string;
  name: string;
}

interface Truck {
  id: string;
  code: string;
  type: string;
  capacity: number;
}

interface Props {
  schedules: Schedule[];
  drivers: Driver[];
  trucks: Truck[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const VisualScheduleChart = ({ schedules, drivers, trucks }: Props) => {
  // Bar chart data: trucks per day
  const dailyData = schedules.reduce((acc, schedule) => {
    const dateKey = format(new Date(schedule.date), "MMM dd");
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, AM: 0, PM: 0, totalMT: 0 };
    }
    if (schedule.shift === "AM") acc[dateKey].AM++;
    else acc[dateKey].PM++;
    acc[dateKey].totalMT += schedule.mt_requirement || 0;
    return acc;
  }, {} as Record<string, { date: string; AM: number; PM: number; totalMT: number }>);

  const chartData = Object.values(dailyData);

  // Pie chart data: truck utilization by type
  const truckUtilization = schedules.reduce((acc, schedule) => {
    const truck = trucks.find(t => t.id === schedule.truck_id);
    if (truck) {
      if (!acc[truck.type]) acc[truck.type] = 0;
      acc[truck.type]++;
    }
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(truckUtilization).map(([name, value]) => ({
    name,
    value
  }));

  // Driver workload
  const driverWorkload = schedules.reduce((acc, schedule) => {
    const driver = drivers.find(d => d.id === schedule.driver_id);
    if (driver) {
      if (!acc[driver.name]) acc[driver.name] = 0;
      acc[driver.name]++;
    }
    return acc;
  }, {} as Record<string, number>);

  const driverData = Object.entries(driverWorkload)
    .map(([name, shifts]) => ({ name, shifts }))
    .sort((a, b) => b.shifts - a.shifts)
    .slice(0, 10);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Daily Truck Deployment</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Legend />
              <Bar dataKey="AM" fill="hsl(var(--primary))" name="Morning Shift" />
              <Bar dataKey="PM" fill="hsl(var(--secondary))" name="Night Shift" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Truck Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Top Driver Workload</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driverData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="name" type="category" width={120} stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="shifts" fill="hsl(var(--accent))" name="Shifts Assigned" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
