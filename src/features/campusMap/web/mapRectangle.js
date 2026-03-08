/**
 * Returns the inline JS that draws the campus boundary rectangle.
 */
export const createRectangleScript = (config) => `
  new google.maps.Rectangle({
    bounds: allowedBounds,
    strokeColor: '${config.borderColor}',
    strokeOpacity: 1,
    strokeWeight: 2,
    fillOpacity: 0,
    clickable: false,
    map: map
  });
`;
