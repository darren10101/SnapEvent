import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, Image } from 'react-native';

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
};

interface EventPreviewModalProps {
	visible: boolean;
	event: EventItem | null;
	friends: Friend[];
	currentUserId?: string;
	onClose: () => void;
	onEdit: (event: EventItem) => void;
}

export default function EventPreviewModal({
	visible,
	event,
	friends,
	currentUserId,
	onClose,
	onEdit
}: EventPreviewModalProps) {
	if (!event) return null;

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
			.filter(participantId => participantId !== event.createdBy)
			.map(participantId => friends.find(friend => friend.id === participantId))
			.filter((friend): friend is Friend => Boolean(friend));
	};

	const invitedFriends = getInvitedFriends();
	const isCreator = currentUserId === event.createdBy;

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

					{/* Invited Friends */}
					<View style={{ marginBottom: 20 }}>
						<Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
							Invited Friends ({invitedFriends.length})
						</Text>
						{invitedFriends.length > 0 ? (
							<View style={{ backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12 }}>
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
						) : (
							<Text style={{ fontSize: 16, color: '#666', fontStyle: 'italic', padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
								No friends invited
							</Text>
						)}
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