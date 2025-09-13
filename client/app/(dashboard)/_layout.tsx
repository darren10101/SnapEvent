import React, { useCallback } from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function DashboardLayout() {
	const screenOptions = useCallback(({ route }: { route: { name: string } }) => ({
		tabBarIcon: ({ color, size }: { color: string; size: number }) => {
			let icon: keyof typeof Ionicons.glyphMap = "home";
			if (route.name === "events") icon = "calendar";
			if (route.name === "friends") icon = "people";
			if (route.name === "profile") icon = "person";
			return <Ionicons name={icon} size={size} color={color} />;
		},
		tabBarActiveTintColor: "#1A73E8",
		tabBarInactiveTintColor: "#8e8e93",
		headerShown: false,
	}), []);

	return (
		<Tabs screenOptions={screenOptions}>
			<Tabs.Screen name="home" options={{ title: "Home" }} />
			<Tabs.Screen name="events" options={{ title: "Events" }} />
			<Tabs.Screen name="friends" options={{ title: "Friends" }} />
			<Tabs.Screen name="profile" options={{ title: "Profile" }} />
		</Tabs>
	);
}


