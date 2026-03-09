import { useCallback, useState } from "react";
import { Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

type HomeScreenProps = {
  onSignOut: () => void;
  googleMapsApiKey: string;
};

type LiveMarker = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const CAMPUS_CENTER_LATITUDE = 44.9802;
const CAMPUS_CENTER_LONGITUDE = -93.2362;
const CAMPUS_RADIUS_METERS = 2000;
const MAP_MIN_ZOOM = 13;
const MAP_MAX_ZOOM = 17;
const MAP_INITIAL_ZOOM = 14;

function buildMapHtml(googleMapsApiKey: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #050505; }
    </style>
    <script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}"></script>
    <script>
      function initializeMap() {
        const center = { lat: ${CAMPUS_CENTER_LATITUDE}, lng: ${CAMPUS_CENTER_LONGITUDE} };
        const radiusMeters = ${CAMPUS_RADIUS_METERS};
        const geocoder = new google.maps.Geocoder();
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
          restriction: { latLngBounds: allowedBounds, strictBounds: true }
        });

        new google.maps.Marker({
          position: center,
          map: map,
          title: "Dinkytown Center"
        });

        function postMarkerToApp(marker) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "marker_added",
                payload: marker
              })
            );
          }
        }

        function addUserMarker(markerData) {
          new google.maps.Marker({
            position: { lat: markerData.lat, lng: markerData.lng },
            map: map,
            title: markerData.name
          });
          postMarkerToApp(markerData);
        }

        map.addListener("click", function(event) {
          const rawName = window.prompt("Name this marker", "");
          if (rawName === null) return;
          const markerName = (rawName.trim() || "UNTITLED").toUpperCase();
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          geocoder.geocode({ location: { lat: lat, lng: lng } }, function(results, status) {
            let address = "Address unavailable";
            if (status === "OK" && results && results.length > 0) {
              address = results[0].formatted_address;
            }

            addUserMarker({
              id: "marker_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
              name: markerName,
              address: address,
              lat: lat,
              lng: lng
            });
          });
        });

        new google.maps.Rectangle({
          bounds: allowedBounds,
          strokeColor: "#ffffff",
          strokeOpacity: 0.2,
          strokeWeight: 1,
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

export function HomeScreen({ onSignOut, googleMapsApiKey }: HomeScreenProps) {
  const [liveMarkers, setLiveMarkers] = useState<LiveMarker[]>([]);
  const mapHtml = buildMapHtml(googleMapsApiKey);

  const handleOpenMarkerAddress = useCallback(async (marker: LiveMarker) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`;
    await Linking.openURL(mapsUrl);
  }, []);

  const handleMapMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message?.type !== "marker_added" || !message.payload) return;

      const payload = message.payload as LiveMarker;
      if (!payload.id || !payload.name) return;

      setLiveMarkers((prev) => [payload, ...prev]);
    } catch {
      // Ignore malformed bridge messages from the webview.
    }
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>THE LO</Text>
        <TouchableOpacity onPress={onSignOut} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          source={{ html: mapHtml }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMapMessage}
        />
      </View>

      <View style={styles.sheet}>
        <Text style={styles.sectionLabel}>LIVE SIGNALS</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {liveMarkers.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>NO MARKERS YET</Text>
              <Text style={styles.cardMeta}>TAP THE MAP TO ADD A MARKER.</Text>
            </View>
          ) : (
            liveMarkers.map((marker) => (
              <View key={marker.id} style={styles.card}>
                <Text style={styles.cardTitle}>{marker.name.toUpperCase()}</Text>
                <TouchableOpacity
                  onPress={() => {
                    void handleOpenMarkerAddress(marker);
                  }}
                >
                  <Text style={[styles.cardMeta, styles.cardAddressLink]}>{marker.address}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050505",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordmark: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerButton: {
    backgroundColor: "black",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#020202",
  },
  sheet: {
    height: 240,
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMeta: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  cardAddressLink: {
    color: "white",
    textDecorationLine: "underline",
  },
});
