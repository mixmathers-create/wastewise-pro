import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Client {
  id: string;
  name: string;
  industry: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface Schedule {
  id?: string;
  date: string;
  shift: string;
  truck_id: string | null;
  client_ids?: string[];
}

interface TruckType {
  id: string;
  code: string;
}

interface RouteMapViewProps {
  schedules: Schedule[];
  clients: Client[];
  trucks: TruckType[];
  selectedDate?: string;
  landfillLat: number;
  landfillLon: number;
}

const SHIFT_COLORS = {
  AM: "#3b82f6", // blue
  PM: "#f59e0b", // amber
};

export const RouteMapView = ({ 
  schedules, 
  clients, 
  trucks, 
  selectedDate,
  landfillLat,
  landfillLon 
}: RouteMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },
        center: [landfillLon, landfillLat],
        zoom: 11,
      });

      map.current.addControl(new maplibregl.NavigationControl(), "top-right");

      // Add landfill marker
      new maplibregl.Marker({ color: "#ef4444" })
        .setLngLat([landfillLon, landfillLat])
        .setPopup(new maplibregl.Popup().setHTML("<strong>Landfill</strong>"))
        .addTo(map.current);

    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [landfillLat, landfillLon]);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers and sources
    const markers = document.querySelectorAll(".client-marker");
    markers.forEach((marker) => marker.remove());

    // Filter schedules by selected date if provided
    const filteredSchedules = selectedDate
      ? schedules.filter((s) => s.date === selectedDate)
      : schedules;

    // Get clients with valid coordinates
    const clientsMap = new Map(clients.map((c) => [c.id, c]));

    // Draw routes for each schedule
    filteredSchedules.forEach((schedule, idx) => {
      if (!schedule.client_ids || schedule.client_ids.length === 0) return;

      const truck = trucks.find((t) => t.id === schedule.truck_id);
      const color = SHIFT_COLORS[schedule.shift as keyof typeof SHIFT_COLORS] || "#6b7280";

      schedule.client_ids.forEach((clientId) => {
        const client = clientsMap.get(clientId);
        if (!client || !client.latitude || !client.longitude) return;

        // Add client marker
        const el = document.createElement("div");
        el.className = "client-marker";
        el.style.backgroundColor = color;
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

        new maplibregl.Marker(el)
          .setLngLat([client.longitude, client.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<strong>${client.name}</strong><br/>
              ${client.industry}<br/>
              ${schedule.shift} Shift<br/>
              Truck: ${truck?.code || "N/A"}`
            )
          )
          .addTo(map.current!);

        // Draw line to landfill
        const sourceId = `route-${schedule.id}-${clientId}`;
        if (map.current!.getSource(sourceId)) {
          map.current!.removeLayer(sourceId);
          map.current!.removeSource(sourceId);
        }

        map.current!.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [client.longitude, client.latitude],
                [landfillLon, landfillLat],
              ],
            },
          },
        });

        map.current!.addLayer({
          id: sourceId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": color,
            "line-width": 2,
            "line-opacity": 0.6,
          },
        });
      });
    });

    // Fit bounds to show all points
    if (filteredSchedules.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([landfillLon, landfillLat]);

      filteredSchedules.forEach((schedule) => {
        schedule.client_ids?.forEach((clientId) => {
          const client = clientsMap.get(clientId);
          if (client?.latitude && client?.longitude) {
            bounds.extend([client.longitude, client.latitude]);
          }
        });
      });

      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [schedules, clients, trucks, selectedDate, landfillLat, landfillLon]);

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-lg space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SHIFT_COLORS.AM }} />
          <span className="text-sm">AM Shift</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SHIFT_COLORS.PM }} />
          <span className="text-sm">PM Shift</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm">Landfill</span>
        </div>
      </div>
    </div>
  );
};
