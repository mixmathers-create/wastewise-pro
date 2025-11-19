import { useEffect, useRef, useState } from "react";
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

const WAREHOUSE_LAT = 10.349687843989079;
const WAREHOUSE_LON = 123.93580520941734;

// Generate distinct colors for trucks
const TRUCK_COLORS = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#84cc16", // lime
  "#6366f1", // indigo
];

// Unique colors for warehouse and landfill (not in TRUCK_COLORS)
const WAREHOUSE_COLOR = "#92400e"; // brown
const LANDFILL_COLOR = "#1f2937"; // dark gray

// Helper function to calculate distance between two points (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Optimize route order using nearest neighbor algorithm
const optimizeRoute = (clientIds: string[], clientsMap: Map<string, Client>, startLat: number, startLon: number) => {
  if (clientIds.length <= 1) return clientIds;
  
  const unvisited = [...clientIds];
  const route: string[] = [];
  let currentLat = startLat;
  let currentLon = startLon;
  
  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;
    
    unvisited.forEach((clientId, idx) => {
      const client = clientsMap.get(clientId);
      if (client?.latitude && client?.longitude) {
        const distance = calculateDistance(currentLat, currentLon, client.latitude, client.longitude);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIdx = idx;
        }
      }
    });
    
    const nearestClient = unvisited[nearestIdx];
    route.push(nearestClient);
    const client = clientsMap.get(nearestClient);
    if (client?.latitude && client?.longitude) {
      currentLat = client.latitude;
      currentLon = client.longitude;
    }
    unvisited.splice(nearestIdx, 1);
  }
  
  return route;
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
  const [mapLoaded, setMapLoaded] = useState(false);

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

      // Wait for style to load before adding markers and sources
      map.current.on('load', () => {
        setMapLoaded(true);
        
        // Add warehouse marker after map is loaded
        if (map.current) {
          new maplibregl.Marker({ color: WAREHOUSE_COLOR })
            .setLngLat([WAREHOUSE_LON, WAREHOUSE_LAT])
            .setPopup(new maplibregl.Popup().setHTML("<strong>Warehouse/Dispatch</strong>"))
            .addTo(map.current);
          
          // Add landfill marker
          new maplibregl.Marker({ color: LANDFILL_COLOR })
            .setLngLat([landfillLon, landfillLat])
            .setPopup(new maplibregl.Popup().setHTML("<strong>Landfill</strong>"))
            .addTo(map.current);
        }
      });

    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [landfillLat, landfillLon]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

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
      const truckIdx = trucks.findIndex((t) => t.id === schedule.truck_id);
      const color = TRUCK_COLORS[truckIdx % TRUCK_COLORS.length];

      // Optimize route order starting from warehouse
      const optimizedClientIds = optimizeRoute(schedule.client_ids, clientsMap, WAREHOUSE_LAT, WAREHOUSE_LON);

      // Add client markers
      optimizedClientIds.forEach((clientId, orderIdx) => {
        const client = clientsMap.get(clientId);
        if (!client || !client.latitude || !client.longitude) return;

        // Add numbered client marker with truck color
        const el = document.createElement("div");
        el.className = "client-marker";
        el.style.cssText = `
          background-color: ${color} !important;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: bold;
        `;
        el.textContent = String(orderIdx + 1);

        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([client.longitude, client.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<strong>#${orderIdx + 1}: ${client.name}</strong><br/>
              ${client.industry}<br/>
              ${schedule.shift} Shift<br/>
              Truck: ${truck?.code || "N/A"}`
            )
          )
          .addTo(map.current!);
      });

      // Build complete route: warehouse -> clients -> landfill -> warehouse
      const routeCoordinates: [number, number][] = [[WAREHOUSE_LON, WAREHOUSE_LAT]];
      
      optimizedClientIds.forEach((clientId) => {
        const client = clientsMap.get(clientId);
        if (client?.latitude && client?.longitude) {
          routeCoordinates.push([client.longitude, client.latitude]);
        }
      });
      
      routeCoordinates.push([landfillLon, landfillLat]);
      routeCoordinates.push([WAREHOUSE_LON, WAREHOUSE_LAT]);

      // Draw complete route line
      const sourceId = `route-${schedule.id}`;
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
            coordinates: routeCoordinates,
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
          "line-width": 3,
          "line-opacity": 0.7,
        },
      });
    });

    // Fit bounds to show all points including warehouse
    if (filteredSchedules.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([WAREHOUSE_LON, WAREHOUSE_LAT]);
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
  }, [schedules, clients, trucks, selectedDate, mapLoaded, landfillLat, landfillLon]);

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-lg space-y-2 max-h-[400px] overflow-y-auto">
        <div className="font-semibold text-sm mb-2">Legend</div>
        {trucks.map((truck, idx) => (
          <div key={truck.id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRUCK_COLORS[idx % TRUCK_COLORS.length] }} />
            <span className="text-sm">{truck.code}</span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: WAREHOUSE_COLOR }} />
            <span className="text-sm">Warehouse</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LANDFILL_COLOR }} />
            <span className="text-sm">Landfill</span>
          </div>
        </div>
      </div>
    </div>
  );
};
