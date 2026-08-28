// Haversine formula to calculate the distance between two GPS coordinates in kilometers
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }
  const R = 6371; // Earth's radius in kilometers
  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Calculate estimated travel time in minutes based on distance and vehicle type
const calculateETA = (distanceKm, vehicleType = 'other') => {
  // Average urban speeds in km/h
  const speedMap = {
    walking: 5,
    bicycle: 15,
    motorcycle: 30,
    car: 25,
    van: 20,
    other: 20
  };

  const speed = speedMap[vehicleType] || 20;
  const travelHours = distanceKm / speed;
  const travelMinutes = travelHours * 60;

  // Add 5 minutes for traffic buffer and handover
  const totalMinutes = Math.max(5, Math.ceil(travelMinutes + 5));
  return totalMinutes;
};

module.exports = {
  haversineDistance,
  calculateETA
};
