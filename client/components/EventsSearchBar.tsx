import React, { useImperativeHandle, useRef, useState } from "react";
import { View, TextInput, Pressable, FlatList, Text, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AISuggestionsPopup from "./AISuggestionsPopup";
import { AISuggestion } from "../types/ai";
import { useAuth } from "../contexts/AuthContext";
import FriendPicker from "./FriendPicker";

type Friend = { id: string; name: string; username?: string };

type PlaceSuggestion = { id: string; primary: string; secondary?: string; placeId: string };

type SelectedPlace = { lat: number; lng: number; description?: string };

type QueryOrigin = 'user' | 'programmatic';

export type EventsSearchBarProps = {
	navigateOnFocus?: boolean;
	autoFocus?: boolean;
	onFocus?: () => void;
	onCreatePress?: () => void;
	onFriendsSelected?: (friendIds: string[]) => void;
	friendsList?: Friend[];
	onPlaceSelected?: (place: SelectedPlace) => void;
	onPlaceCleared?: () => void;
	mapCenter?: { lat: number; lng: number };
	onQueryChange?: (text: string, origin?: QueryOrigin) => void;
	// Optional AI submit callback: when provided, we'll await it and show loading
	onAiSubmit?: (prompt: string) => Promise<void> | void;
	// Notifies parent when AI mode toggles
	onAiModeChange?: (enabled: boolean) => void;
    // Notifies parent when an AI suggestion is selected
    onAiSuggestionSelected?: (suggestion: AISuggestion) => void;
};

export type EventsSearchBarHandle = {
	focus: () => void;
	setQueryText: (text: string) => void;
};

const EventsSearchBar = React.forwardRef<EventsSearchBarHandle, EventsSearchBarProps>(function EventsSearchBar({ navigateOnFocus = true, autoFocus = false, onFocus, onCreatePress, onFriendsSelected, friendsList, onPlaceSelected, onPlaceCleared, mapCenter, onQueryChange, onAiSubmit, onAiModeChange, onAiSuggestionSelected }: EventsSearchBarProps, ref) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
    const { user, token } = useAuth();
	const inputRef = useRef<TextInput | null>(null);
	const [showFriendPicker, setShowFriendPicker] = useState(false);
	const friends: Friend[] = friendsList ?? [];
	const [invitedFriendIds, setInvitedFriendIds] = useState<Set<string>>(() => new Set());

	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [isFetching, setIsFetching] = useState(false);
	const [hasSelectedPlace, setHasSelectedPlace] = useState(false);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const [aiMode, setAiMode] = useState(false);
	const [aiSubmitting, setAiSubmitting] = useState(false);
    const [aiSuggestionsVisible, setAiSuggestionsVisible] = useState(false);
	const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
	const [aiReasoning, setAiReasoning] = useState<string | null>(null);
	const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

	const toggleInvite = (friendId: string) => {
		setInvitedFriendIds(prev => {
			const next = new Set(prev);
			if (next.has(friendId)) next.delete(friendId); else next.add(friendId);
			return next;
		});
	};

	const goToCreate = () => {
		if (onCreatePress) onCreatePress();
		else if (navigateOnFocus) router.push("/(dashboard)/events/create");
		// Always try to focus the input for immediate typing
		inputRef.current?.focus();
	};

	useImperativeHandle(ref, () => ({
		focus: () => inputRef.current?.focus(),
		setQueryText: (text: string) => {
			setQuery(text);
			onQueryChange?.(text, 'programmatic');
			// Mark that we have a selected place when setting text programmatically (e.g., from map tap/POI)
			setHasSelectedPlace(true);
			// Trigger autocomplete immediately for programmatic text so dropdown is ready
			// Avoid debounce here to feel responsive
			if (!aiMode) {
				void fetchAutocomplete(text);
			}
		},
	}), [onQueryChange]);

	const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

	const fetchAutocomplete = async (text: string) => {
		if (!apiKey) {
			console.warn('Google Maps API key not found. Places autocomplete will not work.');
			setSuggestions([]);
			return;
		}
		if (!text.trim()) {
			setSuggestions([]);
			return;
		}
		try {
			setIsFetching(true);
			
			// Build URL with location bias if map center is available
			let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}`;
			
			if (mapCenter) {
				// Add location bias to prioritize results near the map center
				url += `&location=${mapCenter.lat},${mapCenter.lng}&radius=50000`; // 50km radius
			}
			
			const res = await fetch(url);
			const data = await res.json();
			if (data.status === "OK" && Array.isArray(data.predictions)) {
				const mapped: PlaceSuggestion[] = data.predictions.map((p: any) => ({
					id: p.place_id,
					primary: p.structured_formatting?.main_text || p.description,
					secondary: p.structured_formatting?.secondary_text,
					placeId: p.place_id,
				}));
				setSuggestions(mapped);
			} else if (data.status === "ZERO_RESULTS") {
				setSuggestions([]);
			} else {
				console.warn('Google Places API error:', data.status, data.error_message);
				setSuggestions([]);
			}
		} catch (e) {
			console.error('Error fetching place suggestions:', e);
			setSuggestions([]);
		} finally {
			setIsFetching(false);
		}
	};

	const onChangeQuery = (text: string) => {
		setQuery(text);
		onQueryChange?.(text, 'user');
		
		// If user modifies text and we had a selected place, clear it
		if (hasSelectedPlace) {
			setHasSelectedPlace(false);
			onPlaceCleared?.();
		}
		
		if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		if (aiMode) {
			setSuggestions([]);
			return;
		}
		debounceTimerRef.current = setTimeout(() => fetchAutocomplete(text), 250);
	};

	const submitAiPrompt = async () => {
		if (!query.trim() || aiSubmitting) return;
		try {
			setAiSubmitting(true);
			if (onAiSubmit) {
				await onAiSubmit(query.trim());
			} else {
				setAiError(null);
				setAiSuggestionsVisible(true);
				const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/agent/suggest/events`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(token ? { 'Authorization': `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({ prompt: query.trim() }),
				});
        console.log('res', res);
				const data = await res.json();
				if (res.ok && data.success) {
					const suggestions: AISuggestion[] = data.data?.suggestions || [];
					setAiSuggestions(Array.isArray(suggestions) ? suggestions : []);
					// Try to extract AI reasoning/justification from response
					let aiReason = null;
					if (data.data?.finalResponse?.reasoning?.explanation) {
						aiReason = data.data.finalResponse.reasoning.explanation;
					} else if (data.data?.finalResponse?.text?.value) {
						aiReason = data.data.finalResponse.text.value;
					} else if (data.data?.finalResponse?.text) {
						aiReason = data.data.finalResponse.text;
					}
					setAiReasoning(typeof aiReason === 'string' ? aiReason : null);
					// Set summary paragraph if present
					setAiSummary(data.data.out || data.summary || data.data?.summaryParagraph || null);
				} else {
					setAiSuggestions([]);
					setAiReasoning(null);
					setAiSummary(null);
					setAiError(data.message || 'Failed to generate suggestions');
				}
			}
		} finally {
			setAiSubmitting(false);
		}
	};

	const selectSuggestion = async (s: PlaceSuggestion) => {
		if (!apiKey) {
			console.warn('Google Maps API key not found. Cannot get place details.');
			return;
		}
		try {
			const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.placeId}&fields=geometry,name,formatted_address&key=${apiKey}`);
			const data = await res.json();
			if (data.status === "OK") {
				const loc = data.result?.geometry?.location;
				if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
					// Use full address instead of just the name
					const description = data.result?.formatted_address || data.result?.name || s.primary;
					onPlaceSelected?.({ lat: loc.lat, lng: loc.lng, description });
					// Mark that we have a selected place
					setHasSelectedPlace(true);
					// Don't clear suggestions - keep autocomplete enabled
					setQuery(description);
					// Re-fetch suggestions for the new query to keep autocomplete active
					void fetchAutocomplete(description);
				} else {
					console.warn('Invalid location data received from Google Places API');
				}
			} else {
				console.warn('Google Places Details API error:', data.status, data.error_message);
			}
		} catch (e) {
			console.error('Error fetching place details:', e);
		}
	};

	const topBarOffset = aiMode ? 130 : 60;

	return (
		<>
			<View style={{ position: "absolute", top: insets.top + 12, left: 12, right: 12, backgroundColor: "#fff", borderRadius: 10, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, paddingHorizontal: 12, paddingVertical: 10 }} pointerEvents="box-none">
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<TextInput
						ref={(r) => { inputRef.current = r; }}
						placeholder="Search events or places"
						style={{ flex: 1, marginRight: 8, height: aiMode ? 100 : 45, textAlignVertical: 'top' }}
						multiline={aiMode}
						scrollEnabled={aiMode}
						numberOfLines={aiMode ? undefined : 1}
						onFocus={() => { onFocus?.(); if (navigateOnFocus) goToCreate(); }}
						autoFocus={autoFocus}
						value={query}
						onChangeText={onChangeQuery}
					/>
					{isFetching ? (
						<ActivityIndicator size="small" color="#1A73E8" style={{ marginRight: 8 }} />
					) : null}

					{aiMode && (
						<Pressable
							onPress={submitAiPrompt}
							disabled={aiSubmitting || !query.trim()}
							hitSlop={8}
							style={{ padding: 6, borderRadius: 8, backgroundColor: aiSubmitting || !query.trim() ? '#93C5FD' : '#1A73E8', marginRight: 8 }}
						>
							{aiSubmitting ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<Ionicons name="send" size={18} color="#fff" />
							)}
						</Pressable>
					)}

					<Pressable onPress={() => { const next = !aiMode; setAiMode(next); if (next) { setSuggestions([]); } onAiModeChange?.(next); }} hitSlop={8} style={{ padding: 4, marginRight: 4 }}>
						<Ionicons name={aiMode ? "flask" : "flask-outline"} size={20} color="#1A73E8" />
					</Pressable>
					<Pressable onPress={() => setShowFriendPicker(true)} hitSlop={8} style={{ padding: 4 }}>
						<Ionicons name="people" size={20} color="#1A73E8" />
					</Pressable>
				</View>
			</View>

			{/* Autocomplete dropdown */}
			{suggestions.length > 0 && !showFriendPicker && !aiMode ? (
				<View style={{ position: "absolute", top: insets.top + topBarOffset, left: 12, right: 12, backgroundColor: "#fff", borderRadius: 10, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, maxHeight: 260, overflow: "hidden" }}>
					<FlatList
						keyboardShouldPersistTaps="handled"
						data={suggestions}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<Pressable onPress={() => selectSuggestion(item)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: "#F3F4F6" }}>
								<Text style={{ fontSize: 15, fontWeight: "600" }}>{item.primary}</Text>
								{item.secondary ? <Text style={{ color: "#6B7280" }}>{item.secondary}</Text> : null}
							</Pressable>
						)}
					/>
				</View>
			) : null}

			{/* AI Suggestions Popup */}
			<AISuggestionsPopup
				visible={aiMode && aiSuggestionsVisible}
				suggestions={aiSuggestions}
				onClose={() => setAiSuggestionsVisible(false)}
				onSelect={(s) => {
					// Prefill: open create modal upstream by selecting location and setting query text
					if (s.location && typeof s.location.lat === 'number' && typeof s.location.lng === 'number') {
						// Use description in search bar for UX continuity
						const desc = s.location.description || `${s.location.lat.toFixed(4)}, ${s.location.lng.toFixed(4)}`;
						setQuery(desc);
						onPlaceSelected?.({ lat: s.location.lat, lng: s.location.lng, description: desc });
					}
					// Notify parent about the suggestion for further prefill (title, times, friends)
					onAiSuggestionSelected?.(s);
					// Hide popup after selection
					setAiSuggestionsVisible(false);
				}}
				isLoading={aiSubmitting}
				error={aiError}
				topOffset={topBarOffset}
				aiReasoning={aiReasoning}
				aiSummary={aiSummary}
			/>

			<FriendPicker
				visible={showFriendPicker}
				onClose={() => setShowFriendPicker(false)}
				friends={friends}
				invitedFriendIds={invitedFriendIds}
				onToggleInvite={toggleInvite}
				topOffset={topBarOffset}
				onDone={(ids) => { onFriendsSelected?.(ids); }}
			/>
		</>
	);
});

export default EventsSearchBar;


