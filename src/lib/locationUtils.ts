// Haversine formula to calculate distance between two coordinates in km
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Group clients by proximity for truck assignment
export function groupClientsByProximity(
  clients: any[],
  truckCapacity: number
): any[][] {
  if (clients.length === 0) return [];
  
  const groups: any[][] = [];
  const remaining = [...clients];
  
  while (remaining.length > 0) {
    const group: any[] = [];
    let currentMT = 0;
    
    // Start with the first remaining client
    const startClient = remaining.shift()!;
    group.push(startClient);
    currentMT += startClient.mt_requirement || 0;
    
    // Find nearest clients that fit in the truck
    while (remaining.length > 0 && currentMT < truckCapacity) {
      // Find the closest client to any client in the current group
      let closestIndex = -1;
      let minDistance = Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        if ((currentMT + (candidate.mt_requirement || 0)) > truckCapacity) {
          continue; // Would exceed capacity
        }
        
        // Check if candidate has location data
        if (!candidate.latitude || !candidate.longitude) continue;
        
        // Find minimum distance to any client in the current group
        for (const groupClient of group) {
          if (!groupClient.latitude || !groupClient.longitude) continue;
          
          const distance = calculateDistance(
            groupClient.latitude,
            groupClient.longitude,
            candidate.latitude,
            candidate.longitude
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        }
      }
      
      // If we found a close client, add it to the group
      if (closestIndex >= 0) {
        const client = remaining.splice(closestIndex, 1)[0];
        group.push(client);
        currentMT += client.mt_requirement || 0;
      } else {
        break; // No more clients fit or are close enough
      }
    }
    
    groups.push(group);
  }
  
  return groups;
}
