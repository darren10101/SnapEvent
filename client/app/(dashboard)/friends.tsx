import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, TextInput, Alert, ScrollView, RefreshControl, Modal, Platform, Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import DraggableSheet from "../../components/DraggableSheet";
import { useAuth } from "../../contexts/AuthContext";
import { useFriendTravelTimes } from "../../lib/hooks/useFriendTravelTimes";
import { useTransportSettings } from "../../lib/hooks/useTransportSettings";

type FriendItem = { 
	id: string; 
	name: string; 
	email: string;
	picture?: string;
	status?: string;
	lat?: number;
	lng?: number;
};

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

// Custom Friend Marker Component
const FriendMarker: React.FC<{ friend: FriendItem }> = ({ friend }) => {
	if (friend.picture) {
		return (
			<View style={{
				width: 50,
				height: 50,
				borderRadius: 25,
				backgroundColor: '#fff',
				borderWidth: 3,
				borderColor: '#10B981',
				overflow: 'hidden',
				alignItems: 'center',
				justifyContent: 'center',
				elevation: 5,
				shadowColor: '#000',
				shadowOpacity: 0.3,
				shadowRadius: 5,
				shadowOffset: { width: 0, height: 2 }
			}}>
				<Image 
					source={{ uri: friend.picture }} 
					style={{ 
						width: 44, 
						height: 44, 
						borderRadius: 22 
					}} 
				/>
			</View>
		);
	} else {
		return (
			<View style={{
				width: 50,
				height: 50,
				borderRadius: 25,
				backgroundColor: '#10B981',
				borderWidth: 3,
				borderColor: '#fff',
				alignItems: 'center',
				justifyContent: 'center',
				elevation: 5,
				shadowColor: '#000',
				shadowOpacity: 0.3,
				shadowRadius: 5,
				shadowOffset: { width: 0, height: 2 }
			}}>
				<Text style={{ 
					fontSize: 18, 
					fontWeight: "700", 
					color: "#fff" 
				}}>
					{friend.name.charAt(0).toUpperCase()}
				</Text>
			</View>
		);
	}
};

// Component to display travel time for a friend
const TravelTimeDisplay = ({ friendId, travelData }: { friendId: string, travelData: any }) => {
	if (!travelData) {
		return null;
	}

	if (travelData.isLoading) {
		return (
			<View style={{ alignItems: 'flex-end' }}>
				<Text style={{ fontSize: 12, color: "#666" }}>Calculating...</Text>
			</View>
		);
	}

	if (travelData.error) {
		return (
			<View style={{ alignItems: 'flex-end' }}>
				<Text style={{ fontSize: 12, color: "#FF6B6B" }}>Location unavailable</Text>
			</View>
		);
	}

	if (travelData.fastestOption && travelData.fastestOption.durationText) {
		// Get the appropriate icon for the transport mode
		const getTransportIcon = (mode: string) => {
			switch (mode) {
				case 'driving': return 'car';
				case 'walking': return 'walk';
				case 'transit': return 'bus';
				case 'bicycling': return 'bicycle';
				default: return 'location';
			}
		};

		return (
			<View style={{ alignItems: 'flex-end' }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
					<Ionicons 
						name={getTransportIcon(travelData.fastestOption.mode)} 
						size={14} 
						color="#666" 
						style={{ marginRight: 4 }}
					/>
					<Text style={{ fontSize: 14, color: "#666", fontWeight: '500' }}>
						{travelData.fastestOption.durationText}
					</Text>
				</View>
				<Text style={{ fontSize: 12, color: "#888" }}>
					{travelData.fastestOption.distanceText}
				</Text>
			</View>
		);
	}

	return null;
};

export default function FriendsScreen() {
	const insets = useSafeAreaInsets();
	const [friends, setFriends] = useState<FriendItem[]>([]);
	const [emailInput, setEmailInput] = useState("");
	const [isAddingFriend, setIsAddingFriend] = useState(false);
	const [showAddFriend, setShowAddFriend] = useState(false);
	const [friendRequests, setFriendRequests] = useState<FriendRequestsData>({ received: [], sent: [] });
	const [isLoading, setIsLoading] = useState(false);
	const [isFriendsLoading, setIsFriendsLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent'>('friends');
	const [mapRegion, setMapRegion] = useState({
		latitude: 37.7749, // Default to San Francisco
		longitude: -122.4194,
		latitudeDelta: 0.0922,
		longitudeDelta: 0.0421,
	});
	const { user, token } = useAuth();
	const { friendTravelTimes, calculateTravelTime, recalculateAllTravelTimes } = useFriendTravelTimes();
	
	// Create callback to recalculate travel times when transport modes change
	const handleTransportModesChanged = useCallback(() => {
		console.log('Transport modes changed, recalculating travel times for all friends');
		const friendIds = friends.map(f => f.id);
		recalculateAllTravelTimes(friendIds);
	}, [friends, recalculateAllTravelTimes]);
	
	const { } = useTransportSettings(handleTransportModesChanged);

	const fetchFriends = useCallback(async () => {
		if (!user || !token) return;
		
		setIsFriendsLoading(true);
		try {
			const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${user.id}/friends`, {
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});

			const data = await response.json();
			if (data.success) {
				setFriends(data.data);
				calculateMapRegion(data.data);
			}
		} catch (error) {
			console.error("Error fetching friends:", error);
		} finally {
			setIsFriendsLoading(false);
		}
	}, [user, token]);

	const fetchFriendRequests = useCallback(async () => {
		if (!user || !token) return;
		
		setIsLoading(true);
		try {
			const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${user.id}/friend-requests`, {
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

	const calculateMapRegion = (friendsList: FriendItem[]) => {
		const friendsWithLocation = friendsList.filter(f => f.lat && f.lng);
		
		if (friendsWithLocation.length === 0) {
			return; // Keep default region
		}

		const latitudes = friendsWithLocation.map(f => f.lat!);
		const longitudes = friendsWithLocation.map(f => f.lng!);
		
		const minLat = Math.min(...latitudes);
		const maxLat = Math.max(...latitudes);
		const minLng = Math.min(...longitudes);
		const maxLng = Math.max(...longitudes);
		
		const latDelta = Math.max((maxLat - minLat) * 1.3, 0.01); // Add padding
		const lngDelta = Math.max((maxLng - minLng) * 1.3, 0.01);
		
		setMapRegion({
			latitude: (minLat + maxLat) / 2,
			longitude: (minLng + maxLng) / 2,
			latitudeDelta: latDelta,
			longitudeDelta: lngDelta,
		});
	};

	useEffect(() => {
		fetchFriendRequests();
		fetchFriends();
	}, [fetchFriendRequests, fetchFriends]);

	// Calculate travel times for friends when they are loaded
	useEffect(() => {
		if (friends.length > 0) {
			friends.forEach(friend => {
				if (friend.lat && friend.lng) {
					calculateTravelTime(friend.id);
				}
			});
		}
	}, [friends, calculateTravelTime]);

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
			const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${user.id}/friend-request`, {
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
			const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${user.id}/friend-requests/${requestId}`, {
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
				// If request was accepted, also refresh friends list
				if (action === 'accept') {
					fetchFriends();
				}
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
			<View style={{ flex: 1 }}>
				<MapView
					style={{ flex: 1 }}
					initialRegion={mapRegion}
					showsUserLocation={true}
					showsMyLocationButton={true}
				>
					{/* Display friends as markers */}
					{friends
						.filter(friend => friend.lat && friend.lng) // Only show friends with valid coordinates
						.map((friend) => (
							<Marker
								key={friend.id}
								coordinate={{
									latitude: friend.lat!,
									longitude: friend.lng!,
								}}
								title={friend.name}
								description={`📧 ${friend.email}`}
							>
								<FriendMarker friend={friend} />
							</Marker>
						))
					}
				</MapView>
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
							Friends ({friends.filter(f => f.lat && f.lng).length})
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
						<RefreshControl 
							refreshing={isLoading || isFriendsLoading} 
							onRefresh={() => {
								fetchFriendRequests();
								fetchFriends();
							}} 
						/>
					}
				>
					{activeTab === 'friends' && (
						<>
							<Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
								Friends {friends.filter(f => f.lat && f.lng).length > 0 && 
									`(${friends.filter(f => f.lat && f.lng).length})`
								}
							</Text>
							{isFriendsLoading ? (
								<Text style={{ color: "#666", textAlign: 'center', paddingVertical: 20 }}>Loading friends...</Text>
							) : friends.length === 0 ? (
								<Text style={{ color: "#666", textAlign: 'center', paddingVertical: 20 }}>No friends yet. Send friend requests to get started!</Text>
							) : (
								friends.map((f) => (
									<View key={f.id} style={{ 
										paddingVertical: 12, 
										borderBottomWidth: 1, 
										borderColor: "#eee",
										flexDirection: 'row',
										alignItems: 'center'
									}}>
										{f.picture ? (
											<Image 
												source={{ uri: f.picture }} 
												style={{ 
													width: 40, 
													height: 40, 
													borderRadius: 20, 
													marginRight: 12 
												}} 
											/>
										) : (
											<View style={{ 
												width: 40, 
												height: 40, 
												borderRadius: 20, 
												backgroundColor: "#10B981", 
												justifyContent: "center", 
												alignItems: "center",
												marginRight: 12
											}}>
												<Text style={{ 
													fontSize: 16, 
													fontWeight: "700", 
													color: "#fff" 
												}}>
													{f.name.charAt(0).toUpperCase()}
												</Text>
											</View>
										)}
										<View style={{ flex: 1 }}>
											<Text style={{ fontSize: 16, fontWeight: "600" }}>{f.name}</Text>
											<Text style={{ color: "#666", fontSize: 14 }}>{f.email}</Text>
										</View>
										<TravelTimeDisplay 
											friendId={f.id} 
											travelData={friendTravelTimes.get(f.id)} 
										/>
									</View>
								))
							)}
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
					right: 24,
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


