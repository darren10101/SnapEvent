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
	
	// Add a third position - minimized (shows only the handle and a bit of content)
	const minimizedTranslateY = maxTranslateY + 300; // 300px further down from collapsed
	const absoluteMaxTranslateY = Math.min(minimizedTranslateY, screenHeight - expandedTop - 60); // Ensure at least 60px remains visible

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
					const next = Math.min(Math.max(0, lastSnap.current + gesture.dy), absoluteMaxTranslateY);
					translateY.setValue(next);
				},
				onPanResponderRelease: (_evt, gesture) => {
					const currentPosition = lastSnap.current + gesture.dy;
					
					// Determine target position based on velocity and current position
					let targetPosition: number;
					
					if (gesture.vy < -0.5) {
						// Fast upward swipe - go to expanded
						targetPosition = 0;
					} else if (gesture.vy > 0.5) {
						// Fast downward swipe - go to next position down
						if (currentPosition < maxTranslateY * 0.7) {
							targetPosition = maxTranslateY; // From expanded to collapsed
						} else {
							targetPosition = absoluteMaxTranslateY; // From collapsed to minimized
						}
					} else {
						// Slow movement - snap to nearest position
						if (currentPosition < maxTranslateY * 0.5) {
							targetPosition = 0; // Expanded
						} else if (currentPosition < (maxTranslateY + absoluteMaxTranslateY) * 0.5) {
							targetPosition = maxTranslateY; // Collapsed
						} else {
							targetPosition = absoluteMaxTranslateY; // Minimized
						}
					}
					
					snapTo(targetPosition);
				},
			}),
		[maxTranslateY, absoluteMaxTranslateY]
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
				<Pressable 
					onPress={() => {
						// Cycle through positions: minimized -> collapsed -> expanded -> minimized
						const currentPos = lastSnap.current;
						if (currentPos >= absoluteMaxTranslateY * 0.9) {
							snapTo(maxTranslateY); // From minimized to collapsed
						} else if (currentPos >= maxTranslateY * 0.9) {
							snapTo(0); // From collapsed to expanded
						} else {
							snapTo(absoluteMaxTranslateY); // From expanded to minimized
						}
					}} 
					style={{ alignItems: "center", paddingVertical: 8 }}
				>
					<View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#E5E7EB" }} />
				</Pressable>
			</View>
			<View style={{ padding: 16, paddingTop: 8, flex: 1 }}>
				{children}
			</View>
		</Animated.View>
	);
}


