import { mapCss } from './mapCss';
import { createMapScript } from './mapScript';

/**
 * @param {object} config - Map config (apiKey, center, zoom, etc.)
 * @param {Array<{lat: number, lng: number, name: string, address: string, notes?: string, size?: string}>} [initialMarkers] - Markers to show on load
 */
export const createMapHtml = (config, initialMarkers = []) => `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>${mapCss}</style>
    <script>window.__INITIAL_MARKERS__ = ${JSON.stringify(initialMarkers)};</script>
    <script src="https://maps.googleapis.com/maps/api/js?key=${config.apiKey}"></script>
    <script>${createMapScript(config)}</script>
  </head>
  <body>
    <div id="map"></div>
  </body>
</html>
`;
