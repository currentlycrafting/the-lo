import { darkMapStyles } from './mapStyles.js';
import { createBoundsScript } from './mapBounds.js';
import { createMarkersScript } from './mapMarkers.js';
import { createRectangleScript } from './mapRectangle.js';

/**
 * Composes the full map init script from modular pieces.
 */
export const createMapScript = (config) => {
  const bounds = createBoundsScript(config);
  const markers = createMarkersScript(config);
  const rectangle = createRectangleScript(config);

  return `
function initMap() {
  ${bounds.trim()}

  var map = new google.maps.Map(document.getElementById('map'), {
    center: center,
    zoom: ${config.initialZoom},
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    minZoom: ${config.minZoom},
    maxZoom: ${config.maxZoom},
    restriction: {
      latLngBounds: allowedBounds,
      strictBounds: true
    },
    styles: ${JSON.stringify(darkMapStyles)}
  });

  ${markers.trim()}

  ${rectangle.trim()}
}

window.onload = initMap;
`;
};
