import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center]);
  return null;
};

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    }
  });
  return position === null ? null : <Marker position={position} />;
};

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

const LocationPicker = ({ onLocationSelect, initialPosition }) => {
  const [position, setPosition] = useState(initialPosition || null);
  const [center, setCenter] = useState(initialPosition || DEFAULT_CENTER);

  useEffect(() => {
    if (position) {
      onLocationSelect(position);
    }
  }, [position]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(newPos);
          setCenter(newPos);
        },
        () => {
          alert('Could not get current location. Please click on the map instead.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        className="mb-2 btn-secondary text-sm py-2"
      >
        <MapPin size={15} />
        Use my current location
      </button>
      <div className="rounded-control overflow-hidden border border-line" style={{ height: '300px' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <ChangeView center={center} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
      <p className="text-xs text-muted mt-1.5">
        Click on the map to set the exact location, or use the button above.
      </p>
      {position && (
        <p className="text-xs text-body mt-1">
          Selected: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default LocationPicker;
