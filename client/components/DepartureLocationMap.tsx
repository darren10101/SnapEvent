import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import MapView, { Marker, Region, MapPressEvent, PoiClickEvent } from "react-native-maps";
import Ionicons from "@expo/vector-icons/Ionicons";

type SelectedLocation = {
  lat: number;
  lng: number;
  description?: string;
};

export type DepartureLocationMapProps = {
  selectedLocation?: SelectedLocation | null;
  onLocationSelected: (location: SelectedLocation) => void;
  onLocationCleared: () => void;
  height?: number;
};

export default function DepartureLocationMap({
  selectedLocation,
  onLocationSelected,
  onLocationCleared,
  height = 300,
}: DepartureLocationMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasCentered, setHasCentered] = useState(false);

  const defaultRegion: Region = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const handleMapPress = async (e: MapPressEvent) => {
    const { coordinate } = e.nativeEvent;
    if (coordinate?.latitude && coordinate?.longitude) {
      const { latitude: lat, longitude: lng } = coordinate;
      let description = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      // Try reverse geocoding
      try {
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
          );
          const data = await res.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            description = data.results[0].formatted_address || description;
          }
        }
      } catch (e) {
        console.warn('Reverse geocoding failed, using coordinates');
      }

      onLocationSelected({ lat, lng, description });
    }
  };

  const handlePoiClick = async (e: PoiClickEvent) => {
    const { coordinate, name, placeId } = e.nativeEvent;
    if (coordinate?.latitude && coordinate?.longitude) {
      const { latitude: lat, longitude: lng } = coordinate;
      let description = name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      // Try to get detailed place information
      try {
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          if (placeId) {
            const detailsRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry&key=${apiKey}`
            );
            const details = await detailsRes.json();
            if (details.status === 'OK') {
              description = details.result?.formatted_address || details.result?.name || description;
            }
          } else {
            const geoRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
            );
            const geo = await geoRes.json();
            if (geo.status === 'OK' && geo.results && geo.results.length > 0) {
              description = geo.results[0].formatted_address || description;
            }
          }
        }
      } catch (e) {
        console.warn('Place details fetch failed');
      }

      onLocationSelected({ lat, lng, description });
    }
  };

  const handleZoomIn = () => {
    mapRef.current?.getCamera().then((camera) => {
      const newZoom = Math.min((camera.zoom || 10) + 1, 20);
      mapRef.current?.animateCamera({ zoom: newZoom }, { duration: 300 });
    });
  };

  const handleZoomOut = () => {
    mapRef.current?.getCamera().then((camera) => {
      const newZoom = Math.max((camera.zoom || 10) - 1, 1);
      mapRef.current?.animateCamera({ zoom: newZoom }, { duration: 300 });
    });
  };

  const handleMyLocation = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  // Auto-focus on selected location when it changes
  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  }, [selectedLocation]);

  return (
    <View style={{ height, borderRadius: 12, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Select Your Departure Location</Text>
        {selectedLocation && (
          <TouchableOpacity
            onPress={onLocationCleared}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: "#f3f4f6",
              borderRadius: 6,
            }}
          >
            <Ionicons name="close" size={16} color="#6b7280" />
            <Text style={{ marginLeft: 4, fontSize: 14, color: "#6b7280" }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Map */}
      <View style={{ flex: 1, position: "relative" }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={defaultRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          zoomEnabled={true}
          scrollEnabled={true}
          rotateEnabled={true}
          pitchEnabled={true}
          zoomControlEnabled={false}
          onPress={handleMapPress}
          onPoiClick={handlePoiClick}
          onUserLocationChange={(e) => {
            const { coordinate } = e.nativeEvent;
            if (coordinate?.latitude && coordinate?.longitude) {
              setUserLocation({ latitude: coordinate.latitude, longitude: coordinate.longitude });
              if (!hasCentered) {
                setHasCentered(true);
                mapRef.current?.animateToRegion(
                  {
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  },
                  500
                );
              }
            }
          }}
        >
          {selectedLocation && (
            <Marker
              coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }}
              title="Your Departure Location"
              description={selectedLocation.description || "Your selected departure point"}
              pinColor="#10B981"
            />
          )}
        </MapView>

        {/* Map Controls */}
        <View
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            flexDirection: "column",
          }}
        >
          <TouchableOpacity
            onPress={handleZoomIn}
            style={{
              width: 36,
              height: 36,
              backgroundColor: "#ffffff",
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 6,
              elevation: 2,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              borderWidth: 1,
              borderColor: "#e0e0e0",
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#333" }}>+</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleZoomOut}
            style={{
              width: 36,
              height: 36,
              backgroundColor: "#ffffff",
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 6,
              elevation: 2,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              borderWidth: 1,
              borderColor: "#e0e0e0",
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#333" }}>−</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleMyLocation}
            style={{
              width: 36,
              height: 36,
              backgroundColor: "#ffffff",
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              elevation: 2,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              borderWidth: 1,
              borderColor: "#e0e0e0",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={16} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Instructions overlay */}
        {!selectedLocation && (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: 12,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, textAlign: "center" }}>
              Tap on the map or a place to select your departure location
            </Text>
          </View>
        )}

        {/* Selected location info */}
        {selectedLocation && (
          <View
            style={{
              position: "absolute",
              bottom: 60,
              left: 12,
              right: 60,
              backgroundColor: "#fff",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              elevation: 2,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#333", marginBottom: 2 }}>
              Your Departure Location
            </Text>
            <Text style={{ fontSize: 12, color: "#666" }}>
              {selectedLocation.description || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}