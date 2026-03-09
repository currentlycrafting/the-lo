import { SafeAreaView, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

const CAMPUS_CENTER_LATITUDE = 44.97399;
const CAMPUS_CENTER_LONGITUDE = -93.227728;
const CAMPUS_RADIUS_METERS = 2000;
const MAP_MIN_ZOOM = 13;
const MAP_MAX_ZOOM = 17;
const MAP_INITIAL_ZOOM = 14;
const BOUNDARY_BORDER_COLOR = "#000000";

/**
 * Builds the map HTML shown inside the WebView.
 */
function buildMapHtml(googleMapsApiKey: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        padding: 0;
        background: #000;
      }
    </style>
    <script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}"></script>
    <script>
      function initializeMap() {
        const center = { lat: ${CAMPUS_CENTER_LATITUDE}, lng: ${CAMPUS_CENTER_LONGITUDE} };
        const radiusMeters = ${CAMPUS_RADIUS_METERS};
        const latitudeDelta = radiusMeters / 111320;
        const longitudeDelta = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));

        const allowedBounds = {
          north: center.lat + latitudeDelta,
          south: center.lat - latitudeDelta,
          east: center.lng + longitudeDelta,
          west: center.lng - longitudeDelta
        };

        const map = new google.maps.Map(document.getElementById("map"), {
          center: center,
          zoom: ${MAP_INITIAL_ZOOM},
          minZoom: ${MAP_MIN_ZOOM},
          maxZoom: ${MAP_MAX_ZOOM},
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#121316" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8d939b" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#121316" }] },
            { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2b2f36" }] },
            { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#15171c" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2f36" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1d2128" }] },
            { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b0d11" }] }
          ],
          restriction: {
            latLngBounds: allowedBounds,
            strictBounds: true
          }
        });

        new google.maps.Rectangle({
          bounds: allowedBounds,
          strokeColor: "${BOUNDARY_BORDER_COLOR}",
          strokeOpacity: 1,
          strokeWeight: 2,
          fillOpacity: 0,
          clickable: false,
          map: map
        });
      }

      window.onload = initializeMap;
    </script>
  </head>
  <body>
    <div id="map"></div>
  </body>
</html>
`;
}

/**
 * Runs the full app view from one place.
 */
export function AppRoot() {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const mapHtml = buildMapHtml(googleMapsApiKey);

  return (
    <SafeAreaView style={styles.screenContainer}>
      <WebView
        source={{ html: mapHtml }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        style={styles.mapWebView}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  mapWebView: {
    flex: 1,
  },
});
