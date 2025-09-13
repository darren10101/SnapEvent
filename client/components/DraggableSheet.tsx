import React, { useMemo, useRef } from "react";
import { Animated, Dimensions, PanResponder, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DraggableSheetProps = {
	children: React.ReactNode;
	collapsedHeight?: number; // in px; default ~55% of screen
	topInset?: number; // distance from top when expanded; default safe area top + 8
	containerStyle?: object;
};

export default function DraggableSheet({ children, collapsedHeight, topInset, containerStyle }: DraggableSheetProps) {
	const insets = useSafeAreaInsets();
	const screenHeight = Dimensions.get("window").height;
	const expandedTop = (topInset ?? (insets.top + 8));
	const collapsedH = collapsedHeight ?? Math.floor(screenHeight * 0.55);
	const maxTranslateY = Math.max(0, screenHeight - collapsedH); // 0 = expanded, maxTranslateY = collapsed

	const translateY = useRef(new Animated.Value(maxTranslateY)).current;
	const lastSnap = useRef(maxTranslateY);

	const snapTo = (to: number) => {
		lastSnap.current = to;
		Animated.spring(translateY, {
			toValue: to,
			useNativeDriver: true,
			damping: 25,
			stiffness: 250,
			mass: 0.9,
		}).start();
	};

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dy) > 6,
				onPanResponderGrant: () => {
					translateY.stopAnimation();
				},
				onPanResponderMove: (_evt, gesture) => {
					const next = Math.min(Math.max(0, lastSnap.current + gesture.dy), maxTranslateY);
					translateY.setValue(next);
				},
				onPanResponderRelease: (_evt, gesture) => {
					const shouldExpand = gesture.vy < -0.3 || translateY.__getValue() < maxTranslateY / 2;
					snapTo(shouldExpand ? 0 : maxTranslateY);
				},
			}),
		[maxTranslateY]
	);

	return (
		<Animated.View
			style={[
				{
					position: "absolute",
					left: 0,
					right: 0,
					bottom: 0,
					top: expandedTop,
					transform: [{ translateY }],
					backgroundColor: "#fff",
					borderTopLeftRadius: 16,
					borderTopRightRadius: 16,
					shadowColor: "#000",
					shadowOpacity: 0.1,
					shadowRadius: 8,
					shadowOffset: { width: 0, height: -2 },
					elevation: 5,
				},
				containerStyle,
			]}
		>
			<View {...panResponder.panHandlers}>
				<Pressable onPress={() => snapTo(0)} style={{ alignItems: "center", paddingVertical: 8 }}>
					<View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#E5E7EB" }} />
				</Pressable>
			</View>
			<View style={{ padding: 16, paddingTop: 8, flex: 1 }}>
				{children}
			</View>
		</Animated.View>
	);
}


