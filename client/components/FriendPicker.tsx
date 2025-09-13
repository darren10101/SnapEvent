import React, { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";

type Friend = { id: string; name: string; username?: string };

type FriendPickerProps = {
	visible: boolean;
	onClose: () => void;
	friends: Friend[];
	invitedFriendIds: Set<string>;
	onToggleInvite: (friendId: string) => void;
	topOffset?: number;
};

export default function FriendPicker({ visible, onClose, friends, invitedFriendIds, onToggleInvite, topOffset }: FriendPickerProps) {
	const insets = useSafeAreaInsets();
	const [friendQuery, setFriendQuery] = useState("");
	const [emailInput, setEmailInput] = useState("");
	const [isAddingFriend, setIsAddingFriend] = useState(false);
	const { user, token } = useAuth();

	if (!visible) return null;

	const filteredFriends = friends.filter(f => {
		const q = friendQuery.trim().toLowerCase();
		if (!q) return true;
		return f.name.toLowerCase().includes(q) || (f.username?.toLowerCase().includes(q) ?? false);
	});

	const sendFriendRequest = async () => {
		if (!emailInput.trim()) {
			Alert.alert("Error", "Please enter an email address");
			return;
		}

		if (!user || !token) {
			Alert.alert("Error", "You must be logged in to send friend requests");
			return;
		}

		setIsAddingFriend(true);
		try {
			const response = await fetch(`http://10.37.96.184:3000/api/users/${user.id}/friend-request`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({
					email: emailInput.trim()
				})
			});

			const data = await response.json();

			if (data.success) {
				Alert.alert("Success", data.message);
				setEmailInput("");
			} else {
				Alert.alert("Error", data.error || "Failed to send friend request");
			}
		} catch (error) {
			console.error("Error sending friend request:", error);
			Alert.alert("Error", "Failed to send friend request. Please try again.");
		} finally {
			setIsAddingFriend(false);
		}
	};

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
				
				{/* Add friend by email section */}
				<View style={{ marginBottom: 12, padding: 12, backgroundColor: "#F0F9FF", borderRadius: 8 }}>
					<Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#1A73E8" }}>Add friend by email</Text>
					<View style={{ flexDirection: "row", gap: 8 }}>
						<TextInput
							placeholder="Enter email address"
							value={emailInput}
							onChangeText={setEmailInput}
							style={{ 
								flex: 1, 
								backgroundColor: "#fff", 
								borderRadius: 6, 
								paddingHorizontal: 10, 
								paddingVertical: 8,
								borderWidth: 1,
								borderColor: "#E5E7EB"
							}}
							keyboardType="email-address"
							autoCapitalize="none"
						/>
						<Pressable 
							onPress={sendFriendRequest} 
							disabled={isAddingFriend}
							style={{ 
								backgroundColor: isAddingFriend ? "#9CA3AF" : "#1A73E8", 
								paddingHorizontal: 12, 
								paddingVertical: 8, 
								borderRadius: 6,
								justifyContent: "center"
							}}
						>
							<Ionicons name="add" size={16} color="#fff" />
						</Pressable>
					</View>
				</View>

				<View style={{ backgroundColor: "#F5F7FB", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 }}>
					<TextInput
						placeholder="Search friends"
						value={friendQuery}
						onChangeText={setFriendQuery}
					/>
				</View>
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
				<View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
					<Pressable onPress={onClose} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#1A73E8" }}>
						<Text style={{ color: "#fff", fontWeight: "600" }}>Done</Text>
					</Pressable>
				</View>
			</View>
		</>
	);
}


