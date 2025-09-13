import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, useTheme } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";

type EventItem = { id: string; title: string; when: string; location: string; attendees: number };

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const theme = useTheme();
	const [events] = useState<EventItem[]>([
		{ id: "1", title: "Board Game Night", when: "Fri 7pm", location: "Alex's Place", attendees: 5 },
		{ id: "2", title: "Morning Run", when: "Sat 8am", location: "City Park", attendees: 3 },
		{ id: "3", title: "Brunch", when: "Sun 11am", location: "Cafe Bloom", attendees: 6 },
	]);

	const totalEvents = events?.length ?? 0;
	const totalAttendees = useMemo(() => (events ?? []).reduce((sum, e) => sum + e.attendees, 0), [events]);
	
	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
			paddingTop: insets.top,
		},
		header: {
			backgroundColor: theme.colors.surface,
			paddingHorizontal: 20,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outline,
		},
		headerTitle: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.colors.onSurface,
			fontFamily: "Montserrat_700Bold",
		},
		content: {
			flex: 1,
			padding: 20,
		},
		statsContainer: {
			flexDirection: "row",
			marginBottom: 24,
			gap: 12,
		},
		statCard: {
			flex: 1,
			backgroundColor: theme.colors.primaryContainer,
			borderRadius: 12,
			padding: 16,
			alignItems: "center",
		},
		statNumber: {
			fontSize: 24,
			fontWeight: "700",
			color: theme.colors.onPrimaryContainer,
			fontFamily: "Montserrat_700Bold",
		},
		statLabel: {
			fontSize: 12,
			color: theme.colors.onPrimaryContainer,
			fontFamily: "Montserrat_400Regular",
			marginTop: 4,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.colors.onSurface,
			fontFamily: "Montserrat_700Bold",
			marginBottom: 16,
		},
		eventCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
			borderWidth: 1,
			borderColor: theme.colors.outline,
			shadowColor: theme.colors.onSurface,
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.1,
			shadowRadius: 3,
			elevation: 2,
		},
		eventHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 8,
		},
		eventIcon: {
			marginRight: 12,
			backgroundColor: theme.colors.primaryContainer,
			borderRadius: 20,
			padding: 8,
		},
		eventTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: theme.colors.onSurface,
			fontFamily: "Montserrat_700Bold",
			flex: 1,
		},
		eventDetails: {
			marginLeft: 48,
		},
		eventTime: {
			fontSize: 14,
			color: theme.colors.primary,
			fontFamily: "Montserrat_400Regular",
			marginBottom: 4,
		},
		eventLocation: {
			fontSize: 14,
			color: theme.colors.onSurfaceVariant,
			fontFamily: "Montserrat_400Regular",
		},
		attendeesContainer: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 8,
			marginLeft: 48,
		},
		attendeesIcon: {
			marginRight: 6,
		},
		attendeesText: {
			fontSize: 12,
			color: theme.colors.onSurfaceVariant,
			fontFamily: "Montserrat_400Regular",
		},
	});

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Home</Text>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Stats Section */}
				<View style={styles.statsContainer}>
					<View style={styles.statCard}>
						<Text style={styles.statNumber}>{totalEvents}</Text>
						<Text style={styles.statLabel}>Upcoming Events</Text>
					</View>
					<View style={styles.statCard}>
						<Text style={styles.statNumber}>{totalAttendees}</Text>
						<Text style={styles.statLabel}>Total Attendees</Text>
					</View>
				</View>

				{/* Events Section */}
				<Text style={styles.sectionTitle}>Next up</Text>
				{events.slice(0, 3).map((event) => (
					<View key={event.id} style={styles.eventCard}>
						<View style={styles.eventHeader}>
							<View style={styles.eventIcon}>
								<Ionicons 
									name="calendar" 
									size={20} 
									color={theme.colors.onPrimaryContainer} 
								/>
							</View>
							<Text style={styles.eventTitle}>{event.title}</Text>
						</View>
						<View style={styles.eventDetails}>
							<Text style={styles.eventTime}>{event.when}</Text>
							<Text style={styles.eventLocation}>{event.location}</Text>
							<View style={styles.attendeesContainer}>
								<Ionicons 
									name="people" 
									size={14} 
									color={theme.colors.onSurfaceVariant}
									style={styles.attendeesIcon}
								/>
								<Text style={styles.attendeesText}>
									{event.attendees} {event.attendees === 1 ? 'attendee' : 'attendees'}
								</Text>
							</View>
						</View>
					</View>
				))}
			</ScrollView>
		</View>
	);
}


