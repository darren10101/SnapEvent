import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type EventItem = { id: string; title: string; when: string; location: string; attendees: number };

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const [events] = useState<EventItem[]>([
		{ id: "1", title: "Board Game Night", when: "Fri 7pm", location: "Alex's Place", attendees: 5 },
		{ id: "2", title: "Morning Run", when: "Sat 8am", location: "City Park", attendees: 3 },
		{ id: "3", title: "Brunch", when: "Sun 11am", location: "Cafe Bloom", attendees: 6 },
	]);

	const totalEvents = events?.length ?? 0;
	const totalAttendees = useMemo(() => (events ?? []).reduce((sum, e) => sum + e.attendees, 0), [events]);
	return (
		<View style={{ flex: 1, padding: 16, paddingTop: insets.top + 8 }}>
			<Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>Home</Text>
			<Text style={{ fontSize: 16, marginBottom: 8 }}>Upcoming events: {totalEvents}</Text>
			<Text style={{ fontSize: 16, marginBottom: 16 }}>Total attendees: {totalAttendees}</Text>
			<Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>Next up</Text>
			{events.slice(0, 3).map((e) => (
				<View key={e.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" }}>
					<Text style={{ fontSize: 16, fontWeight: "600" }}>{e.title}</Text>
					<Text style={{ color: "#666" }}>{e.when} • {e.location}</Text>
				</View>
			))}
		</View>
	);
}


