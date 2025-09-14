import React, { useRef, useState } from "react";
import { View } from "react-native";
import MapView, { Region } from "react-native-maps";

export default function EventsMap() {
	const mapRef = useRef<MapView | null>(null);
	const [hasCentered, setHasCentered] = useState(false);

	const defaultRegion: Region = {
		latitude: 37.78825,
		longitude: -122.4324,
		latitudeDelta: 0.0922,
		longitudeDelta: 0.0421,
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
				onUserLocationChange={(e) => {
					if (hasCentered) return;
					const { coordinate } = e.nativeEvent;
					if (coordinate?.latitude && coordinate?.longitude) {
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
				}}
			/>
		</View>
	);
}


