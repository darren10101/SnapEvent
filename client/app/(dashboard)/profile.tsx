import React from "react";
import { View, Text, Pressable, Alert, ScrollView, Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfileScreen() {
	const insets = useSafeAreaInsets();
	const { user, logout } = useAuth();

	const handleLogout = () => {
		Alert.alert(
			"Sign Out",
			"Are you sure you want to sign out?",
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Sign Out", style: "destructive", onPress: logout }
			]
		);
	};

	if (!user) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Text>Loading...</Text>
			</View>
		);
	}

	return (
		<View style={{ flex: 1, backgroundColor: "#f8f9fa", paddingTop: insets.top }}>
			{/* Header */}
			<View style={{ 
				backgroundColor: "#fff", 
				paddingHorizontal: 20, 
				paddingVertical: 16,
				borderBottomWidth: 1,
				borderBottomColor: "#e5e7eb"
			}}>
				<Text style={{ fontSize: 24, fontWeight: "700", color: "#1f2937" }}>Profile</Text>
			</View>

			<ScrollView style={{ flex: 1 }}>
				{/* Profile Header */}
				<View style={{ 
					backgroundColor: "#fff", 
					alignItems: "center", 
					paddingVertical: 32,
					marginTop: 16,
					marginHorizontal: 16,
					borderRadius: 12,
					elevation: 2,
					shadowColor: '#000',
					shadowOpacity: 0.1,
					shadowRadius: 4,
					shadowOffset: { width: 0, height: 2 }
				}}>
					{user.picture ? (
						<Image 
							source={{ uri: user.picture }} 
							style={{ 
								width: 80, 
								height: 80, 
								borderRadius: 40, 
								marginBottom: 16 
							}} 
						/>
					) : (
						<View style={{ 
							width: 80, 
							height: 80, 
							borderRadius: 40, 
							backgroundColor: "#10B981", 
							justifyContent: "center", 
							alignItems: "center",
							marginBottom: 16
						}}>
							<Text style={{ 
								fontSize: 28, 
								fontWeight: "700", 
								color: "#fff" 
							}}>
								{user.name.charAt(0).toUpperCase()}
							</Text>
						</View>
					)}
					
					<Text style={{ fontSize: 20, fontWeight: "600", color: "#1f2937", marginBottom: 4 }}>
						{user.name}
					</Text>
					<Text style={{ fontSize: 14, color: "#6b7280" }}>
						{user.email}
					</Text>
				</View>

				{/* Sign Out Button */}
				<View style={{ marginHorizontal: 16, marginTop: 24, marginBottom: 32 }}>
					<Pressable 
						onPress={handleLogout}
						style={{ 
							backgroundColor: "#ef4444", 
							paddingVertical: 16, 
							borderRadius: 12, 
							alignItems: "center"
						}}
					>
						<Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Sign Out</Text>
					</Pressable>
				</View>
			</ScrollView>
		</View>
	);
}