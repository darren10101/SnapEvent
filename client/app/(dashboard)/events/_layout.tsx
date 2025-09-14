import React from "react";
import { Stack } from "expo-router";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { View } from "react-native";

export default function EventsLayout() {
	const navigation = useNavigation();

	useFocusEffect(
		React.useCallback(() => {
			const parent = (navigation as any).getParent?.();
			parent?.setOptions?.({ tabBarStyle: { display: "none" } });
			return () => parent?.setOptions?.({ tabBarStyle: undefined });
		}, [navigation])
	);

	return (
		<View style={{ flex: 1 }}>
			<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }} />
		</View>
	);
}


