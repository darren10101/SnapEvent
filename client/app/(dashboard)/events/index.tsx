import React, { useRef, useState, useMemo, useEffect } from "react";
import { View, Text, Alert, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EventsSearchBar, { EventsSearchBarHandle } from "../../../components/EventsSearchBar";
import DraggableSheet, { DraggableSheetRef } from "../../../components/DraggableSheet";
import EventsMap from "../../../components/EventsMap";
import EventCreationModal from "../../../components/EventCreationModal";
import EventPreviewModal from "../../../components/EventPreviewModal";
import EventEditModal from "../../../components/EventEditModal";
import { useAuth } from "../../../contexts/AuthContext";

type EventItem = { 
	id: string; 
	name: string; 
	start: string; 
	end: string; 
	location: { 
		lat: number; 
		lng: number; 
		description?: string; 
	}; 
	participants: string[]; 
	createdBy: string;
	createdAt: string;
	updatedAt: string;
};

type Friend = { id: string; name: string; email?: string; picture?: string; lat?: number; lng?: number };

type FriendLocation = { id: string; name: string; lat: number; lng: number; picture?: string };

type SelectedPlace = { lat: number; lng: number; description?: string } | null;

export default function EventsScreen() {
	const insets = useSafeAreaInsets();
	const { user, token } = useAuth();
	const sheetRef = useRef<DraggableSheetRef | null>(null);
	const searchRef = useRef<EventsSearchBarHandle | null>(null);
	const [allEvents, setAllEvents] = useState<EventItem[]>([]);
	const [isLoadingEvents, setIsLoadingEvents] = useState(false);
	const [eventsError, setEventsError] = useState<string | null>(null);

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

		const loadEventsData = async () => {
			if (!user) return;
			setIsLoadingEvents(true);
			setEventsError(null);
			try {
				const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events/user/${user.id}`, {
					headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
				});
				const data = await res.json();
				if (res.ok && data.success) {
					setAllEvents(data.data || []);
				} else {
					setAllEvents([]);
					setEventsError(data.error || 'Failed to load events');
				}
			} catch (e) {
				setEventsError('Failed to load events');
			} finally {
				setIsLoadingEvents(false);
			}
		};

		loadFriends();
		loadEventsData();
	}, [user, token]);

	const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
	const [fitSignal, setFitSignal] = useState(0);
	const [selectedPlace, setSelectedPlace] = useState<SelectedPlace>(null);
	const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
	const [showEventCreation, setShowEventCreation] = useState(false);
	const [eventCreationPlace, setEventCreationPlace] = useState<SelectedPlace>(null);
	const [eventStartingLocation, setEventStartingLocation] = useState<SelectedPlace>(null);
	const [isSelectingStartingLocation, setIsSelectingStartingLocation] = useState(false);
	const [showEventPreview, setShowEventPreview] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
	const [showEventEdit, setShowEventEdit] = useState(false);
	const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

	const loadEvents = async () => {
		if (!user) return;
		setIsLoadingEvents(true);
		setEventsError(null);
		try {
			const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events/user/${user.id}`, {
				headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
			});
			const data = await res.json();
			if (res.ok && data.success) {
				setAllEvents(data.data || []);
			} else {
				setAllEvents([]);
				setEventsError(data.error || 'Failed to load events');
			}
		} catch (e) {
			setEventsError('Failed to load events');
		} finally {
			setIsLoadingEvents(false);
		}
	};

	const handleEventSave = async (eventData: {
		title: string;
		description: string;
		startDate: Date;
		endDate: Date;
		location: SelectedPlace;
		startingLocation?: SelectedPlace;
		invitedFriends: string[];
	}) => {
		if (!user) {
			Alert.alert('Error', 'You must be logged in to create events');
			return;
		}

		if (!eventData.location) {
			Alert.alert('Error', 'Location is required');
			return;
		}

		try {
			const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token && { 'Authorization': `Bearer ${token}` })
				},
				body: JSON.stringify({
					name: eventData.title,
					description: eventData.description,
					location: {
						lat: eventData.location.lat,
						lng: eventData.location.lng,
						description: eventData.location.description
					},
					start: eventData.startDate.toISOString(),
					end: eventData.endDate.toISOString(),
					createdBy: user.id,
					participants: [user.id, ...eventData.invitedFriends]
				})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				console.log('Event created successfully:', result.data);
				setShowEventCreation(false);
				Alert.alert('Success', 'Event created successfully!');
				// Refresh events list
				loadEvents();
			} else {
				console.error('Failed to create event:', result.error);
				Alert.alert('Error', result.error || 'Failed to create event');
			}
		} catch (error) {
			console.error('Error creating event:', error);
			Alert.alert('Error', 'Failed to create event. Please try again.');
		}
	};

	const handleEventCancel = () => {
		setShowEventCreation(false);
		setEventCreationPlace(null);
		setEventStartingLocation(null);
		setIsSelectingStartingLocation(false);
	};

	const handleEventClick = (event: EventItem) => {
		setSelectedEvent(event);
		setShowEventPreview(true);
	};

	const handleEventEdit = (event: EventItem) => {
		setShowEventPreview(false);
		setEditingEvent(event);
		setShowEventEdit(true);
	};

	const handleEventUpdate = async (eventData: {
		id: string;
		title: string;
		description: string;
		startDate: Date;
		endDate: Date;
		location: { lat: number; lng: number; description?: string };
		invitedFriends: string[];
	}) => {
		if (!user) {
			Alert.alert('Error', 'You must be logged in to update events');
			return;
		}

		try {
			const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events/${eventData.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					...(token && { 'Authorization': `Bearer ${token}` })
				},
				body: JSON.stringify({
					name: eventData.title,
					description: eventData.description,
					location: eventData.location,
					start: eventData.startDate.toISOString(),
					end: eventData.endDate.toISOString(),
					participants: [user.id, ...eventData.invitedFriends]
				})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				console.log('Event updated successfully:', result.data);
				setShowEventEdit(false);
				setEditingEvent(null);
				Alert.alert('Success', 'Event updated successfully!');
				// Refresh events list
				loadEvents();
			} else {
				console.error('Failed to update event:', result.error);
				Alert.alert('Error', result.error || 'Failed to update event');
			}
		} catch (error) {
			console.error('Error updating event:', error);
			Alert.alert('Error', 'Failed to update event. Please try again.');
		}
	};

	const formatEventTime = (startDate: string, endDate: string) => {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const isToday = start.toDateString() === today.toDateString();
		const isTomorrow = start.toDateString() === tomorrow.toDateString();
		
		let dayText = '';
		if (isToday) {
			dayText = 'Today';
		} else if (isTomorrow) {
			dayText = 'Tomorrow';
		} else {
			dayText = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
		}

		const timeText = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
		return `${dayText} ${timeText}`;
	};

	const formatEventLocation = (location: { lat: number; lng: number; description?: string }) => {
		return location.description || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
	};

	const friendLocations = useMemo<FriendLocation[]>(() => {
		return selectedFriendIds
			.map(fid => friends.find(f => f.id === fid))
			.filter((f): f is Friend => Boolean(f && typeof f.lat === 'number' && typeof f.lng === 'number'))
			.map(f => ({ id: f.id, name: f.name, lat: f.lat as number, lng: f.lng as number, picture: f.picture }));
	}, [selectedFriendIds, friends]);

	// Split events into categories
	const myEvents = useMemo(() => {
		return allEvents.filter(event => event.createdBy === user?.id);
	}, [allEvents, user?.id]);

	const invitedEvents = useMemo(() => {
		return allEvents.filter(event => 
			event.createdBy !== user?.id && 
			event.participants.includes(user?.id || '')
		);
	}, [allEvents, user?.id]);

	const handleMapPress = async (lat: number, lng: number) => {
		try {
			const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
			let description = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
			if (apiKey) {
				const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
				const data = await res.json();
				if (data.status === 'OK' && data.results && data.results.length > 0) {
					description = data.results[0].formatted_address || description;
				}
			}
		// Update search bar text and focus
		searchRef.current?.setQueryText(description);
		searchRef.current?.focus();
		// Set selected place and fit
		if (isSelectingStartingLocation) {
			setEventStartingLocation({ lat, lng, description });
			setIsSelectingStartingLocation(false);
			setShowEventCreation(true);
		} else {
			setSelectedPlace({ lat, lng, description });
			setEventCreationPlace({ lat, lng, description });
		}
		setFitSignal(s => s + 1);
		} catch (e) {
			console.warn('Reverse geocoding failed, using coordinates');
			const description = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
			searchRef.current?.setQueryText(description);
			searchRef.current?.focus();
			if (isSelectingStartingLocation) {
				setEventStartingLocation({ lat, lng, description });
				setIsSelectingStartingLocation(false);
				setShowEventCreation(true);
			} else {
				setSelectedPlace({ lat, lng, description });
				setEventCreationPlace({ lat, lng, description });
			}
			setFitSignal(s => s + 1);
		}
	};

	const handlePoiPress = async (poi: { lat: number; lng: number; name?: string; placeId?: string }) => {
		const { lat, lng, name, placeId } = poi;
		const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
		let description = name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
		try {
			if (apiKey) {
				if (placeId) {
					const detailsRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry&key=${apiKey}`);
					const details = await detailsRes.json();
					if (details.status === 'OK') {
						// Use full address instead of just the name
						description = details.result?.formatted_address || details.result?.name || description;
					}
				} else {
					const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
					const geo = await geoRes.json();
					if (geo.status === 'OK' && geo.results && geo.results.length > 0) {
						// Use full address instead of just the name
						description = geo.results[0].formatted_address || description;
					}
				}
			}
		} catch (e) {
			// Fallback to coordinates with name if API fails
		}
		searchRef.current?.setQueryText(description);
		searchRef.current?.focus();
		if (isSelectingStartingLocation) {
			setEventStartingLocation({ lat, lng, description });
			setIsSelectingStartingLocation(false);
			setShowEventCreation(true);
		} else {
			setSelectedPlace({ lat, lng, description });
			setEventCreationPlace({ lat, lng, description });
		}
		setFitSignal(s => s + 1);
	};

	return (
		<View style={{ flex: 1, backgroundColor: "transparent" }}>
			<EventsMap 
				friendLocations={friendLocations} 
				fitSignal={fitSignal} 
				selectedPlace={selectedPlace ?? undefined} 
				onMapCenterChange={setMapCenter}
				onMapPress={handleMapPress}
				onPoiPress={handlePoiPress}
			/>
			<View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
				<EventsSearchBar
					ref={(r) => { searchRef.current = r; }}
					navigateOnFocus={false}
					onFocus={() => sheetRef.current?.minimize()}
					onCreatePress={() => {
						sheetRef.current?.minimize();
						// For creating events, user needs to search and select a location first
					}}
					friendsList={friends}
					mapCenter={mapCenter}
					onFriendsSelected={(ids) => {
						setSelectedFriendIds(ids);
						setFitSignal(s => s + 1);
					}}
					onPlaceSelected={(place) => {
						if (isSelectingStartingLocation) {
							setEventStartingLocation(place);
							setIsSelectingStartingLocation(false);
						} else {
							setSelectedPlace(place);
							setEventCreationPlace(place);
							setShowEventCreation(true);
						}
						setFitSignal(s => s + 1);
					}}
					onPlaceCleared={() => {
						setSelectedPlace(null);
						setEventCreationPlace(null);
					}}
				/>
				<DraggableSheet ref={sheetRef}>
					<View style={{ marginBottom: 16 }}>
						<Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}>Events</Text>
						
						{/* My Events Section */}
						<View style={{ marginBottom: 20 }}>
							<Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8, color: "#333" }}>My Events</Text>
							{myEvents.length > 0 ? (
								myEvents.map((item) => (
									<Pressable 
										key={item.id} 
										onPress={() => handleEventClick(item)}
										style={{ 
											paddingVertical: 12, 
											borderBottomWidth: 1, 
											borderColor: "#eee",
											backgroundColor: 'transparent',
											borderRadius: 4
										}}
									>
										<Text style={{ fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
										<Text style={{ color: "#666" }}>
											{formatEventTime(item.start, item.end)} • {formatEventLocation(item.location)} • {item.participants.length} going
										</Text>
									</Pressable>
								))
							) : (
								<View style={{ padding: 12, alignItems: "center", backgroundColor: "#f8f9fa", borderRadius: 8 }}>
									<Text style={{ color: "#666", fontSize: 14 }}>No events created yet</Text>
								</View>
							)}
						</View>

						{/* Invited Events Section */}
						<View>
							<Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8, color: "#333" }}>Invited Events</Text>
							{invitedEvents.length > 0 ? (
								invitedEvents.map((item) => (
									<Pressable 
										key={item.id} 
										onPress={() => handleEventClick(item)}
										style={{ 
											paddingVertical: 12, 
											borderBottomWidth: 1, 
											borderColor: "#eee",
											backgroundColor: 'transparent',
											borderRadius: 4
										}}
									>
										<Text style={{ fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
										<Text style={{ color: "#666" }}>
											{formatEventTime(item.start, item.end)} • {formatEventLocation(item.location)} • {item.participants.length} going
										</Text>
									</Pressable>
								))
							) : (
								<View style={{ padding: 12, alignItems: "center", backgroundColor: "#f8f9fa", borderRadius: 8 }}>
									<Text style={{ color: "#666", fontSize: 14 }}>No invited events</Text>
								</View>
							)}
						</View>

						{/* Loading/Error States */}
						{isLoadingEvents && (
							<View style={{ padding: 20, alignItems: "center" }}>
								<Text style={{ color: "#666" }}>Loading events...</Text>
							</View>
						)}
						
						{eventsError && !isLoadingEvents && (
							<View style={{ padding: 20, alignItems: "center" }}>
								<Text style={{ color: "#666" }}>Error: {eventsError}</Text>
							</View>
						)}
					</View>
				</DraggableSheet>
			</View>

			<EventCreationModal
				visible={showEventCreation}
				selectedPlace={eventCreationPlace}
				friends={friends}
				currentUser={user || undefined}
				onClose={handleEventCancel}
				onSelectStartingLocation={() => {
					setIsSelectingStartingLocation(true);
					setShowEventCreation(false);
				}}
				selectedStartingLocation={eventStartingLocation}
				token={token || undefined}
				onSave={handleEventSave}
			/>

			<EventPreviewModal
				visible={showEventPreview}
				event={selectedEvent}
				friends={friends}
				currentUser={user || undefined}
				token={token || undefined}
				onClose={() => setShowEventPreview(false)}
				onEdit={handleEventEdit}
			/>

			<EventEditModal
				visible={showEventEdit}
				event={editingEvent}
				friends={friends}
				onClose={() => {
					setShowEventEdit(false);
					setEditingEvent(null);
				}}
				onSave={handleEventUpdate}
			/>
		</View>
	);
}


