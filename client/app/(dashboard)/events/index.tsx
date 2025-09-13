import React, { useState } from "react";
import { View, Text, Pressable, FlatList, TextInput } from "react-native";
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FriendPicker from "../../../components/FriendPicker";
import DraggableSheet from "../../../components/DraggableSheet";

type EventItem = { id: string; title: string; when: string; location: string; attendees: number };
type Friend = { id: string; name: string; username?: string };

export default function EventsScreen() {
	const insets = useSafeAreaInsets();
	const [events] = useState<EventItem[]>([
		{ id: "1", title: "Board Game Night", when: "Fri 7pm", location: "Alex's Place", attendees: 5 },
		{ id: "2", title: "Morning Run", when: "Sat 8am", location: "City Park", attendees: 3 },
		{ id: "3", title: "Brunch", when: "Sun 11am", location: "Cafe Bloom", attendees: 6 },
	]);

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

	return (
		<View style={{ flex: 1 }}>
			<View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E6F0FF" }}>
				<Text style={{ color: "#1A73E8" }}>Google Map placeholder</Text>
				<Text style={{ color: "#1A73E8", marginTop: 4 }}>Install react-native-maps to enable the map</Text>
			</View>
			<View style={{ position: "absolute", top: insets.top + 12, left: 12, right: 12, backgroundColor: "#fff", borderRadius: 10, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, paddingHorizontal: 12, paddingVertical: 10 }}>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<TextInput placeholder="Search events or places" style={{ flex: 1, marginRight: 8 }} />
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
			<DraggableSheet>
				<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
					<Text style={{ fontSize: 22, fontWeight: "700" }}>Events</Text>
					<Link href="/(dashboard)/events/create" asChild>
						<Pressable style={{ backgroundColor: "#1A73E8", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
							<Text style={{ color: "#fff", fontWeight: "600" }}>Create</Text>
						</Pressable>
					</Link>
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
	);
}


