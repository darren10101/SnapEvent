import React, { useImperativeHandle, useRef, useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import FriendPicker from "./FriendPicker";

type Friend = { id: string; name: string; username?: string };

export type EventsSearchBarProps = {
	navigateOnFocus?: boolean;
	autoFocus?: boolean;
	onFocus?: () => void;
	onCreatePress?: () => void;
};

export type EventsSearchBarHandle = {
	focus: () => void;
};

const EventsSearchBar = React.forwardRef<EventsSearchBarHandle, EventsSearchBarProps>(function EventsSearchBar({ navigateOnFocus = true, autoFocus = false, onFocus, onCreatePress }: EventsSearchBarProps, ref) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const inputRef = useRef<TextInput | null>(null);
	const [showFriendPicker, setShowFriendPicker] = useState(false);
	const [friends] = useState<Friend[]>([
		{ id: "f1", name: "Alex Johnson", username: "alexj" },
		{ id: "f2", name: "Brianna Lee", username: "brianna" },
		{ id: "f3", name: "Carlos Mendoza", username: "carlos" },
		{ id: "f4", name: "Dana Kapoor", username: "danak" },
		{ id: "f5", name: "Evan Chen", username: "evanc" },
		{ id: "f6", name: "Fatima Noor", username: "fatima" },
	]);
	const [invitedFriendIds, setInvitedFriendIds] = useState<Set<string>>(() => new Set());

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
	}), []);

	return (
		<>
			<View style={{ position: "absolute", top: insets.top + 12, left: 12, right: 12, backgroundColor: "#fff", borderRadius: 10, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, paddingHorizontal: 12, paddingVertical: 10 }} pointerEvents="box-none">
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<TextInput
						ref={(r) => { inputRef.current = r; }}
						placeholder="Search events or places"
						style={{ flex: 1, marginRight: 8 }}
						onFocus={() => { onFocus?.(); if (navigateOnFocus) goToCreate(); }}
						autoFocus={autoFocus}
					/>
					<Pressable onPress={goToCreate} hitSlop={8} style={{ padding: 4 }}>
						<Ionicons name="search" size={22} color="#1A73E8" />
					</Pressable>
					<Pressable onPress={() => setShowFriendPicker(true)} hitSlop={8} style={{ padding: 4 }}>
						<Ionicons name="people" size={22} color="#1A73E8" />
					</Pressable>
				</View>
			</View>

			<FriendPicker
				visible={showFriendPicker}
				onClose={() => setShowFriendPicker(false)}
				friends={friends}
				invitedFriendIds={invitedFriendIds}
				onToggleInvite={toggleInvite}
				topOffset={60}
			/>
		</>
	);
});

export default EventsSearchBar;


