import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Image } from 'react-native';
import EventSchedule from './EventSchedule';

type EventItem = {
	id: string;
	name: string;
	description?: string;
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

type Friend = {
	id: string;
	name: string;
	email?: string;
	picture?: string;
	lat?: number;
	lng?: number;
};

type User = {
	id: string;
	name: string;
	email?: string;
	picture?: string;
	lat?: number;
	lng?: number;
	latitude?: number;
	longitude?: number;
};

interface EventPreviewModalProps {
	visible: boolean;
	event: EventItem | null;
	friends: Friend[];
	currentUser?: User;
	token?: string;
	onClose: () => void;
	onEdit: (event: EventItem) => void;
}

export default function EventPreviewModal({
	visible,
	event,
	friends,
	currentUser,
	token,
	onClose,
	onEdit
}: EventPreviewModalProps) {
	const [participantUsers, setParticipantUsers] = useState<Record<string, User>>({});
	const [loadingParticipants, setLoadingParticipants] = useState(false);

	if (!event) return null;

	// Fetch user details for unknown participants
	useEffect(() => {
		const fetchParticipantDetails = async () => {
			if (!token || !event) return;
			
			const unknownParticipants = event.participants.filter(participantId => {
				// Skip if it's current user or already in friends list or already fetched
				return participantId !== currentUser?.id && 
					   !friends.find(f => f.id === participantId) &&
					   !participantUsers[participantId];
			});

			if (unknownParticipants.length === 0) return;

			setLoadingParticipants(true);
			try {
				const userPromises = unknownParticipants.map(async (participantId) => {
					const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${participantId}`, {
						headers: { 'Authorization': `Bearer ${token}` }
					});
					if (response.ok) {
						const userData = await response.json();
						return { id: participantId, user: userData.data };
					}
					return { id: participantId, user: null };
				});

				const results = await Promise.all(userPromises);
				const newParticipantUsers: Record<string, User> = {};
				
				results.forEach(({ id, user }) => {
					if (user) {
						newParticipantUsers[id] = user;
					}
				});

				setParticipantUsers(prev => ({ ...prev, ...newParticipantUsers }));
			} catch (error) {
				console.error('Error fetching participant details:', error);
			} finally {
				setLoadingParticipants(false);
			}
		};

		fetchParticipantDetails();
	}, [event?.participants, token, currentUser?.id, friends]);

	const formatDateTime = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	};

	const formatLocation = (location: { lat: number; lng: number; description?: string }) => {
		return location.description || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
	};

	const getInvitedFriends = () => {
		return event.participants
			.filter(participantId => participantId !== currentUser?.id) // Filter out current user
			.map(participantId => {
				// First try to find in friends list
				const friend = friends.find(friend => friend.id === participantId);
				if (friend) return friend;
				
				// Then try fetched participant users
				const fetchedUser = participantUsers[participantId];
				if (fetchedUser) return fetchedUser;
				
				// If still not found, create a placeholder (this will be replaced once data is fetched)
				return {
					id: participantId,
					name: loadingParticipants ? 'Loading...' : `User ${participantId.slice(-4)}`,
					email: ''
				};
			});
	};

	const invitedFriends = getInvitedFriends();
	const isCreator = currentUser?.id === event.createdBy;

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<View style={{ flex: 1, backgroundColor: '#fff' }}>
				<ScrollView style={{ flex: 1, padding: 20 }}>
					{/* Header */}
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
						<Text style={{ fontSize: 24, fontWeight: '700', flex: 1 }}>Event Details</Text>
						<Pressable onPress={onClose}>
							<Text style={{ fontSize: 16, color: '#666' }}>✕</Text>
						</Pressable>
					</View>

					{/* Event Title */}
					<View style={{ marginBottom: 20 }}>
						<Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 4 }}>Event Name</Text>
						<Text style={{ fontSize: 16, color: '#333', padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
							{event.name}
						</Text>
					</View>

					{/* Event Description */}
					{event.description && (
						<View style={{ marginBottom: 20 }}>
							<Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 4 }}>Description</Text>
							<Text style={{ fontSize: 16, color: '#333', padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8, minHeight: 80 }}>
								{event.description}
							</Text>
						</View>
					)}

					{/* Location */}
					<View style={{ marginBottom: 20 }}>
						<Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 4 }}>Location</Text>
						<Text style={{ fontSize: 16, color: '#333', padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
							{formatLocation(event.location)}
						</Text>
					</View>

					{/* Start Date & Time */}
					<View style={{ marginBottom: 20 }}>
						<Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 4 }}>Start Date & Time</Text>
						<Text style={{ fontSize: 16, color: '#333', padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
							{formatDateTime(event.start)}
						</Text>
					</View>

					{/* End Date & Time */}
					<View style={{ marginBottom: 20 }}>
						<Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 4 }}>End Date & Time</Text>
						<Text style={{ fontSize: 16, color: '#333', padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
							{formatDateTime(event.end)}
						</Text>
					</View>

					{/* Participants */}
					<View style={{ marginBottom: 20 }}>
						<Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
							Participants ({event.participants.length})
						</Text>
						<View style={{ backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12 }}>
							{/* Current User (if participating) */}
							{currentUser && event.participants.includes(currentUser.id) && (
								<View style={{ 
									flexDirection: 'row', 
									alignItems: 'center', 
									paddingVertical: 8,
									borderBottomWidth: invitedFriends.length > 0 ? 1 : 0,
									borderBottomColor: '#e9ecef',
									backgroundColor: '#f0f9ff',
									marginHorizontal: -12,
									paddingHorizontal: 12,
									borderRadius: 6
								}}>
									<View style={{ 
										width: 32, 
										height: 32, 
										borderRadius: 16, 
										backgroundColor: currentUser.picture ? "transparent" : "#1A73E8", 
										justifyContent: 'center', 
										alignItems: 'center', 
										marginRight: 12,
										overflow: "hidden",
										borderWidth: 2,
										borderColor: "#1A73E8"
									}}>
										{currentUser.picture ? (
											<Image
												source={{ uri: currentUser.picture }}
												style={{ width: 28, height: 28, borderRadius: 14 }}
											/>
										) : (
											<Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
												{currentUser.name.charAt(0).toUpperCase()}
											</Text>
										)}
									</View>
									<View style={{ flex: 1 }}>
										<Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
											{currentUser.name} {isCreator ? '(You - Creator)' : '(You)'}
										</Text>
										{currentUser.email && (
											<Text style={{ fontSize: 14, color: '#6B7280' }}>
												{currentUser.email}
											</Text>
										)}
									</View>
									{isCreator && (
										<View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#1A73E8", borderRadius: 12 }}>
											<Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>Creator</Text>
										</View>
									)}
								</View>
							)}

							{/* Other Participants */}
							{invitedFriends.map((friend, index) => (
									<View key={friend.id} style={{ 
										flexDirection: 'row', 
										alignItems: 'center', 
										paddingVertical: 8,
										borderBottomWidth: index < invitedFriends.length - 1 ? 1 : 0,
										borderBottomColor: '#e9ecef'
									}}>
										<View style={{ 
											width: 32, 
											height: 32, 
											borderRadius: 16, 
											backgroundColor: friend.picture ? "transparent" : "#1A73E8", 
											justifyContent: 'center', 
											alignItems: 'center', 
											marginRight: 12,
											overflow: "hidden"
										}}>
											{friend.picture ? (
												<Image
													source={{ uri: friend.picture }}
													style={{ width: 32, height: 32, borderRadius: 16 }}
												/>
											) : (
												<Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
													{friend.name.charAt(0).toUpperCase()}
												</Text>
											)}
										</View>
										<Text style={{ fontSize: 16, color: '#333' }}>{friend.name}</Text>
									</View>
								))}
						</View>
					</View>

					{/* Proposed Travel Schedules */}
					<View style={{ marginBottom: 20 }}>
						<EventSchedule
							eventId={event.id}
							invitedFriends={[
								...(currentUser ? [{
									id: currentUser.id,
									name: currentUser.name,
									picture: currentUser.picture,
									lat: currentUser.lat || currentUser.latitude,
									lng: currentUser.lng || currentUser.longitude
								}] : []),
								...invitedFriends
							]}
							eventLocation={event.location}
							eventStart={event.start}
							eventEnd={event.end}
							token={token}
							isEditing={false}
						/>
					</View>

					{/* Event Creator Info */}
					<View style={{ marginBottom: 30 }}>
						<Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
							{isCreator ? 'You created this event' : 'You were invited to this event'}
						</Text>
						<Text style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 4 }}>
							Created on {new Date(event.createdAt).toLocaleDateString()}
						</Text>
					</View>
				</ScrollView>

				{/* Action Buttons */}
				<View style={{ 
					flexDirection: 'row', 
					padding: 20, 
					gap: 12,
					borderTopWidth: 1,
					borderTopColor: '#e9ecef'
				}}>
					<Pressable
						onPress={onClose}
						style={{
							flex: 1,
							paddingVertical: 12,
							borderRadius: 8,
							borderWidth: 1,
							borderColor: '#ddd',
							alignItems: 'center'
						}}
					>
						<Text style={{ fontSize: 16, fontWeight: '600', color: '#666' }}>Close</Text>
					</Pressable>
					
					{isCreator && (
						<Pressable
							onPress={() => onEdit(event)}
							style={{
								flex: 1,
								paddingVertical: 12,
								borderRadius: 8,
								backgroundColor: '#1A73E8',
								alignItems: 'center'
							}}
						>
							<Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Edit Event</Text>
						</Pressable>
					)}
				</View>
			</View>
		</Modal>
	);
}