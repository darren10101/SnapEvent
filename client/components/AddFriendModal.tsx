import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export type AddFriendModalProps = {
	visible: boolean;
	onClose: () => void;
	onSubmit: (email: string) => void | Promise<void>;
	isSubmitting?: boolean;
};

export default function AddFriendModal({ visible, onClose, onSubmit, isSubmitting = false }: AddFriendModalProps) {
	const [emailInput, setEmailInput] = useState("");

	const handleSubmit = async () => {
		const trimmed = emailInput.trim();
		if (!trimmed) return;
		await onSubmit(trimmed);
	};

	return (
		<Modal
			visible={visible}
			transparent={true}
			animationType="fade"
			onRequestClose={onClose}
		>
			<View style={{ 
				flex: 1, 
				backgroundColor: 'rgba(0,0,0,0.5)', 
				justifyContent: 'center', 
				alignItems: 'center',
				padding: 20
			}}>
				<View style={{ 
					backgroundColor: '#fff', 
					borderRadius: 12, 
					padding: 20, 
					width: '100%',
					maxWidth: 400,
					elevation: 5,
					shadowColor: '#000',
					shadowOpacity: 0.25,
					shadowRadius: 10,
					shadowOffset: { width: 0, height: 4 }
				}}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
						<Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981' }}>Add Friend</Text>
						<Pressable 
							onPress={onClose}
							style={{ padding: 4 }}
						>
							<Ionicons name="close" size={24} color="#666" />
						</Pressable>
					</View>
					
					<Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
						Enter the email address of the person you'd like to add as a friend.
					</Text>
					
					<TextInput
						placeholder="Enter email address"
						value={emailInput}
						onChangeText={setEmailInput}
						style={{ 
							backgroundColor: "#F5F5F5", 
							borderRadius: 8, 
							paddingHorizontal: 12, 
							paddingVertical: 12,
							borderWidth: 1,
							borderColor: "#E5E7EB",
							fontSize: 16,
							marginBottom: 16
						}}
						keyboardType="email-address"
						autoCapitalize="none"
						autoFocus={true}
					/>
					
					<View style={{ flexDirection: 'row', gap: 12 }}>
						<Pressable 
							onPress={onClose}
							style={{ 
								flex: 1,
								backgroundColor: "#F3F4F6", 
								paddingVertical: 12, 
								borderRadius: 8,
								alignItems: 'center'
							}}
						>
							<Text style={{ color: "#666", fontSize: 16, fontWeight: "600" }}>Cancel</Text>
						</Pressable>
						
						<Pressable 
							onPress={handleSubmit} 
							disabled={isSubmitting || !emailInput.trim()}
							style={{ 
								flex: 1,
								backgroundColor: (isSubmitting || !emailInput.trim()) ? "#9CA3AF" : "#10B981", 
								paddingVertical: 12, 
								borderRadius: 8,
								alignItems: 'center'
							}}
						>
							<Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
								{isSubmitting ? "Sending..." : "Send Request"}
							</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}
