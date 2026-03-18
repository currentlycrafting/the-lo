import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  View,
  Image
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { BlurView } from "expo-blur";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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
  eventCategory: string;
  eventDateTimeIso: string;
  venueName: string;
  description: string;
  mediaUrls: string[];
  eyeCount: number;
  clickCount: number;
  viewerIds: string[];
  heartCount: number;
  isLikedByViewer: boolean;
  notificationsEnabled: boolean;
};

const CAMPUS_CENTER_LATITUDE = 44.9802;
const CAMPUS_CENTER_LONGITUDE = -93.2362;
const CAMPUS_RADIUS_METERS = 1750;
const SEARCH_RADIUS_MILES = 3;
const SEARCH_RADIUS_METERS = SEARCH_RADIUS_MILES * 1609.34;
const MAP_MIN_ZOOM = 13;
const MAP_MAX_ZOOM = 17;
const MAP_INITIAL_ZOOM = 14;
const MARKERS_DB_FILE_PATH = `${FileSystem.documentDirectory ?? ""}the_lo_markers_v1.json`;
const VIEWER_DB_FILE_PATH = `${FileSystem.documentDirectory ?? ""}the_lo_viewer_id_v1.txt`;
const STOCK_DEMO_MARKER_ID = "the_lo_demo_marker_001";

type PlaceSearchCandidate = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  distanceMeters: number;
  score: number;
};

type PlaceSearchBaseCandidate = Omit<PlaceSearchCandidate, "score">;

function getDistanceMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function deriveVenueNameFromAddress(address: string): string {
  const firstSegment = address.split(",")[0]?.trim();
  return firstSegment || "Local Venue";
}

function buildDefaultEventDescription(name: string, venueName: string): string {
  return `${name} is going down at ${venueName}. Tap in, check the vibe, and add your own clip or note.`;
}

function formatEventDateTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function buildMarkerFromLocation(params: {
  name: string;
  address: string;
  lat: number;
  lng: number;
}): LiveMarker {
  const markerName = (params.name.trim() || "UNTITLED").toUpperCase();
  const venueName = deriveVenueNameFromAddress(params.address);
  const eventDateTimeIso = new Date().toISOString();

  return {
    id: `marker_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name: markerName,
    address: params.address,
    lat: params.lat,
    lng: params.lng,
    eventCategory: "EVENT",
    eventDateTimeIso,
    venueName,
    description: buildDefaultEventDescription(markerName, venueName),
    mediaUrls: [],
    eyeCount: 0,
    clickCount: 0,
    viewerIds: [],
    heartCount: 0,
    isLikedByViewer: false,
    notificationsEnabled: true
  };
}

function buildStockDemoMarker(): LiveMarker {
  const marker = buildMarkerFromLocation({
    name: "THE LO FRIDAY NIGHT",
    address: "300 Washington Ave SE, Minneapolis, MN 55455, USA",
    lat: CAMPUS_CENTER_LATITUDE + 0.0009,
    lng: CAMPUS_CENTER_LONGITUDE + 0.0007
  });

  return {
    ...marker,
    id: STOCK_DEMO_MARKER_ID,
    eventCategory: "NIGHTLIFE",
    description: "Live DJ set, packed dance floor, and late-night energy. Tap in and preview the vibe.",
    mediaUrls: [
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80"
    ],
    heartCount: 24,
    eyeCount: 87,
    clickCount: 142
  };
}

function isLikelyImageUrl(value: string): boolean {
  const normalized = value.toLowerCase();

  // Prefer a host-based check for Unsplash URLs instead of a substring check
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === "unsplash.com" || host.endsWith(".unsplash.com")) {
      return true;
    }
  } catch {
    // If value is not a valid URL, fall through to extension-based heuristic
  }

  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((ext) => normalized.includes(ext));
}

function hydrateStoredMarker(raw: any): LiveMarker | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  if (typeof raw.lat !== "number" || typeof raw.lng !== "number") return null;

  const safeAddress = typeof raw.address === "string" ? raw.address : "Address unavailable";
  const safeVenueName =
    typeof raw.venueName === "string" && raw.venueName.trim().length > 0
      ? raw.venueName
      : deriveVenueNameFromAddress(safeAddress);
  const safeDateTime =
    typeof raw.eventDateTimeIso === "string" ? raw.eventDateTimeIso : new Date().toISOString();
  const safeCategory =
    typeof raw.eventCategory === "string" && raw.eventCategory.trim().length > 0
      ? raw.eventCategory
      : "EVENT";

  return {
    id: raw.id,
    name: raw.name,
    address: safeAddress,
    lat: raw.lat,
    lng: raw.lng,
    eventCategory: safeCategory,
    eventDateTimeIso: safeDateTime,
    venueName: safeVenueName,
    description:
      typeof raw.description === "string" && raw.description.trim().length > 0
        ? raw.description
        : buildDefaultEventDescription(raw.name, safeVenueName),
    mediaUrls: Array.isArray(raw.mediaUrls)
      ? raw.mediaUrls.filter((item: unknown): item is string => typeof item === "string")
      : [],
    viewerIds: Array.isArray(raw.viewerIds)
      ? raw.viewerIds.filter((item: unknown): item is string => typeof item === "string")
      : [],
    eyeCount: typeof raw.eyeCount === "number" ? raw.eyeCount : 0,
    clickCount: typeof raw.clickCount === "number" ? raw.clickCount : 0,
    heartCount: typeof raw.heartCount === "number" ? raw.heartCount : 0,
    isLikedByViewer: Boolean(raw.isLikedByViewer),
    notificationsEnabled:
      typeof raw.notificationsEnabled === "boolean" ? raw.notificationsEnabled : true
  };
}

async function readMarkersFromDb(): Promise<LiveMarker[]> {
  if (!FileSystem.documentDirectory) return [];

  try {
    const fileInfo = await FileSystem.getInfoAsync(MARKERS_DB_FILE_PATH);
    if (!fileInfo.exists) return [];

    const raw = await FileSystem.readAsStringAsync(MARKERS_DB_FILE_PATH);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => hydrateStoredMarker(item))
      .filter((item): item is LiveMarker => Boolean(item));
  } catch {
    return [];
  }
}

async function writeMarkersToDb(markers: LiveMarker[]): Promise<void> {
  if (!FileSystem.documentDirectory) return;

  try {
    await FileSystem.writeAsStringAsync(MARKERS_DB_FILE_PATH, JSON.stringify(markers));
  } catch {
    // Ignore persistence write errors to keep UI responsive.
  }
}

async function getOrCreateViewerId(): Promise<string> {
  if (!FileSystem.documentDirectory) {
    return `viewer_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(VIEWER_DB_FILE_PATH);
    if (fileInfo.exists) {
      const existing = (await FileSystem.readAsStringAsync(VIEWER_DB_FILE_PATH)).trim();
      if (existing.length > 0) return existing;
    }

    const nextViewerId = `viewer_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    await FileSystem.writeAsStringAsync(VIEWER_DB_FILE_PATH, nextViewerId);
    return nextViewerId;
  } catch {
    return `viewer_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }
}

function scorePlaceMatch(queryText: string, candidate: PlaceSearchBaseCandidate): number {
  const normalizedQuery = normalizeSearchText(queryText);
  const normalizedName = normalizeSearchText(candidate.name);

  let score = 0;

  if (normalizedName === normalizedQuery) score += 100;
  else if (normalizedName.startsWith(normalizedQuery)) score += 65;
  else if (normalizedName.includes(normalizedQuery)) score += 35;

  const relevantTypes = ["university", "school", "premise", "point_of_interest", "establishment"];
  if (candidate.types.some((type) => relevantTypes.includes(type))) score += 20;

  // Closer matches score higher.
  score += Math.max(0, 40 - candidate.distanceMeters / 100);

  return score;
}

async function searchLocalPlace(
  queryText: string,
  googleMapsApiKey: string
): Promise<PlaceSearchCandidate[]> {
  const endpoint =
    "https://maps.googleapis.com/maps/api/place/textsearch/json?" +
    `query=${encodeURIComponent(queryText)}&` +
    `location=${CAMPUS_CENTER_LATITUDE},${CAMPUS_CENTER_LONGITUDE}&` +
    `radius=${Math.round(SEARCH_RADIUS_METERS)}&` +
    `key=${encodeURIComponent(googleMapsApiKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) return [];

    const data = await response.json().catch(() => null);
    const status = (data as any)?.status;
    if (typeof status === "string" && status !== "OK" && status !== "ZERO_RESULTS") {
      return [];
    }

    const results = Array.isArray((data as any)?.results) ? (data as any).results : [];

    const localCandidates = results
      .map((result: any) => {
        const lat = result?.geometry?.location?.lat;
        const lng = result?.geometry?.location?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return null;

        const distanceMeters = getDistanceMeters(
          CAMPUS_CENTER_LATITUDE,
          CAMPUS_CENTER_LONGITUDE,
          lat,
          lng
        );

        return {
          name: result?.name || "UNTITLED",
          address: result?.formatted_address || "Address unavailable",
          lat,
          lng,
          types: Array.isArray(result?.types) ? result.types : [],
          distanceMeters
        };
      })
      .filter((candidate: any) => candidate && candidate.distanceMeters <= SEARCH_RADIUS_METERS)
      .map((candidate: PlaceSearchBaseCandidate) => ({
        ...candidate,
        score: scorePlaceMatch(queryText, candidate)
      }))
      .sort((a: PlaceSearchCandidate, b: PlaceSearchCandidate) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.distanceMeters - b.distanceMeters;
      });

    return localCandidates;
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

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
          zoomControl: false,
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

        function postToApp(type, payload) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: type,
                payload: payload
              })
            );
          }
        }

        function postMarkerToApp(marker) {
          postToApp("marker_added", marker);
        }

        const markerRegistry = {};
        let selectedMarkerId = null;

        function buildMarkerIcon(isSelected, markerData) {
          function getMarkerColor(markerData, selected) {
            if (selected) return "yellow";
            if ((markerData?.clickCount || 0) > 0) return "yellow";
            return "orange";
          }

          const markerColor = getMarkerColor(markerData, isSelected);
          const iconUrl = "https://maps.google.com/mapfiles/ms/icons/" + markerColor + "-dot.png";
          return {
            url: iconUrl,
            scaledSize: new google.maps.Size(isSelected ? 55 : 50, isSelected ? 55 : 50)
          };
        }

        function setMarkerSelectedVisual(markerId) {
          selectedMarkerId = markerId || null;
          Object.keys(markerRegistry).forEach(function(id) {
            const markerEntry = markerRegistry[id];
            if (!markerEntry || !markerEntry.marker) return;
            const isSelected = Boolean(markerId && id === markerId);
            markerEntry.marker.setIcon(buildMarkerIcon(isSelected, markerEntry.data));
            markerEntry.marker.setZIndex(isSelected ? 999 : 1);
          });
        }

        function addUserMarker(markerData, shouldPost) {
          if (!markerData || !markerData.id) return;
          const existing = markerRegistry[markerData.id];
          if (existing && existing.marker) {
            existing.marker.setMap(null);
          }

          const marker = new google.maps.Marker({
            position: { lat: markerData.lat, lng: markerData.lng },
            map: map,
            title: markerData.name,
            icon: buildMarkerIcon(false, markerData)
          });
          markerRegistry[markerData.id] = { marker: marker, data: markerData };
          marker.addListener("click", function() {
            markerRegistry[markerData.id].data = {
              ...markerRegistry[markerData.id].data,
              clickCount: (markerRegistry[markerData.id].data?.clickCount || 0) + 1
            };
            setMarkerSelectedVisual(markerData.id);
            postToApp("marker_selected", { markerId: markerData.id });
          });
          if (shouldPost !== false) {
            postMarkerToApp(markerData);
          }
        }

        window.addMarkerFromNative = function(markerData) {
          addUserMarker(markerData, false);
        };
        window.setSelectedMarkerFromNative = function(markerId) {
          setMarkerSelectedVisual(markerId);
        };
        window.updateMarkerFromNative = function(markerData) {
          if (!markerData || !markerData.id) return;
          const markerEntry = markerRegistry[markerData.id];
          if (!markerEntry || !markerEntry.marker) return;
          markerEntry.data = markerData;
          const isSelected = Boolean(selectedMarkerId && selectedMarkerId === markerData.id);
          markerEntry.marker.setIcon(buildMarkerIcon(isSelected, markerData));
        };
        window.removeMarkerFromNative = function(markerId) {
          if (!markerId) return;
          const markerEntry = markerRegistry[markerId];
          if (!markerEntry || !markerEntry.marker) return;
          markerEntry.marker.setMap(null);
          delete markerRegistry[markerId];
          if (selectedMarkerId === markerId) {
            selectedMarkerId = null;
          }
        };

        function clearAllUserMarkers() {
          Object.keys(markerRegistry).forEach(function(id) {
            const markerEntry = markerRegistry[id];
            if (markerEntry && markerEntry.marker) {
              markerEntry.marker.setMap(null);
            }
            delete markerRegistry[id];
          });
          selectedMarkerId = null;
        }

        function handleNativeMessage(event) {
          try {
            const rawData = event && event.data;
            const message =
              typeof rawData === "string"
                ? JSON.parse(rawData)
                : rawData && typeof rawData === "object"
                  ? rawData
                  : null;
            if (!message || !message.type) return;

            if (message.type === "add_marker") {
              if (message.payload) {
                addUserMarker(message.payload, false);
              }
              return;
            }

            if (message.type === "sync_markers") {
              const markers = message.payload && message.payload.markers;
              if (!Array.isArray(markers)) return;
              clearAllUserMarkers();
              for (let i = 0; i < markers.length; i += 1) {
                addUserMarker(markers[i], false);
              }
              return;
            }

            if (message.type === "update_marker") {
              if (message.payload) {
                window.updateMarkerFromNative(message.payload);
              }
              return;
            }

            if (message.type === "remove_marker") {
              const markerId = message.payload && message.payload.markerId;
              window.removeMarkerFromNative(markerId);
              return;
            }

            if (message.type === "set_selected_marker") {
              const markerId = message.payload && message.payload.markerId;
              setMarkerSelectedVisual(markerId);
              return;
            }

            if (message.type === "map_control") {
              const action = message.payload && message.payload.action;
              if (window.mapControl && typeof window.mapControl[action] === "function") {
                window.mapControl[action]();
              }
              return;
            }
          } catch {
            // Ignore malformed messages.
          }
        }

        // Android uses document; iOS uses window.
        document.addEventListener("message", handleNativeMessage);
        window.addEventListener("message", handleNativeMessage);

        map.addListener("click", function(event) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          geocoder.geocode({ location: { lat: lat, lng: lng } }, function(results, status) {
            let address = "Address unavailable";
            if (status === "OK" && results && results.length > 0) {
              address = results[0].formatted_address;
            }

            postToApp("map_tapped_candidate", {
              lat: lat,
              lng: lng,
              address: address
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

        window.mapControl = {
          zoomIn: function() {
            map.setZoom(Math.min(map.getZoom() + 1, ${MAP_MAX_ZOOM}));
          },
          zoomOut: function() {
            map.setZoom(Math.max(map.getZoom() - 1, ${MAP_MIN_ZOOM}));
          },
          panUp: function() {
            map.panBy(0, -120);
          },
          panDown: function() {
            map.panBy(0, 120);
          },
          panLeft: function() {
            map.panBy(-120, 0);
          },
          panRight: function() {
            map.panBy(120, 0);
          },
          recenter: function() {
            map.panTo(center);
          }
        };
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

type EventDetailSheetProps = {
  marker: LiveMarker;
  eventDescriptionDraft: string;
  onChangeEventDescriptionDraft: (next: string) => void;
  onClose: () => void;
  onOpenMarkerAddress: (marker: LiveMarker) => void;
  onSaveDescription: () => void;
  onToggleLike: () => void;
  onToggleNotifications: () => void;
  onUploadVideo: () => void;
  onDelete: () => void;
};

const EventDetailSheet = memo(function EventDetailSheet({
  marker,
  eventDescriptionDraft,
  onChangeEventDescriptionDraft,
  onClose,
  onOpenMarkerAddress,
  onSaveDescription,
  onToggleLike,
  onToggleNotifications,
  onUploadVideo,
  onDelete
}: EventDetailSheetProps) {
  return (
    <View style={styles.eventDetailSheet}>
      <View style={styles.eventDetailHandle} />
      <ScrollView
        style={styles.eventDetailScroll}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mapSignalPreviewHeader}>
          <Text accessibilityRole="header" style={styles.mapSignalPreviewLabel}>
            EVENT DETAILS
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close event details"
            hitSlop={12}
            onPress={onClose}
            style={styles.mapSignalPreviewCloseButton}
          >
            <Text style={styles.mapSignalPreviewCloseText}>×</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.mapSignalPreviewName}>{marker.name}</Text>
        <View style={styles.eventMetaRow}>
          <Ionicons name="time-outline" size={14} color="#ffffff" />
          <Text style={styles.eventDetailMeta}>{formatEventDateTime(marker.eventDateTimeIso)}</Text>
        </View>
        <Text style={styles.eventDetailCategory}>{marker.eventCategory}</Text>
        <View style={styles.eventMetaRow}>
          <Ionicons name="location-outline" size={14} color="#ffffff" />
          <Text style={styles.eventDetailVenue}>{marker.venueName}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open address in maps"
          onPress={() => {
            onOpenMarkerAddress(marker);
          }}
          style={styles.eventDirectionsRow}
        >
          <Ionicons name="map-outline" size={14} color="#ffffff" />
          <Text style={styles.mapSignalPreviewAddress} numberOfLines={2}>
            {marker.address}
          </Text>
        </TouchableOpacity>

        <Text style={styles.eventDetailLabel}>WHAT'S HAPPENING</Text>
        <TextInput
          accessibilityLabel="Event description"
          value={eventDescriptionDraft}
          onChangeText={onChangeEventDescriptionDraft}
          style={styles.eventDescriptionInput}
          placeholder="Describe the vibe..."
          placeholderTextColor="#6b7280"
          multiline
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Save description"
          style={styles.eventActionButton}
          onPress={onSaveDescription}
        >
          <Text style={styles.eventActionButtonText}>SAVE DESCRIPTION</Text>
        </TouchableOpacity>

        <View style={styles.eventCountersRow}>
          <View style={styles.eventCounterPill}>
            <Ionicons name="eye-outline" size={14} color="#ffffff" />
            <Text style={styles.eventCounterText}>{marker.eyeCount}</Text>
          </View>
          <View style={styles.eventCounterPill}>
            <MaterialCommunityIcons name="cursor-default-click-outline" size={14} color="#ffffff" />
            <Text style={styles.eventCounterText}>{marker.clickCount}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={marker.isLikedByViewer ? "Unlike event" : "Like event"}
            style={styles.eventCounterPill}
            onPress={onToggleLike}
          >
            <Ionicons name={marker.isLikedByViewer ? "heart" : "heart-outline"} size={14} color="#ffffff" />
            <Text style={styles.eventCounterText}>{marker.heartCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              marker.notificationsEnabled
                ? "Disable notifications for this event"
                : "Enable notifications for this event"
            }
            style={styles.eventCounterPill}
            onPress={onToggleNotifications}
          >
            <Ionicons
              name={marker.notificationsEnabled ? "notifications-outline" : "notifications-off-outline"}
              size={14}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.eventMediaSection}>
          <View style={styles.eventMediaHeader}>
            <View style={styles.eventMediaTitleWrap}>
              <Ionicons name="film-outline" size={14} color="#ffffff" />
              <Text style={styles.eventMediaTitle}>VIDEOS</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add video"
              style={styles.eventUploadButton}
              onPress={onUploadVideo}
            >
              <View style={styles.eventUploadContent}>
                <Ionicons name="camera-outline" size={13} color="#ffffff" />
                <Text style={styles.eventUploadButtonText}>ADD VIDEO</Text>
              </View>
            </TouchableOpacity>
          </View>
          {marker.mediaUrls.length === 0 ? (
            <Text style={styles.eventMediaEmpty}>No clips yet. Add one from your camera roll.</Text>
          ) : (
            marker.mediaUrls.map((mediaUrl, index) => (
              <TouchableOpacity
                key={`${mediaUrl}_${index}`}
                accessibilityRole="button"
                accessibilityLabel="Open media"
                style={styles.eventMediaItem}
                onPress={() => {
                  void Linking.openURL(mediaUrl);
                }}
              >
                {isLikelyImageUrl(mediaUrl) ? (
                  <Image source={{ uri: mediaUrl }} style={styles.eventMediaPreviewImage} />
                ) : (
                  <Ionicons name="image-outline" size={13} color="#ffffff" />
                )}
                <Text style={styles.eventMediaItemText} numberOfLines={1}>
                  {isLikelyImageUrl(mediaUrl) ? "VIEW EVENT IMAGE" : mediaUrl}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Delete event"
          style={styles.eventDeleteButton}
          onPress={onDelete}
        >
          <Feather name="trash-2" size={14} color="#ffffff" />
          <Text style={styles.eventDeleteButtonText}>DELETE EVENT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
});

type LiveSignalsSheetProps = {
  markers: LiveMarker[];
  onOpenEventDetails: (markerId: string) => void;
  onOpenMarkerAddress: (marker: LiveMarker) => void;
};

const LiveSignalsSheet = memo(function LiveSignalsSheet({
  markers,
  onOpenEventDetails,
  onOpenMarkerAddress
}: LiveSignalsSheetProps) {
  return (
    <View style={styles.sheet}>
      <Text accessibilityRole="header" style={styles.sectionLabel}>
        LIVE SIGNALS
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag">
        {markers.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>NO MARKERS YET</Text>
            <Text style={styles.cardMeta}>TAP THE MAP TO ADD A MARKER.</Text>
          </View>
        ) : (
          markers.map((marker) => (
            <View key={marker.id} style={styles.card}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="View event details"
                onPress={() => {
                  onOpenEventDetails(marker.id);
                }}
              >
                <Text style={styles.cardTitle}>{marker.name.toUpperCase()}</Text>
                <Text style={styles.cardMetaAction}>VIEW EVENT DETAILS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open address in maps"
                onPress={() => {
                  onOpenMarkerAddress(marker);
                }}
              >
                <Text style={[styles.cardMeta, styles.cardAddressLink]}>{marker.address}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
});

type MapOverlayControlsProps = {
  isMapControlsExpanded: boolean;
  isMapFullScreen: boolean;
  onOpenAddMarker: () => void;
  onToggleControlsExpanded: () => void;
  onMapControl: (action: string) => void;
  onExitFullMap: () => void;
};

const MapOverlayControls = memo(function MapOverlayControls({
  isMapControlsExpanded,
  isMapFullScreen,
  onOpenAddMarker,
  onToggleControlsExpanded,
  onMapControl,
  onExitFullMap
}: MapOverlayControlsProps) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a marker"
        hitSlop={10}
        style={({ pressed }) => [styles.leftMarkerButton, pressed && styles.controlButtonPressed]}
        onPress={onOpenAddMarker}
      >
        <Text style={styles.leftMarkerButtonText}>+</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isMapControlsExpanded ? "Hide map controls" : "Show map controls"}
        hitSlop={10}
        style={({ pressed }) => [styles.leftControlsToggleButton, pressed && styles.controlButtonPressed]}
        onPress={onToggleControlsExpanded}
      >
        <Text style={styles.leftControlsToggleButtonText}>
          {isMapControlsExpanded ? "×" : "◎"}
        </Text>
      </Pressable>

      {isMapControlsExpanded ? (
        <View style={styles.leftControlsPanel}>
          <View style={styles.leftControlsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              hitSlop={10}
              style={({ pressed }) => [styles.leftControlButton, pressed && styles.controlButtonPressed]}
              onPress={() => onMapControl("zoomIn")}
            >
              <Text style={styles.leftControlButtonText}>+</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              hitSlop={10}
              style={({ pressed }) => [styles.leftControlButton, pressed && styles.controlButtonPressed]}
              onPress={() => onMapControl("zoomOut")}
            >
              <Text style={styles.leftControlButtonText}>-</Text>
            </Pressable>
          </View>
          <View style={styles.leftControlsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pan up"
              hitSlop={10}
              style={({ pressed }) => [styles.leftControlButton, pressed && styles.controlButtonPressed]}
              onPress={() => onMapControl("panUp")}
            >
              <Text style={styles.leftControlButtonText}>↑</Text>
            </Pressable>
          </View>
          <View style={styles.leftControlsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pan left"
              hitSlop={10}
              style={({ pressed }) => [styles.leftControlButton, pressed && styles.controlButtonPressed]}
              onPress={() => onMapControl("panLeft")}
            >
              <Text style={styles.leftControlButtonText}>←</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Recenter map"
              hitSlop={10}
              style={({ pressed }) => [styles.leftControlButton, pressed && styles.controlButtonPressed]}
              onPress={() => onMapControl("recenter")}
            >
              <Text style={styles.leftControlButtonText}>◎</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pan right"
              hitSlop={10}
              style={({ pressed }) => [styles.leftControlButton, pressed && styles.controlButtonPressed]}
              onPress={() => onMapControl("panRight")}
            >
              <Text style={styles.leftControlButtonText}>→</Text>
            </Pressable>
          </View>
          <View style={styles.leftControlsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pan down"
              hitSlop={10}
              style={({ pressed }) => [styles.leftControlButton, pressed && styles.controlButtonPressed]}
              onPress={() => onMapControl("panDown")}
            >
              <Text style={styles.leftControlButtonText}>↓</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {isMapFullScreen ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Exit full map"
          style={styles.fullScreenExitButton}
          onPress={onExitFullMap}
        >
          <Text style={styles.fullScreenExitButtonText}>EXIT FULL MAP</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
});

export function HomeScreen({ onSignOut, googleMapsApiKey }: HomeScreenProps) {
  const [liveMarkers, setLiveMarkers] = useState<LiveMarker[]>([]);
  const [viewerId, setViewerId] = useState("");
  const [selectedMapSignal, setSelectedMapSignal] = useState<LiveMarker | null>(null);
  const [eventDescriptionDraft, setEventDescriptionDraft] = useState("");
  const [isMapWebViewReady, setIsMapWebViewReady] = useState(false);
  const [newMarkerName, setNewMarkerName] = useState("");
  const [newMarkerAddress, setNewMarkerAddress] = useState("");
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [isManualMarkerModalVisible, setIsManualMarkerModalVisible] = useState(false);
  const [isMapControlsExpanded, setIsMapControlsExpanded] = useState(false);
  const [localSearchMessage, setLocalSearchMessage] = useState("");
  const [tapMarkerNameInput, setTapMarkerNameInput] = useState("");
  const [pendingMapTapMarker, setPendingMapTapMarker] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const mapWebViewRef = useRef<WebView>(null);
  const mapHtml = useMemo(() => buildMapHtml(googleMapsApiKey), [googleMapsApiKey]);

  const handleOpenMarkerAddress = useCallback(async (marker: LiveMarker) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`;
    await Linking.openURL(mapsUrl);
  }, []);

  const handleMapControl = useCallback((action: string) => {
    const safeAction = action.replace(/[^a-zA-Z]/g, "");
    mapWebViewRef.current?.postMessage(
      JSON.stringify({
        type: "map_control",
        payload: { action: safeAction }
      })
    );
  }, []);

  const persistMarkers = useCallback(async (markers: LiveMarker[]) => {
    await writeMarkersToDb(markers);
  }, []);

  const syncMarkersToMap = useCallback((markers: LiveMarker[]) => {
    mapWebViewRef.current?.postMessage(
      JSON.stringify({
        type: "sync_markers",
        payload: { markers }
      })
    );
  }, []);

  const syncMarkerUpdateToMap = useCallback((marker: LiveMarker) => {
    mapWebViewRef.current?.postMessage(
      JSON.stringify({
        type: "update_marker",
        payload: marker
      })
    );
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadViewerId = async () => {
      const nextViewerId = await getOrCreateViewerId();
      if (!isMounted) return;
      setViewerId(nextViewerId);
    };
    void loadViewerId();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadStoredMarkers = async () => {
      const hydrated = await readMarkersFromDb();
      if (!isMounted) return;
      const stockMarker = buildStockDemoMarker();
      const existingStockMarker = hydrated.find((marker) => marker.id === STOCK_DEMO_MARKER_ID);
      const nextMarkers = existingStockMarker ? hydrated : [stockMarker, ...hydrated];

      setLiveMarkers(nextMarkers);
      setSelectedMapSignal(existingStockMarker ?? stockMarker);

      if (!existingStockMarker) {
        void writeMarkersToDb(nextMarkers);
      }

      if (isMapWebViewReady) {
        syncMarkersToMap(nextMarkers);
      }
    };

    void loadStoredMarkers();

    return () => {
      isMounted = false;
    };
  }, [isMapWebViewReady, syncMarkersToMap]);

  useEffect(() => {
    if (!isMapWebViewReady) return;
    syncMarkersToMap(liveMarkers);
  }, [isMapWebViewReady, liveMarkers, syncMarkersToMap]);

  useEffect(() => {
    setEventDescriptionDraft(selectedMapSignal?.description ?? "");
  }, [selectedMapSignal]);

  useEffect(() => {
    const selectedId = selectedMapSignal?.id ?? "";
    mapWebViewRef.current?.postMessage(
      JSON.stringify({
        type: "set_selected_marker",
        payload: { markerId: selectedId || null }
      })
    );
  }, [selectedMapSignal?.id]);

  const handleMapMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message?.type === "marker_added" && message.payload) {
        const payload = message.payload as LiveMarker;
        if (!payload.id || !payload.name) return;
        setLiveMarkers((prev) => [payload, ...prev]);
        return;
      }

      if (message?.type === "map_tapped_candidate" && message.payload) {
        const payload = message.payload as { lat: number; lng: number; address: string };
        if (typeof payload.lat !== "number" || typeof payload.lng !== "number") return;
        setSelectedMapSignal(null);
        setPendingMapTapMarker({
          lat: payload.lat,
          lng: payload.lng,
          address: payload.address || "Address unavailable"
        });
        setTapMarkerNameInput("");
        return;
      }

      if (message?.type === "marker_selected" && message.payload) {
        const payload = message.payload as { markerId?: string };
        if (!payload.markerId) return;
        setLiveMarkers((prev) => {
          const markerIndex = prev.findIndex((marker) => marker.id === payload.markerId);
          if (markerIndex < 0) return prev;

          const next = [...prev];
          const current = next[markerIndex];
          const alreadyViewedByCurrentViewer =
            viewerId.length > 0 && current.viewerIds.includes(viewerId);
          const nextViewerIds =
            viewerId.length > 0 && !alreadyViewedByCurrentViewer
              ? [...current.viewerIds, viewerId]
              : current.viewerIds;
          const updatedMarker: LiveMarker = {
            ...current,
            clickCount: current.clickCount + 1,
            eyeCount: nextViewerIds.length,
            viewerIds: nextViewerIds
          };
          next[markerIndex] = updatedMarker;
          setSelectedMapSignal(updatedMarker);
          syncMarkerUpdateToMap(updatedMarker);
          void persistMarkers(next);
          return next;
        });
      }
    } catch {
      // Ignore malformed bridge messages from the webview.
    }
  }, [persistMarkers, syncMarkerUpdateToMap, viewerId]);

  const addMarkerToListAndMap = useCallback((marker: LiveMarker) => {
    setLiveMarkers((prev) => {
      const next = [marker, ...prev];
      void persistMarkers(next);
      return next;
    });
    mapWebViewRef.current?.postMessage(
      JSON.stringify({
        type: "add_marker",
        payload: marker
      })
    );
  }, [persistMarkers]);

  const updateMarkerById = useCallback((markerId: string, updater: (marker: LiveMarker) => LiveMarker) => {
    setLiveMarkers((prev) => {
      const markerIndex = prev.findIndex((marker) => marker.id === markerId);
      if (markerIndex < 0) return prev;

      const next = [...prev];
      const updatedMarker = updater(next[markerIndex]);
      next[markerIndex] = updatedMarker;
      if (selectedMapSignal?.id === markerId) {
        setSelectedMapSignal(updatedMarker);
      }
      syncMarkerUpdateToMap(updatedMarker);
      void persistMarkers(next);
      return next;
    });
  }, [persistMarkers, selectedMapSignal?.id, syncMarkerUpdateToMap]);

  const handleSaveEventDescription = useCallback(() => {
    if (!selectedMapSignal) return;
    const nextDescription = eventDescriptionDraft.trim();
    if (!nextDescription) return;

    updateMarkerById(selectedMapSignal.id, (marker) => ({
      ...marker,
      description: nextDescription
    }));
  }, [eventDescriptionDraft, selectedMapSignal, updateMarkerById]);

  const handleUploadVideoToSelectedMarker = useCallback(async () => {
    if (!selectedMapSignal) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Media Access Needed", "Allow photo/video access to attach event videos.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      quality: 0.8
    });

    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    const nextUri = picked.assets[0].uri;

    updateMarkerById(selectedMapSignal.id, (marker) => ({
      ...marker,
      mediaUrls: [nextUri, ...marker.mediaUrls]
    }));
  }, [selectedMapSignal, updateMarkerById]);

  const handleToggleLikeSelectedEvent = useCallback(() => {
    if (!selectedMapSignal) return;
    updateMarkerById(selectedMapSignal.id, (marker) => {
      const nextLiked = !marker.isLikedByViewer;
      return {
        ...marker,
        isLikedByViewer: nextLiked,
        heartCount: nextLiked ? marker.heartCount + 1 : Math.max(0, marker.heartCount - 1)
      };
    });
  }, [selectedMapSignal, updateMarkerById]);

  const handleToggleNotificationSelectedEvent = useCallback(() => {
    if (!selectedMapSignal) return;
    updateMarkerById(selectedMapSignal.id, (marker) => ({
      ...marker,
      notificationsEnabled: !marker.notificationsEnabled
    }));
  }, [selectedMapSignal, updateMarkerById]);

  const handleDeleteSelectedEvent = useCallback(() => {
    if (!selectedMapSignal) return;
    const markerId = selectedMapSignal.id;

    Alert.alert("Delete event?", "This can’t be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setLiveMarkers((prev) => {
            const next = prev.filter((marker) => marker.id !== markerId);
            void persistMarkers(next);
            return next;
          });
          setSelectedMapSignal(null);
          mapWebViewRef.current?.postMessage(
            JSON.stringify({
              type: "remove_marker",
              payload: { markerId }
            })
          );
        }
      }
    ]);
  }, [persistMarkers, selectedMapSignal]);

  const handleOpenEventDetailsFromLiveSignal = useCallback((markerId: string) => {
    setLiveMarkers((prev) => {
      const markerIndex = prev.findIndex((marker) => marker.id === markerId);
      if (markerIndex < 0) return prev;

      const next = [...prev];
      const current = next[markerIndex];
      const alreadyViewedByCurrentViewer =
        viewerId.length > 0 && current.viewerIds.includes(viewerId);
      const nextViewerIds =
        viewerId.length > 0 && !alreadyViewedByCurrentViewer
          ? [...current.viewerIds, viewerId]
          : current.viewerIds;

      const updatedMarker: LiveMarker = {
        ...current,
        clickCount: current.clickCount + 1,
        eyeCount: nextViewerIds.length,
        viewerIds: nextViewerIds
      };

      next[markerIndex] = updatedMarker;
      setSelectedMapSignal(updatedMarker);
      syncMarkerUpdateToMap(updatedMarker);
      void persistMarkers(next);
      return next;
    });
  }, [persistMarkers, syncMarkerUpdateToMap, viewerId]);

  const handleAddMarkerFromAddress = useCallback(async () => {
    const markerName = (newMarkerName.trim() || "UNTITLED").toUpperCase();
    const queryText = newMarkerAddress.trim();
    if (!queryText || !googleMapsApiKey) return;

    setIsAddingMarker(true);
    try {
      const candidates = await searchLocalPlace(queryText, googleMapsApiKey);

      if (candidates.length === 0) {
        setLocalSearchMessage(
          `NO MATCH FOUND. IF THIS SEEMS WRONG, YOUR PLACES API MAY BE BLOCKED BY KEY RESTRICTIONS.`
        );
        return;
      }

      const best = candidates[0];
      setLocalSearchMessage("LOCAL MATCH FOUND. MARKER ADDED.");

      const marker = buildMarkerFromLocation({
        name: markerName,
        address: best.address,
        lat: best.lat,
        lng: best.lng
      });
      addMarkerToListAndMap(marker);

      setNewMarkerName("");
      setNewMarkerAddress("");
      setIsManualMarkerModalVisible(false);
      Alert.alert("Marker Added", `${marker.name} added near Dinkytown.`);
    } finally {
      setIsAddingMarker(false);
    }
  }, [addMarkerToListAndMap, googleMapsApiKey, newMarkerAddress, newMarkerName]);

  const handleCancelTapMarkerModal = useCallback(() => {
    setPendingMapTapMarker(null);
    setTapMarkerNameInput("");
  }, []);

  const handleConfirmTapMarkerModal = useCallback(() => {
    if (!pendingMapTapMarker) return;

    const marker = buildMarkerFromLocation({
      name: tapMarkerNameInput.trim() || "UNTITLED",
      address: pendingMapTapMarker.address,
      lat: pendingMapTapMarker.lat,
      lng: pendingMapTapMarker.lng
    });

    addMarkerToListAndMap(marker);
    handleCancelTapMarkerModal();
  }, [addMarkerToListAndMap, handleCancelTapMarkerModal, pendingMapTapMarker, tapMarkerNameInput]);

  const handleCloseEventDetails = useCallback(() => {
    setSelectedMapSignal(null);
  }, []);

  const handleOpenAddMarkerModal = useCallback(() => {
    setLocalSearchMessage("");
    setSelectedMapSignal(null);
    setIsManualMarkerModalVisible(true);
  }, []);

  const handleToggleMapControlsExpanded = useCallback(() => {
    setIsMapControlsExpanded((prev) => !prev);
  }, []);

  const handleExitFullMap = useCallback(() => {
    setIsMapFullScreen(false);
  }, []);

  const handleUploadVideoFromSheet = useCallback(() => {
    void handleUploadVideoToSelectedMarker();
  }, [handleUploadVideoToSelectedMarker]);

  return (
    <SafeAreaView style={styles.screen}>
      {!isMapFullScreen ? (
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.wordmark}>
            THE LO
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open full map"
              onPress={() => setIsMapFullScreen(true)}
              style={styles.headerButton}
            >
              <View style={styles.headerButtonContent}>
                <Ionicons name="map-outline" size={14} color="#ffffff" />
                <Text style={styles.headerButtonText}>FULL MAP</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={onSignOut}
              style={styles.headerButton}
            >
              <View style={styles.headerButtonContent}>
                <Ionicons name="log-out-outline" size={14} color="#ffffff" />
                <Text style={styles.headerButtonText}>SIGN OUT</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={[styles.mapContainer, isMapFullScreen && styles.mapContainerFullScreen]}>
        <WebView
          ref={mapWebViewRef}
          source={{ html: mapHtml }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMapMessage}
          onLoadEnd={() => {
            setIsMapWebViewReady(true);
            if (liveMarkers.length > 0) {
              syncMarkersToMap(liveMarkers);
            }
          }}
        />
        {!isMapWebViewReady ? (
          <View style={styles.mapLoadingOverlay} pointerEvents="none">
            <ActivityIndicator color="#ffffff" />
          </View>
        ) : null}
        {selectedMapSignal ? (
          <BlurView intensity={26} tint="dark" style={styles.eventDetailBackdrop} />
        ) : null}
        <MapOverlayControls
          isMapControlsExpanded={isMapControlsExpanded}
          isMapFullScreen={isMapFullScreen}
          onOpenAddMarker={handleOpenAddMarkerModal}
          onToggleControlsExpanded={handleToggleMapControlsExpanded}
          onMapControl={handleMapControl}
          onExitFullMap={handleExitFullMap}
        />
        {selectedMapSignal ? (
          <EventDetailSheet
            marker={selectedMapSignal}
            eventDescriptionDraft={eventDescriptionDraft}
            onChangeEventDescriptionDraft={setEventDescriptionDraft}
            onClose={handleCloseEventDetails}
            onOpenMarkerAddress={handleOpenMarkerAddress}
            onSaveDescription={handleSaveEventDescription}
            onToggleLike={handleToggleLikeSelectedEvent}
            onToggleNotifications={handleToggleNotificationSelectedEvent}
            onUploadVideo={handleUploadVideoFromSheet}
            onDelete={handleDeleteSelectedEvent}
          />
        ) : null}
      </View>

      {!isMapFullScreen && !selectedMapSignal ? (
        <LiveSignalsSheet
          markers={liveMarkers}
          onOpenEventDetails={handleOpenEventDetailsFromLiveSignal}
          onOpenMarkerAddress={handleOpenMarkerAddress}
        />
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(pendingMapTapMarker)}
        onRequestClose={handleCancelTapMarkerModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>NAME THIS MARKER</Text>
            <Text style={styles.modalAddress} numberOfLines={2}>
              {pendingMapTapMarker?.address}
            </Text>
            <TextInput
              accessibilityLabel="Marker name"
              value={tapMarkerNameInput}
              onChangeText={setTapMarkerNameInput}
              style={styles.modalInput}
              placeholder="ENTER MARKER NAME"
              placeholderTextColor="#6b7280"
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel marker"
                style={styles.modalCancelButton}
                onPress={handleCancelTapMarkerModal}
              >
                <Text style={styles.modalCancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Add marker"
                style={styles.modalConfirmButton}
                onPress={handleConfirmTapMarkerModal}
              >
                <Text style={styles.modalConfirmButtonText}>ADD MARKER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={isManualMarkerModalVisible}
        onRequestClose={() => setIsManualMarkerModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ADD MARKER BY ADDRESS</Text>
            <TextInput
              accessibilityLabel="Marker name"
              value={newMarkerName}
              onChangeText={setNewMarkerName}
              style={styles.modalInput}
              placeholder="MARKER NAME"
              placeholderTextColor="#6b7280"
              autoCapitalize="characters"
            />
            <TextInput
              accessibilityLabel="Place or address"
              value={newMarkerAddress}
              onChangeText={setNewMarkerAddress}
              style={styles.modalInput}
              placeholder="PLACE OR ADDRESS (E.G. TATE HALL)"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Search local area and add marker"
              style={[
                styles.addMarkerButton,
                (!newMarkerAddress.trim() || isAddingMarker) && styles.addMarkerButtonDisabled
              ]}
              disabled={!newMarkerAddress.trim() || isAddingMarker}
              onPress={() => {
                void handleAddMarkerFromAddress();
              }}
            >
              {isAddingMarker ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.addMarkerButtonText}>SEARCH LOCAL & ADD</Text>
              )}
            </TouchableOpacity>
            {localSearchMessage ? (
              <Text style={styles.localSearchMessage}>{localSearchMessage}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close add marker modal"
                style={styles.modalCancelButton}
                onPress={() => setIsManualMarkerModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  headerActions: {
    flexDirection: "row",
    gap: 8
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
  headerButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
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
  leftMarkerButton: {
    position: "absolute",
    right: 12,
    top: "45%",
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4
  },
  leftMarkerButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18
  },
  leftControlsToggleButton: {
    position: "absolute",
    left: 12,
    top: "45%",
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center"
  },
  leftControlsToggleButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16
  },
  leftControlsPanel: {
    position: "absolute",
    left: 12,
    top: "45%",
    marginTop: -186,
    gap: 6
  },
  leftControlsRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center"
  },
  leftControlButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center"
  },
  leftControlButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16
  },
  controlButtonPressed: {
    backgroundColor: "#2c2c2e"
  },
  mapContainerFullScreen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0
  },
  fullScreenExitButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  fullScreenExitButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2
  },
  eventDetailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,5,0.28)"
  },
  eventDetailSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    top: "6%",
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  eventDetailScroll: {
    flex: 1
  },
  eventDetailHandle: {
    alignSelf: "center",
    width: 92,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 8
  },
  mapSignalPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  mapSignalPreviewLabel: {
    color: "#9ca3af",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2
  },
  mapSignalPreviewCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1c1c1e"
  },
  mapSignalPreviewCloseText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center"
  },
  mapSignalPreviewName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2
  },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  eventDetailMeta: {
    color: "#e5e7eb",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2
  },
  eventDetailCategory: {
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 4
  },
  eventDetailVenue: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2
  },
  mapSignalPreviewAddress: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "500",
    textDecorationLine: "underline"
  },
  eventDirectionsRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  eventDetailLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginTop: 8
  },
  eventDescriptionInput: {
    marginTop: 6,
    minHeight: 68,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1c1c1e",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: "top"
  },
  eventActionButton: {
    marginTop: 8,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center"
  },
  eventActionButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1
  },
  eventCountersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10
  },
  eventCounterPill: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1c1c1e",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  eventCounterText: {
    color: "#f3f4f6",
    fontSize: 11,
    fontWeight: "700"
  },
  eventMediaSection: {
    marginTop: 10
  },
  eventMediaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  eventMediaTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  eventMediaTitle: {
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  eventUploadButton: {
    height: 28,
    borderRadius: 999,
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    justifyContent: "center"
  },
  eventUploadContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  eventUploadButtonText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8
  },
  eventMediaEmpty: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "600"
  },
  eventMediaItem: {
    height: 64,
    borderRadius: 10,
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    marginBottom: 6
  },
  eventMediaItemText: {
    color: "#e5e7eb",
    fontSize: 10,
    fontWeight: "600",
    flex: 1
  },
  eventMediaPreviewImage: {
    width: 44,
    height: 44,
    borderRadius: 8
  },
  eventDeleteButton: {
    marginTop: 8,
    marginBottom: 8,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  eventDeleteButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1
  },
  sheet: {
    minHeight: 240,
    maxHeight: "45%",
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  addMarkerContainer: {
    marginBottom: 12,
    gap: 8
  },
  markerInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1c1c1e",
    color: "#ffffff",
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6
  },
  addMarkerButton: {
    height: 40,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center"
  },
  addMarkerButtonDisabled: {
    opacity: 0.5
  },
  addMarkerButtonText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2
  },
  localSearchMessage: {
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8
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
  cardMetaAction: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 6
  },
  cardAddressLink: {
    color: "white",
    textDecorationLine: "underline",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5,5,5,0.82)",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  modalCard: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 8
  },
  modalAddress: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 10
  },
  modalInput: {
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1c1c1e",
    color: "#ffffff",
    paddingHorizontal: 14,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8
  },
  modalActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8
  },
  modalCancelButton: {
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1c1c1e",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14
  },
  modalCancelButtonText: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2
  },
  modalConfirmButton: {
    height: 36,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14
  },
  modalConfirmButtonText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2
  },
});
