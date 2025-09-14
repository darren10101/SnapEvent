import React, { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Friend = { id: string; name: string; username?: string };

type FriendPickerProps = {
	visible: boolean;
	onClose: () => void;
	friends: Friend[];
	invitedFriendIds: Set<string>;
	onToggleInvite: (friendId: string) => void;
	topOffset?: number;
	onDone?: (selectedFriendIds: string[]) => void;
};

export default function FriendPicker({ visible, onClose, friends, invitedFriendIds, onToggleInvite, topOffset, onDone }: FriendPickerProps) {
	const insets = useSafeAreaInsets();
	const [friendQuery, setFriendQuery] = useState("");

	if (!visible) return null;

	const filteredFriends = friends.filter(f => {
		const q = friendQuery.trim().toLowerCase();
		if (!q) return true;
		return f.name.toLowerCase().includes(q) || (f.username?.toLowerCase().includes(q) ?? false);
	});

	const showNoMatch = friendQuery.trim().length > 0 && filteredFriends.length === 0;

	return (
		<>
			<Pressable
				onPress={onClose}
				style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.12)" }}
			/>
			<View
				style={{
					position: "absolute",
					top: (topOffset ?? 60) + insets.top,
					left: 48,
					right: 48,
					maxHeight: 480,
					backgroundColor: "#fff",
					borderRadius: 12,
					padding: 12,
					elevation: 5,
					shadowColor: "#000",
					shadowOpacity: 0.12,
					shadowRadius: 10,
					shadowOffset: { width: 0, height: 4 },
				}}
			>
				<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
					<Ionicons name="people" size={18} color="#1A73E8" />
					<Text style={{ marginLeft: 6, fontWeight: "700", color: "#1A73E8" }}>Invite friends</Text>
				</View>

				<View style={{ backgroundColor: "#F5F7FB", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 }}>
					<TextInput
						placeholder="Search friends"
						value={friendQuery}
						onChangeText={setFriendQuery}
					/>
				</View>

				{showNoMatch ? (
					<View style={{ paddingVertical: 20, alignItems: "center", justifyContent: "center" }}>
						<Text style={{ color: "#6B7280" }}>You are not friends with this user</Text>
					</View>
				) : (
					<FlatList
						keyboardShouldPersistTaps="handled"
						data={filteredFriends}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => {
							const invited = invitedFriendIds.has(item.id);
							return (
								<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" }}>
									<View>
										<Text style={{ fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
										{item.username ? <Text style={{ color: "#666" }}>@{item.username}</Text> : null}
									</View>
									<Pressable onPress={() => onToggleInvite(item.id)} hitSlop={8} style={{ padding: 6 }}>
										<Ionicons name={invited ? "checkmark" : "add"} size={20} color={invited ? "#22C55E" : "#1A73E8"} />
									</Pressable>
								</View>
							);
						}}
						contentContainerStyle={{ paddingBottom: 6 }}
						style={{ maxHeight: 200 }}
					/>
				)}

				<View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
					<Pressable onPress={() => { onDone?.(Array.from(invitedFriendIds)); onClose(); }} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#1A73E8" }}>
						<Text style={{ color: "#fff", fontWeight: "600" }}>Done</Text>
					</Pressable>
				</View>
			</View>
		</>
	);
}


