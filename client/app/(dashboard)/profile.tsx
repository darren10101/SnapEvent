import React from "react";
import { View, Text, Pressable, Alert, ScrollView, Image, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";
import { TRANSPORT_MODES } from "../../lib/transportSettings";
import { useTransportSettings } from "../../lib/hooks/useTransportSettings";

export default function ProfileScreen() {
	const insets = useSafeAreaInsets();
	const theme = useTheme();
	const { user, logout } = useAuth();
	const { 
		transportModes: selectedTransportModes, 
		loading: transportLoading, 
		error: transportError, 
		toggleTransportMode 
	} = useTransportSettings();

	// Transportation modes
	const transportModesList = Object.entries(TRANSPORT_MODES).map(([id, config]) => ({
		id: id as keyof typeof TRANSPORT_MODES,
		...config
	}));

	const handleToggleTransportMode = async (modeId: keyof typeof TRANSPORT_MODES) => {
		try {
			await toggleTransportMode(modeId);
		} catch (error) {
			Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update transportation modes');
		}
	};

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.surfaceVariant,
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
		profileCard: {
			backgroundColor: theme.colors.surface,
			alignItems: "center",
			paddingVertical: 32,
			marginTop: 16,
			marginHorizontal: 16,
			borderRadius: 12,
			elevation: 2,
			shadowColor: theme.colors.onSurface,
			shadowOpacity: 0.1,
			shadowRadius: 4,
			shadowOffset: { width: 0, height: 2 },
		},
		avatar: {
			width: 80,
			height: 80,
			borderRadius: 40,
			marginBottom: 16,
		},
		avatarPlaceholder: {
			width: 80,
			height: 80,
			borderRadius: 40,
			backgroundColor: theme.colors.primary,
			justifyContent: "center",
			alignItems: "center",
			marginBottom: 16,
		},
		avatarText: {
			fontSize: 28,
			fontWeight: "700",
			color: theme.colors.onPrimary,
			fontFamily: "Montserrat_700Bold",
		},
		userName: {
			fontSize: 20,
			fontWeight: "600",
			color: theme.colors.onSurface,
			marginBottom: 4,
			fontFamily: "Montserrat_700Bold",
		},
		userEmail: {
			fontSize: 14,
			color: theme.colors.onSurfaceVariant,
			fontFamily: "Montserrat_400Regular",
		},
		settingsCard: {
			backgroundColor: theme.colors.surface,
			marginHorizontal: 16,
			marginTop: 16,
			borderRadius: 12,
			elevation: 2,
			shadowColor: theme.colors.onSurface,
			shadowOpacity: 0.1,
			shadowRadius: 4,
			shadowOffset: { width: 0, height: 2 },
		},
		settingsHeader: {
			paddingHorizontal: 20,
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outline,
		},
		settingsTitle: {
			fontSize: 18,
			fontWeight: "600",
			color: theme.colors.onSurface,
			marginBottom: 4,
			fontFamily: "Montserrat_700Bold",
		},
		settingsDescription: {
			fontSize: 14,
			color: theme.colors.onSurfaceVariant,
			fontFamily: "Montserrat_400Regular",
		},
		settingsContent: {
			padding: 20,
		},
		transportOption: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 12,
			paddingHorizontal: 16,
			marginBottom: 8,
			borderRadius: 8,
			borderWidth: 1,
		},
		transportOptionSelected: {
			backgroundColor: theme.colors.primaryContainer,
			borderColor: theme.colors.primary,
		},
		transportOptionUnselected: {
			backgroundColor: theme.colors.surfaceVariant,
			borderColor: theme.colors.outline,
		},
		transportIcon: {
			width: 40,
			height: 40,
			borderRadius: 20,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 12,
		},
		transportIconSelected: {
			backgroundColor: theme.colors.primary,
		},
		transportIconUnselected: {
			backgroundColor: theme.colors.onSurfaceVariant,
		},
		transportText: {
			flex: 1,
			fontSize: 16,
			fontWeight: "500",
			fontFamily: "Montserrat_400Regular",
		},
		transportTextSelected: {
			color: theme.colors.onPrimaryContainer,
		},
		transportTextUnselected: {
			color: theme.colors.onSurface,
		},
		signOutButton: {
			backgroundColor: theme.colors.error,
			paddingVertical: 16,
			borderRadius: 12,
			alignItems: "center",
			marginHorizontal: 16,
			marginTop: 24,
			marginBottom: 32,
		},
		signOutText: {
			color: theme.colors.onError,
			fontSize: 16,
			fontWeight: "600",
			fontFamily: "Montserrat_700Bold",
		},
	});

	const handleLogout = () => {
		Alert.alert(
			"Sign Out",
			"Are you sure you want to sign out?",
			[
				{ text: "Cancel", style: "cancel" },
				{ 
					text: "Sign Out", 
					style: "destructive", 
					onPress: async () => {
						await logout();
						router.replace("/(auth)/login");
					}
				}
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
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Profile</Text>
			</View>

			<ScrollView style={{ flex: 1 }}>
				{/* Profile Header */}
				<View style={styles.profileCard}>
					{user.picture ? (
						<Image 
							source={{ uri: user.picture }} 
							style={styles.avatar} 
						/>
					) : (
						<View style={styles.avatarPlaceholder}>
							<Text style={styles.avatarText}>
								{user.name.charAt(0).toUpperCase()}
							</Text>
						</View>
					)}
					
					<Text style={styles.userName}>
						{user.name}
					</Text>
					<Text style={styles.userEmail}>
						{user.email}
					</Text>
				</View>

				{/* Transportation Modes Setting */}
				<View style={styles.settingsCard}>
					<View style={styles.settingsHeader}>
						<Text style={styles.settingsTitle}>
							Transportation Modes
						</Text>
						<Text style={styles.settingsDescription}>
							Select your preferred modes of transportation for route planning
						</Text>
					</View>
					
					<View style={styles.settingsContent}>
						{transportModesList.map((mode) => {
							const isSelected = selectedTransportModes.includes(mode.id);
							return (
								<Pressable
									key={mode.id}
									onPress={() => handleToggleTransportMode(mode.id)}
									style={[
										styles.transportOption,
										isSelected ? styles.transportOptionSelected : styles.transportOptionUnselected
									]}
								>
									<View style={[
										styles.transportIcon,
										isSelected ? styles.transportIconSelected : styles.transportIconUnselected
									]}>
										<Ionicons 
											name={mode.icon} 
											size={20} 
											color={theme.colors.onPrimary} 
										/>
									</View>
									<Text style={[
										styles.transportText,
										isSelected ? styles.transportTextSelected : styles.transportTextUnselected
									]}>
										{mode.name}
									</Text>
									{isSelected && (
										<Ionicons 
											name="checkmark-circle" 
											size={24} 
											color={theme.colors.primary} 
										/>
									)}
								</Pressable>
							);
						})}
					</View>
				</View>

				{/* Sign Out Button */}
				<Pressable 
					onPress={handleLogout}
					style={styles.signOutButton}
				>
					<Text style={styles.signOutText}>Sign Out</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}