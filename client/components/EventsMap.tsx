import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Image, Text } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

export type FriendLocation = { id: string; name: string; lat: number; lng: number; picture?: string };

export type EventsMapProps = {
	friendLocations?: FriendLocation[];
	selectedPlace?: { lat: number; lng: number; description?: string } | null;
	fitSignal?: number; // increment to trigger fit to markers (user + friends + selected place)
	onMapCenterChange?: (center: { lat: number; lng: number }) => void;
};

export default function EventsMap({ friendLocations = [], selectedPlace = null, fitSignal = 0, onMapCenterChange }: EventsMapProps) {
	const mapRef = useRef<MapView | null>(null);
	const [hasCentered, setHasCentered] = useState(false);
	const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

	const defaultRegion: Region = {
		latitude: 37.78825,
		longitude: -122.4324,
		latitudeDelta: 0.0922,
		longitudeDelta: 0.0421,
	};

	// Compute coordinates to fit when requested
	const coordinatesToFit = useMemo(() => {
		const coords: { latitude: number; longitude: number }[] = [];
		if (userLocation) coords.push(userLocation);
		for (const f of friendLocations) {
			if (typeof f.lat === "number" && typeof f.lng === "number") {
				coords.push({ latitude: f.lat, longitude: f.lng });
			}
		}
		if (selectedPlace && typeof selectedPlace.lat === "number" && typeof selectedPlace.lng === "number") {
			coords.push({ latitude: selectedPlace.lat, longitude: selectedPlace.lng });
		}
		return coords;
	}, [userLocation, friendLocations, selectedPlace]);

	useEffect(() => {
		if (!mapRef.current) return;
		if (coordinatesToFit.length === 0) return;
		mapRef.current.fitToCoordinates(coordinatesToFit, {
			edgePadding: { top: 80, right: 80, bottom: 120, left: 80 },
			animated: true,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fitSignal]);

	const renderFriendMarkerContent = (friend: FriendLocation) => {
		if (friend.picture) {
			return (
				<View style={{
					width: 38,
					height: 38,
					borderRadius: 20,
					backgroundColor: '#fff',
					borderWidth: 2,
					borderColor: '#10B981',
					overflow: 'hidden',
					alignItems: 'center',
					justifyContent: 'center',
					elevation: 4,
					shadowColor: '#000',
					shadowOpacity: 0.25,
					shadowRadius: 4,
					shadowOffset: { width: 0, height: 2 }
				}}>
					<Image 
						source={{ uri: friend.picture }} 
						style={{ width: 34, height: 34, borderRadius: 18 }} 
					/>
				</View>
			);
		}
		return (
			<View style={{
				width: 38,
				height: 38,
				borderRadius: 20,
				backgroundColor: '#10B981',
				borderWidth: 2,
				borderColor: '#fff',
				alignItems: 'center',
				justifyContent: 'center',
				elevation: 4,
				shadowColor: '#000',
				shadowOpacity: 0.25,
				shadowRadius: 4,
				shadowOffset: { width: 0, height: 2 }
			}}>
				<Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
					{friend.name.charAt(0).toUpperCase()}
				</Text>
			</View>
		);
	};

	return (
		<View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
			<MapView
				ref={(r) => { mapRef.current = r; }}
				style={{ flex: 1 }}
				initialRegion={defaultRegion}
				showsUserLocation={true}
				showsMyLocationButton={true}
				showsCompass={true}
				zoomEnabled={true}
				scrollEnabled={true}
				rotateEnabled={true}
				pitchEnabled={true}
				zoomControlEnabled={true}
				onRegionChangeComplete={(region) => {
					// Provide the current map center for location-aware search
					onMapCenterChange?.({ lat: region.latitude, lng: region.longitude });
				}}
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
				{friendLocations.map((f) => (
					<Marker 
						key={f.id} 
						coordinate={{ latitude: f.lat, longitude: f.lng }} 
						title={f.name} 
						description={"Friend"}
						anchor={{ x: 0.5, y: 0.5 }}
					>
						{renderFriendMarkerContent(f)}
					</Marker>
				))}
				{selectedPlace ? (
					<Marker coordinate={{ latitude: selectedPlace.lat, longitude: selectedPlace.lng }} title={selectedPlace.description ?? "Selected Place"} pinColor="#1A73E8" />
				) : null}
			</MapView>
		</View>
	);
}


