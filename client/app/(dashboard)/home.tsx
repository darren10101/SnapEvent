import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";
import EventPreviewModal from "../../components/EventPreviewModal";

type EventItem = { 
  id: string; 
  name: string; 
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
  description?: string;
};

type Friend = {
  id: string;
  name: string;
  email?: string;
  transportSettings?: {
    mode: string;
    walkingSpeed?: number;
    transitOptions?: string[];
  };
};

type UserStats = {
  totalEvents: number;
  upcomingEvents: number;
  totalFriends: number;
  recentActivities: number;
};

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const theme = useTheme();
	const { user, token } = useAuth();
	const [events, setEvents] = useState<EventItem[]>([]);
	const [friends, setFriends] = useState<Friend[]>([]);
	const [stats, setStats] = useState<UserStats>({
		totalEvents: 0,
		upcomingEvents: 0,
		totalFriends: 0,
		recentActivities: 0
	});
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
	const [showEventPreview, setShowEventPreview] = useState(false);

	// Get current time for filtering upcoming events
	const now = new Date();
	const upcomingEvents = useMemo(() => 
		events.filter(event => new Date(event.start) > now)
			.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
			.slice(0, 3)
	, [events, now]);

	const loadData = async () => {
		if (!user?.id || !token) return;
		
		try {
			// Load user events
			const eventsResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events/user/${user.id}`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			
			if (eventsResponse.ok) {
				const eventsData = await eventsResponse.json();
				setEvents(eventsData.data || []);
				
				// Calculate stats
				const totalEvents = eventsData.data?.length || 0;
				const upcoming = eventsData.data?.filter((e: EventItem) => new Date(e.start) > now).length || 0;
				
				// Load friends count
				const friendsResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${user.id}/friends`, {
					headers: { 'Authorization': `Bearer ${token}` }
				});
				
				let friendsCount = 0;
				if (friendsResponse.ok) {
					const friendsData = await friendsResponse.json();
					friendsCount = friendsData.count || 0;
					setFriends(friendsData.friends || []);
				}
				
				setStats({
					totalEvents,
					upcomingEvents: upcoming,
					totalFriends: friendsCount,
					recentActivities: Math.min(totalEvents, 10) // Mock recent activities
				});
			}
		} catch (error) {
			console.error('Error loading home data:', error);
		}
	};

	useEffect(() => {
		loadData();
	}, [user?.id, token]);

	const onRefresh = async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	};

	const formatEventTime = (dateString: string) => {
		const date = new Date(dateString);
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		
		if (date.toDateString() === today.toDateString()) {
			return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
		} else if (date.toDateString() === tomorrow.toDateString()) {
			return `Tomorrow ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
		} else {
			return date.toLocaleDateString('en-US', { 
				weekday: 'short',
				month: 'short', 
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		}
	};

	const getEventIcon = (eventName: string) => {
		const name = eventName.toLowerCase();
		if (name.includes('coffee') || name.includes('brunch') || name.includes('lunch') || name.includes('dinner')) {
			return 'restaurant';
		} else if (name.includes('game') || name.includes('play')) {
			return 'game-controller';
		} else if (name.includes('run') || name.includes('gym') || name.includes('sport')) {
			return 'fitness';
		} else if (name.includes('meeting') || name.includes('work')) {
			return 'briefcase';
		} else if (name.includes('party') || name.includes('celebration')) {
			return 'musical-notes';
		} else {
			return 'calendar';
		}
	};

	const navigateToEvents = () => {
		router.push('/(dashboard)/events');
	};

	const navigateToFriends = () => {
		router.push('/(dashboard)/friends');
	};

	const handleEventClick = (event: EventItem) => {
		setSelectedEvent(event);
		setShowEventPreview(true);
	};

	const handleEventEdit = (event: EventItem) => {
		setShowEventPreview(false);
		// Navigate to events page which has edit functionality
		router.push('/(dashboard)/events');
	};
	
	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		header: {
			paddingTop: insets.top + 20,
			paddingHorizontal: 20,
			paddingBottom: 20,
		},
		welcomeText: {
			fontSize: 16,
			color: theme.colors.onSurfaceVariant,
			fontFamily: "Montserrat_400Regular",
			marginBottom: 4,
		},
		userName: {
			fontSize: 28,
			fontWeight: "700",
			color: theme.colors.onSurface,
			fontFamily: "Montserrat_700Bold",
		},
		content: {
			flex: 1,
		},
		scrollContent: {
			padding: 20,
			paddingTop: 0,
		},
		statsContainer: {
			marginBottom: 32,
		},
		statsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 12,
		},
		statCard: {
			flex: 1,
			minWidth: '45%',
			backgroundColor: theme.colors.surface,
			borderRadius: 16,
			padding: 20,
			borderWidth: 1,
			borderColor: theme.colors.outline,
			shadowColor: theme.colors.onSurface,
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
			elevation: 3,
		},
		statIconContainer: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: theme.colors.primaryContainer,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 12,
		},
		statNumber: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.colors.onSurface,
			fontFamily: "Montserrat_700Bold",
			marginBottom: 4,
		},
		statLabel: {
			fontSize: 14,
			color: theme.colors.onSurfaceVariant,
			fontFamily: "Montserrat_400Regular",
		},
		sectionHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 16,
			marginTop: 8,
		},
		sectionTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: theme.colors.onSurface,
			fontFamily: "Montserrat_700Bold",
		},
		seeAllButton: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4,
		},
		seeAllText: {
			fontSize: 14,
			color: theme.colors.primary,
			fontFamily: "Montserrat_600SemiBold",
		},
		eventCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 16,
			padding: 20,
			marginBottom: 16,
			borderWidth: 1,
			borderColor: theme.colors.outline,
			shadowColor: theme.colors.onSurface,
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
			elevation: 3,
		},
		eventHeader: {
			flexDirection: "row",
			alignItems: "flex-start",
			marginBottom: 12,
		},
		eventIconContainer: {
			width: 48,
			height: 48,
			borderRadius: 24,
			backgroundColor: theme.colors.primaryContainer,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 16,
		},
		eventInfo: {
			flex: 1,
		},
		eventTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.colors.onSurface,
			fontFamily: "Montserrat_700Bold",
			marginBottom: 4,
		},
		eventTime: {
			fontSize: 14,
			color: theme.colors.primary,
			fontFamily: "Montserrat_600SemiBold",
			marginBottom: 4,
		},
		eventLocation: {
			fontSize: 14,
			color: theme.colors.onSurfaceVariant,
			fontFamily: "Montserrat_400Regular",
		},
		eventFooter: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: theme.colors.outline,
		},
		attendeesContainer: {
			flexDirection: "row",
			alignItems: "center",
		},
		attendeesIcon: {
			marginRight: 6,
		},
		attendeesText: {
			fontSize: 14,
			color: theme.colors.onSurfaceVariant,
			fontFamily: "Montserrat_400Regular",
		},
		eventTypeChip: {
			backgroundColor: theme.colors.secondaryContainer,
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 12,
		},
		eventTypeText: {
			fontSize: 12,
			color: theme.colors.onSecondaryContainer,
			fontFamily: "Montserrat_600SemiBold",
		},
		emptyState: {
			alignItems: 'center',
			padding: 40,
		},
		emptyIcon: {
			marginBottom: 16,
			opacity: 0.5,
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.colors.onSurface,
			fontFamily: "Montserrat_600SemiBold",
			marginBottom: 8,
			textAlign: 'center',
		},
		emptySubtitle: {
			fontSize: 14,
			color: theme.colors.onSurfaceVariant,
			fontFamily: "Montserrat_400Regular",
			textAlign: 'center',
			lineHeight: 20,
		},
		createEventButton: {
			backgroundColor: theme.colors.primary,
			paddingHorizontal: 24,
			paddingVertical: 12,
			borderRadius: 24,
			marginTop: 20,
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
		},
		createEventText: {
			color: theme.colors.onPrimary,
			fontSize: 16,
			fontWeight: "600",
			fontFamily: "Montserrat_600SemiBold",
		},
	});

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.welcomeText}>Welcome back,</Text>
				<Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Friend'}!</Text>
			</View>

			<ScrollView 
				style={styles.content} 
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
			>
				{/* Stats Section */}
				<View style={styles.statsContainer}>
					<View style={styles.statsGrid}>
						<TouchableOpacity style={styles.statCard} onPress={navigateToEvents}>
							<View style={styles.statIconContainer}>
								<Ionicons 
									name="calendar" 
									size={20} 
									color={theme.colors.onPrimaryContainer} 
								/>
							</View>
							<Text style={styles.statNumber}>{stats.upcomingEvents}</Text>
							<Text style={styles.statLabel}>Upcoming Events</Text>
						</TouchableOpacity>
						
						<TouchableOpacity style={styles.statCard} onPress={navigateToFriends}>
							<View style={styles.statIconContainer}>
								<Ionicons 
									name="people" 
									size={20} 
									color={theme.colors.onPrimaryContainer} 
								/>
							</View>
							<Text style={styles.statNumber}>{stats.totalFriends}</Text>
							<Text style={styles.statLabel}>Friends</Text>
						</TouchableOpacity>
						
						<TouchableOpacity style={styles.statCard}>
							<View style={styles.statIconContainer}>
								<Ionicons 
									name="checkmark-circle" 
									size={20} 
									color={theme.colors.onPrimaryContainer} 
								/>
							</View>
							<Text style={styles.statNumber}>{stats.totalEvents}</Text>
							<Text style={styles.statLabel}>Total Events</Text>
						</TouchableOpacity>
						
						<TouchableOpacity style={styles.statCard}>
							<View style={styles.statIconContainer}>
								<Ionicons 
									name="flash" 
									size={20} 
									color={theme.colors.onPrimaryContainer} 
								/>
							</View>
							<Text style={styles.statNumber}>{stats.recentActivities}</Text>
							<Text style={styles.statLabel}>Recent Activity</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Upcoming Events Section */}
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Coming Up</Text>
					{upcomingEvents.length > 0 && (
						<TouchableOpacity style={styles.seeAllButton} onPress={navigateToEvents}>
							<Text style={styles.seeAllText}>See all</Text>
							<Ionicons 
								name="chevron-forward" 
								size={16} 
								color={theme.colors.primary} 
							/>
						</TouchableOpacity>
					)}
				</View>

				{upcomingEvents.length > 0 ? (
					upcomingEvents.map((event) => (
						<TouchableOpacity 
							key={event.id} 
							style={styles.eventCard}
							onPress={() => handleEventClick(event)}
						>
							<View style={styles.eventHeader}>
								<View style={styles.eventIconContainer}>
									<Ionicons 
										name={getEventIcon(event.name) as any}
										size={24} 
										color={theme.colors.onPrimaryContainer} 
									/>
								</View>
								<View style={styles.eventInfo}>
									<Text style={styles.eventTitle}>{event.name}</Text>
									<Text style={styles.eventTime}>{formatEventTime(event.start)}</Text>
									<Text style={styles.eventLocation}>
										{event.location.description || `${event.location.lat.toFixed(3)}, ${event.location.lng.toFixed(3)}`}
									</Text>
								</View>
							</View>
							<View style={styles.eventFooter}>
								<View style={styles.attendeesContainer}>
									<Ionicons 
										name="people" 
										size={16} 
										color={theme.colors.onSurfaceVariant}
										style={styles.attendeesIcon}
									/>
									<Text style={styles.attendeesText}>
										{event.participants.length} {event.participants.length === 1 ? 'person' : 'people'}
									</Text>
								</View>
								<View style={styles.eventTypeChip}>
									<Text style={styles.eventTypeText}>
										{event.createdBy === user?.id ? 'Hosting' : 'Attending'}
									</Text>
								</View>
							</View>
						</TouchableOpacity>
					))
				) : (
					<View style={styles.emptyState}>
						<Ionicons 
							name="calendar-outline" 
							size={64} 
							color={theme.colors.onSurfaceVariant}
							style={styles.emptyIcon}
						/>
						<Text style={styles.emptyTitle}>No upcoming events</Text>
						<Text style={styles.emptySubtitle}>
							Create your first event to start planning amazing gatherings with friends!
						</Text>
						<TouchableOpacity 
							style={styles.createEventButton}
							onPress={navigateToEvents}
						>
							<Ionicons name="add" size={20} color={theme.colors.onPrimary} />
							<Text style={styles.createEventText}>Create Event</Text>
						</TouchableOpacity>
					</View>
				)}
			</ScrollView>

			{/* Event Preview Modal */}
			<EventPreviewModal
				visible={showEventPreview}
				event={selectedEvent}
				friends={friends}
				currentUser={user || undefined}
				token={token || undefined}
				onClose={() => setShowEventPreview(false)}
				onEdit={handleEventEdit}
			/>
		</View>
	);
}


