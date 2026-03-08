/**
 * Dark theme styles for the Google Map.
 */
export const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0f1116' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1116' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a99ad' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#3a4250' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#141820' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a1f2a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#273142' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1d2533' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#212735' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#07090d' }] },
];
