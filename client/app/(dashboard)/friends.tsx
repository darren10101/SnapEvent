import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, TextInput, Alert, ScrollView, RefreshControl, Modal } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DraggableSheet from "../../components/DraggableSheet";
import { useAuth } from "../../contexts/AuthContext";

type FriendItem = { id: string; name: string; status: string };

type FriendRequest = {
	id: string;
	from?: string;
	fromName?: string;
	fromEmail?: string;
	fromPicture?: string;
	to?: string;
	toName?: string;
	toEmail?: string;
	toPicture?: string;
	createdAt: string;
	status: string;
};

type FriendRequestsData = {
	received: FriendRequest[];
	sent: FriendRequest[];
};

export default function FriendsScreen() {
	const insets = useSafeAreaInsets();
	const [friends, setFriends] = useState<FriendItem[]>([
		{ id: "a", name: "Sam Lee", status: "Online" },
		{ id: "b", name: "Riley Chen", status: "Offline" },
		{ id: "c", name: "Jordan Fox", status: "Online" },
	]);
	const [emailInput, setEmailInput] = useState("");
	const [isAddingFriend, setIsAddingFriend] = useState(false);
	const [showAddFriend, setShowAddFriend] = useState(false);
	const [friendRequests, setFriendRequests] = useState<FriendRequestsData>({ received: [], sent: [] });
	const [isLoading, setIsLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent'>('friends');
	const { user, token } = useAuth();

	const fetchFriendRequests = useCallback(async () => {
		if (!user || !token) return;
		
		setIsLoading(true);
		try {
			const response = await fetch(`http://10.37.96.184:3000/api/users/${user.id}/friend-requests`, {
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});

			const data = await response.json();
			if (data.success) {
				setFriendRequests(data.data);
			}
		} catch (error) {
			console.error("Error fetching friend requests:", error);
		} finally {
			setIsLoading(false);
		}
	}, [user, token]);

	useEffect(() => {
		fetchFriendRequests();
	}, [fetchFriendRequests]);

	const sendFriendRequest = async () => {
		if (!emailInput.trim()) {
			Alert.alert("Error", "Please enter an email address");
			return;
		}

		if (!user || !token) {
			Alert.alert("Error", "You must be logged in to send friend requests");
			return;
		}

		// Check if user is trying to add themselves
		if (emailInput.trim().toLowerCase() === user.email.toLowerCase()) {
			Alert.alert("Error", "You cannot send a friend request to yourself");
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
				setShowAddFriend(false);
				// Refresh friend requests to show the new sent request
				fetchFriendRequests();
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

	const handleFriendRequest = async (requestId: string, action: 'accept' | 'decline') => {
		if (!user || !token) return;

		try {
			const response = await fetch(`http://10.37.96.184:3000/api/users/${user.id}/friend-requests/${requestId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({ action })
			});

			const data = await response.json();
			if (data.success) {
				Alert.alert("Success", data.message);
				// Refresh friend requests
				fetchFriendRequests();
			} else {
				Alert.alert("Error", data.error || `Failed to ${action} friend request`);
			}
		} catch (error) {
			console.error(`Error ${action}ing friend request:`, error);
			Alert.alert("Error", `Failed to ${action} friend request. Please try again.`);
		}
	};

	const onAddFriend = useCallback(() => {
		setShowAddFriend(true);
	}, []);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString();
	};

	const renderFriendRequests = (requests: FriendRequest[], type: 'received' | 'sent') => {
		if (requests.length === 0) {
			return (
				<View style={{ padding: 20, alignItems: 'center' }}>
					<Text style={{ color: '#666', fontSize: 16 }}>
						No {type} requests
					</Text>
				</View>
			);
		}

		return requests.map((request) => (
			<View key={request.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" }}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
					<View style={{ flex: 1 }}>
						<Text style={{ fontSize: 16, fontWeight: "600" }}>
							{type === 'received' ? request.fromName : request.toName}
						</Text>
						<Text style={{ color: "#666", fontSize: 14 }}>
							{type === 'received' ? request.fromEmail : request.toEmail}
						</Text>
						<Text style={{ color: "#999", fontSize: 12 }}>
							{formatDate(request.createdAt)}
						</Text>
					</View>
					{type === 'received' && (
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<Pressable 
								onPress={() => handleFriendRequest(request.id, 'accept')}
								style={{ 
									backgroundColor: "#10B981", 
									paddingHorizontal: 12, 
									paddingVertical: 6, 
									borderRadius: 6 
								}}
							>
								<Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Accept</Text>
							</Pressable>
							<Pressable 
								onPress={() => handleFriendRequest(request.id, 'decline')}
								style={{ 
									backgroundColor: "#EF4444", 
									paddingHorizontal: 12, 
									paddingVertical: 6, 
									borderRadius: 6 
								}}
							>
								<Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Decline</Text>
							</Pressable>
						</View>
					)}
					{type === 'sent' && (
						<View style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
							<Text style={{ color: "#999", fontSize: 12 }}>Pending</Text>
						</View>
					)}
				</View>
			</View>
		));
	};

	return (
		<View style={{ flex: 1, paddingTop: insets.top + 8 }}>
			<View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E6FFFA" }}>
				<Text style={{ color: "#10B981" }}>Friends map placeholder (Find My style)</Text>
				<Text style={{ color: "#10B981", marginTop: 4 }}>Install react-native-maps to enable the map</Text>
			</View>
			<DraggableSheet>
				{/* Tab Navigation */}
				<View style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: '#F5F5F5', borderRadius: 8, padding: 2 }}>
					<Pressable 
						onPress={() => setActiveTab('friends')}
						style={{ 
							flex: 1, 
							paddingVertical: 8, 
							alignItems: 'center',
							backgroundColor: activeTab === 'friends' ? '#fff' : 'transparent',
							borderRadius: 6
						}}
					>
						<Text style={{ fontWeight: activeTab === 'friends' ? '700' : '500', color: activeTab === 'friends' ? '#10B981' : '#666' }}>
							Friends
						</Text>
					</Pressable>
					<Pressable 
						onPress={() => setActiveTab('received')}
						style={{ 
							flex: 1, 
							paddingVertical: 8, 
							alignItems: 'center',
							backgroundColor: activeTab === 'received' ? '#fff' : 'transparent',
							borderRadius: 6
						}}
					>
						<Text style={{ fontWeight: activeTab === 'received' ? '700' : '500', color: activeTab === 'received' ? '#10B981' : '#666' }}>
							Received Requests ({friendRequests.received.length})
						</Text>
					</Pressable>
					<Pressable 
						onPress={() => setActiveTab('sent')}
						style={{ 
							flex: 1, 
							paddingVertical: 8, 
							alignItems: 'center',
							backgroundColor: activeTab === 'sent' ? '#fff' : 'transparent',
							borderRadius: 6
						}}
					>
						<Text style={{ fontWeight: activeTab === 'sent' ? '700' : '500', color: activeTab === 'sent' ? '#10B981' : '#666' }}>
							Sent Requests ({friendRequests.sent.length})
						</Text>
					</Pressable>
				</View>

				<ScrollView 
					style={{ maxHeight: 300 }}
					refreshControl={
						<RefreshControl refreshing={isLoading} onRefresh={fetchFriendRequests} />
					}
				>
					{activeTab === 'friends' && (
						<>
							<Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Friends</Text>
							{friends.map((f) => (
								<View key={f.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" }}>
									<Text style={{ fontSize: 16, fontWeight: "600" }}>{f.name}</Text>
									<Text style={{ color: "#666" }}>{f.status}</Text>
								</View>
							))}
						</>
					)}

					{activeTab === 'received' && (
						<>
							<Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Friend Requests</Text>
							{renderFriendRequests(friendRequests.received, 'received')}
						</>
					)}

					{activeTab === 'sent' && (
						<>
							<Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Sent Requests</Text>
							{renderFriendRequests(friendRequests.sent, 'sent')}
						</>
					)}
				</ScrollView>
			</DraggableSheet>

			{/* Floating Action Button */}
			<Pressable 
				onPress={onAddFriend} 
				style={{ 
					position: 'absolute',
					bottom: insets.bottom - 20,
					right: 20,
					width: 56,
					height: 56,
					backgroundColor: "#10B981",
					borderRadius: 28,
					justifyContent: 'center',
					alignItems: 'center',
					elevation: 8,
					shadowColor: '#000',
					shadowOpacity: 0.3,
					shadowRadius: 8,
					shadowOffset: { width: 0, height: 4 }
				}}
			>
				<Ionicons name="add" size={24} color="#fff" />
			</Pressable>

			{/* Add Friend Modal */}
			<Modal
				visible={showAddFriend}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setShowAddFriend(false)}
			>
				<View style={{ 
					flex: 1, 
					backgroundColor: 'rgba(0,0,0,0.5)', 
					justifyContent: 'center', 
					alignItems: 'center',
					padding: 20
				}}>
					<View style={{ 
						backgroundColor: '#fff', 
						borderRadius: 12, 
						padding: 20, 
						width: '100%',
						maxWidth: 400,
						elevation: 5,
						shadowColor: '#000',
						shadowOpacity: 0.25,
						shadowRadius: 10,
						shadowOffset: { width: 0, height: 4 }
					}}>
						<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
							<Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981' }}>Add Friend</Text>
							<Pressable 
								onPress={() => setShowAddFriend(false)}
								style={{ padding: 4 }}
							>
								<Ionicons name="close" size={24} color="#666" />
							</Pressable>
						</View>
						
						<Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
							Enter the email address of the person you'd like to add as a friend.
						</Text>
						
						<TextInput
							placeholder="Enter email address"
							value={emailInput}
							onChangeText={setEmailInput}
							style={{ 
								backgroundColor: "#F5F5F5", 
								borderRadius: 8, 
								paddingHorizontal: 12, 
								paddingVertical: 12,
								borderWidth: 1,
								borderColor: "#E5E7EB",
								fontSize: 16,
								marginBottom: 16
							}}
							keyboardType="email-address"
							autoCapitalize="none"
							autoFocus={true}
						/>
						
						<View style={{ flexDirection: 'row', gap: 12 }}>
							<Pressable 
								onPress={() => setShowAddFriend(false)}
								style={{ 
									flex: 1,
									backgroundColor: "#F3F4F6", 
									paddingVertical: 12, 
									borderRadius: 8,
									alignItems: 'center'
								}}
							>
								<Text style={{ color: "#666", fontSize: 16, fontWeight: "600" }}>Cancel</Text>
							</Pressable>
							
							<Pressable 
								onPress={sendFriendRequest} 
								disabled={isAddingFriend || !emailInput.trim()}
								style={{ 
									flex: 1,
									backgroundColor: (isAddingFriend || !emailInput.trim()) ? "#9CA3AF" : "#10B981", 
									paddingVertical: 12, 
									borderRadius: 8,
									alignItems: 'center'
								}}
							>
								<Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
									{isAddingFriend ? "Sending..." : "Send Request"}
								</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}


