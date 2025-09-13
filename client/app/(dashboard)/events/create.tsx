import React, { useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CreateEventScreen() {
	const router = useRouter();
	const navigation = useNavigation();
	const insets = useSafeAreaInsets();

	useEffect(() => {
		const parent = (navigation as any).getParent?.();
		parent?.setOptions?.({ tabBarStyle: { display: "none" } });
		return () => parent?.setOptions?.({ tabBarStyle: undefined });
	}, [navigation]);

	return (
		<View style={{ flex: 1 }}>
			<View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E6F0FF" }}>
				<Text style={{ color: "#1A73E8" }}>Google Map placeholder</Text>
				<Text style={{ color: "#1A73E8", marginTop: 4 }}>Install react-native-maps to enable the map</Text>
			</View>
			<View
				style={{
					position: "absolute",
					top: insets.top + 12,
					left: 12,
					right: 12,
					backgroundColor: "#fff",
					borderRadius: 10,
					elevation: 3,
					shadowColor: "#000",
					shadowOpacity: 0.1,
					shadowRadius: 6,
					shadowOffset: { width: 0, height: 2 },
					paddingHorizontal: 12,
					paddingVertical: 10,
				}}
			>
				<TextInput placeholder="Search places" />
			</View>
			<View style={{ position: "absolute", bottom: 24, left: 16, right: 16 }}>
				<Pressable onPress={() => router.back()} style={{ borderWidth: 1, borderColor: "#1A73E8", paddingVertical: 12, borderRadius: 8, alignItems: "center", backgroundColor: "#fff" }}>
					<Text style={{ color: "#1A73E8", fontWeight: "600" }}>Close</Text>
				</Pressable>
			</View>
		</View>
	);
}


