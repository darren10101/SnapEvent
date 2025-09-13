import React, { useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DraggableSheet from "../../components/DraggableSheet";

type FriendItem = { id: string; name: string; status: string };

export default function FriendsScreen() {
	const insets = useSafeAreaInsets();
	const [friends, setFriends] = useState<FriendItem[]>([
		{ id: "a", name: "Sam Lee", status: "Online" },
		{ id: "b", name: "Riley Chen", status: "Offline" },
		{ id: "c", name: "Jordan Fox", status: "Online" },
	]);

	const onAddFriend = useCallback(() => {
		const id = Math.random().toString(36).slice(2, 7);
		setFriends((prev) => prev.concat({ id, name: `New Friend ${prev.length + 1}`, status: "Pending" }));
	}, []);
	return (
		<View style={{ flex: 1, paddingTop: insets.top + 8 }}>
			<View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E6FFFA" }}>
				<Text style={{ color: "#10B981" }}>Friends map placeholder (Find My style)</Text>
				<Text style={{ color: "#10B981", marginTop: 4 }}>Install react-native-maps to enable the map</Text>
			</View>
			<DraggableSheet>
				<Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Friends</Text>
				{friends.map((f) => (
					<View key={f.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" }}>
						<Text style={{ fontSize: 16, fontWeight: "600" }}>{f.name}</Text>
						<Text style={{ color: "#666" }}>{f.status}</Text>
					</View>
				))}
				<View style={{ alignItems: "center", marginTop: 12 }}>
					<Pressable onPress={onAddFriend} style={{ backgroundColor: "#10B981", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 }}>
						<Text style={{ color: "#fff", fontWeight: "700" }}>+ Add Friend</Text>
					</Pressable>
				</View>
			</DraggableSheet>
		</View>
	);
}


