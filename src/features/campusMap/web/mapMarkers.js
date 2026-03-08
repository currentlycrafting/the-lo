/**
 * Returns the inline JS for marker logic: center marker, dot markers with size, click-to-add, addMarkerFromApp, info window.
 */
export const createMarkersScript = (config) => `
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function scaleFromSize(s) {
    var scales = { small: 4, medium: 6, large: 10 };
    return scales[s] || 6;
  }

  function dotIcon(scale) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: scale,
      fillColor: '#8a99ad',
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 1.5
    };
  }

  new google.maps.Marker({ position: center, map: map, title: 'Campus center', icon: dotIcon(5) });

  var infoWindow = new google.maps.InfoWindow();
  var userMarkers = [];

  function addUserMarker(lat, lng, name, address, notes, size) {
    var pos = { lat: lat, lng: lng };
    var scale = scaleFromSize(size);
    var marker = new google.maps.Marker({
      position: pos,
      map: map,
      title: name || 'Unnamed',
      icon: dotIcon(scale)
    });
    marker.placeName = name || 'Unnamed';
    marker.placeAddress = address || '';
    marker.placeNotes = notes || '';
    userMarkers.push(marker);
    marker.addListener('click', function() {
      var content = '<div style="padding:8px;min-width:140px;">';
      content += '<strong>' + escapeHtml(marker.placeName) + '</strong>';
      if (marker.placeAddress) content += '<br><span style="color:#8a99ad;font-size:12px;">' + escapeHtml(marker.placeAddress) + '</span>';
      if (marker.placeNotes) content += '<br><span style="color:#6a7a8d;font-size:12px;">' + escapeHtml(marker.placeNotes) + '</span>';
      content += '</div>';
      infoWindow.setContent(content);
      infoWindow.open(map, marker);
    });
  }

  map.addListener('click', function(ev) {
    var name = window.prompt('Name this place:', '');
    if (name === null) return;
    name = (name || 'Unnamed').trim();
    addUserMarker(ev.latLng.lat(), ev.latLng.lng(), name, '', '', 'medium');
  });

  window.addMarkerFromApp = function(lat, lng, name, address, notes, size) {
    addUserMarker(lat, lng, name || 'Unnamed', address || '', notes || '', size || 'medium');
  };

  if (window.__INITIAL_MARKERS__ && Array.isArray(window.__INITIAL_MARKERS__)) {
    window.__INITIAL_MARKERS__.forEach(function(m) {
      addUserMarker(m.lat, m.lng, m.name, m.address, m.notes || '', m.size || 'medium');
    });
  }
`;
