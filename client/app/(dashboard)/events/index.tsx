import React, { useRef, useState, useMemo, useEffect } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EventsSearchBar, { EventsSearchBarHandle } from "../../../components/EventsSearchBar";
import DraggableSheet, { DraggableSheetRef } from "../../../components/DraggableSheet";
import EventsMap from "../../../components/EventsMap";
import { useAuth } from "../../../contexts/AuthContext";

type EventItem = { id: string; title: string; when: string; location: string; attendees: number };

type Friend = { id: string; name: string; email?: string; picture?: string; lat?: number; lng?: number };

type FriendLocation = { id: string; name: string; lat: number; lng: number; picture?: string };

type SelectedPlace = { lat: number; lng: number; description?: string } | null;

export default function EventsScreen() {
	const insets = useSafeAreaInsets();
	const { user, token } = useAuth();
	const sheetRef = useRef<DraggableSheetRef | null>(null);
	const searchRef = useRef<EventsSearchBarHandle | null>(null);
	const [events] = useState<EventItem[]>([
		{ id: "1", title: "Board Game Night", when: "Fri 7pm", location: "Alex's Place", attendees: 5 },
		{ id: "2", title: "Morning Run", when: "Sat 8am", location: "City Park", attendees: 3 },
		{ id: "3", title: "Brunch", when: "Sun 11am", location: "Cafe Bloom", attendees: 6 },
	]);

	const [friends, setFriends] = useState<Friend[]>([]);
	const [isLoadingFriends, setIsLoadingFriends] = useState(false);
	const [friendsError, setFriendsError] = useState<string | null>(null);

	useEffect(() => {
		const loadFriends = async () => {
			if (!user) return;
			setIsLoadingFriends(true);
			setFriendsError(null);
			try {
				const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${user.id}/friends`, {
					headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
				});
				const data = await res.json();
				if (res.ok && data.success) {
					setFriends(data.data || []);
				} else {
					setFriends([]);
					setFriendsError(data.error || 'Failed to load friends');
				}
			} catch (e) {
				setFriendsError('Failed to load friends');
			} finally {
				setIsLoadingFriends(false);
			}
		};
		loadFriends();
	}, [user, token]);

	const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
	const [fitSignal, setFitSignal] = useState(0);
	const [selectedPlace, setSelectedPlace] = useState<SelectedPlace>(null);
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

	const friendLocations = useMemo<FriendLocation[]>(() => {
		return selectedFriendIds
			.map(fid => friends.find(f => f.id === fid))
			.filter((f): f is Friend => Boolean(f && typeof f.lat === 'number' && typeof f.lng === 'number'))
			.map(f => ({ id: f.id, name: f.name, lat: f.lat as number, lng: f.lng as number, picture: f.picture }));
	}, [selectedFriendIds, friends]);

	return (
		<View style={{ flex: 1, backgroundColor: "transparent" }}>
			<EventsMap 
				friendLocations={friendLocations} 
				fitSignal={fitSignal} 
				selectedPlace={selectedPlace ?? undefined} 
				onMapCenterChange={setMapCenter}
			/>
			<View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
				<EventsSearchBar
					ref={(r) => { searchRef.current = r; }}
					navigateOnFocus={false}
					onFocus={() => sheetRef.current?.minimize()}
					onCreatePress={() => sheetRef.current?.minimize()}
					friendsList={friends}
					mapCenter={mapCenter}
					onFriendsSelected={(ids) => {
						setSelectedFriendIds(ids);
						setFitSignal(s => s + 1);
					}}
					onPlaceSelected={(place) => {
						setSelectedPlace(place);
						setFitSignal(s => s + 1);
					}}
				/>
				<DraggableSheet ref={sheetRef}>
					<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
						<Text style={{ fontSize: 22, fontWeight: "700" }}>Events</Text>
						<Pressable onPress={() => { sheetRef.current?.minimize(); searchRef.current?.focus(); }} style={{ backgroundColor: "#1A73E8", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
							<Text style={{ color: "#fff", fontWeight: "600" }}>Create</Text>
						</Pressable>
					</View>
					<FlatList
						data={events}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" }}>
								<Text style={{ fontSize: 16, fontWeight: "600" }}>{item.title}</Text>
								<Text style={{ color: "#666" }}>{item.when} • {item.location} • {item.attendees} going</Text>
							</View>
						)}
						contentContainerStyle={{ paddingBottom: 12 }}
					/>
				</DraggableSheet>
			</View>
		</View>
	);
}


