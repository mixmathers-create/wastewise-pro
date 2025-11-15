import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isFuture, isPast } from "date-fns";
import { Calendar, Clock, Truck, Users, CheckCircle2 } from "lucide-react";

interface Schedule {
  id?: string;
  date: string;
  shift: string;
  driver_id: string | null;
  helper_ids: string[];
  truck_id: string | null;
  status: string;
  mt_requirement?: number;
  approved_by?: string;
  approved_at?: string;
}

interface Driver {
  id: string;
  name: string;
}

interface Helper {
  id: string;
  name: string;
}

interface TruckType {
  id: string;
  code: string;
  type: string;
}

interface Props {
  schedules: Schedule[];
  drivers: Driver[];
  helpers: Helper[];
  trucks: TruckType[];
}

export const LiveScheduleView = ({ schedules, drivers, helpers, trucks }: Props) => {
  // Group schedules by date and shift
  const groupedSchedules = schedules
    .filter(s => s.status === 'approved' || s.status === 'scheduled')
    .reduce((acc, schedule) => {
      const key = `${schedule.date}||${schedule.shift}`;
      if (!acc[key]) {
        acc[key] = {
          date: schedule.date,
          shift: schedule.shift,
          schedules: [],
          totalMT: 0
        };
      }
      acc[key].schedules.push(schedule);
      acc[key].totalMT += schedule.mt_requirement || 0;
      return acc;
    }, {} as Record<string, { date: string; shift: string; schedules: Schedule[]; totalMT: number }>);

  const sortedGroups = Object.values(groupedSchedules).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.shift === "AM" ? -1 : 1;
  });

  const getDateBadgeVariant = (date: string) => {
    const scheduleDate = new Date(date);
    if (isToday(scheduleDate)) return "default";
    if (isFuture(scheduleDate)) return "secondary";
    return "outline";
  };

  const getDateLabel = (date: string) => {
    const scheduleDate = new Date(date);
    if (isToday(scheduleDate)) return "Today";
    if (isPast(scheduleDate)) return "Past";
    return "Upcoming";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Live Active Schedule
        </CardTitle>
        <CardDescription>
          All approved schedules currently in effect
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No approved schedules yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedGroups.map(({ date, shift, schedules: groupSchedules, totalMT }) => (
              <Card key={`${date}-${shift}`} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {format(new Date(date), "EEEE, MMMM dd, yyyy")}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getDateBadgeVariant(date)}>
                          {getDateLabel(date)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {shift === "AM" ? "8AM-8PM" : "8PM-8AM"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{groupSchedules.length}</div>
                      <div className="text-xs text-muted-foreground">trucks deployed</div>
                      <div className="text-sm font-medium mt-1">{totalMT.toFixed(1)} MT</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {groupSchedules.map((schedule, idx) => {
                      const driver = drivers.find(d => d.id === schedule.driver_id);
                      const truck = trucks.find(t => t.id === schedule.truck_id);
                      const scheduleHelpers = helpers.filter(h => schedule.helper_ids.includes(h.id));

                      return (
                        <div 
                          key={idx}
                          className="border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-primary" />
                              <span className="font-semibold">{truck?.code || 'N/A'}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {truck?.type || 'N/A'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{driver?.name || 'No driver'}</span>
                            </div>
                            <div className="text-xs text-muted-foreground pl-5">
                              Helpers: {scheduleHelpers.map(h => h.name).join(', ') || 'None'}
                            </div>
                            {schedule.mt_requirement && (
                              <div className="text-xs font-medium text-primary pl-5">
                                {schedule.mt_requirement.toFixed(1)} MT capacity
                              </div>
                            )}
                          </div>
                          
                          {schedule.approved_by && (
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              <span>Approved by {schedule.approved_by}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
