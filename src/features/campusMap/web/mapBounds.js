/**
 * Returns the inline JS that computes center and allowedBounds from config.
 */
export const createBoundsScript = (config) => `
  var center = { lat: ${config.center.lat}, lng: ${config.center.lng} };
  var radiusMeters = ${config.radiusMeters};
  var latDelta = radiusMeters / 111320;
  var lngDelta = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));
  var allowedBounds = {
    north: center.lat + latDelta,
    south: center.lat - latDelta,
    east: center.lng + lngDelta,
    west: center.lng - lngDelta
  };
`;
