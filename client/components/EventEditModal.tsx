import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from '../contexts/AuthContext';
import EventSchedule from './EventSchedule';

type EventItem = {
  id: string;
  name: string;
  description?: string;
  start: string;
  end: string;
  location: {
    lat: number;
    lng: number;
    description?: string;
  };
  participants: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type Friend = {
  id: string;
  name: string;
  email?: string;
  picture?: string;
};

export type EventEditModalProps = {
  visible: boolean;
  event: EventItem | null;
  friends?: Friend[];
  onClose: () => void;
  onSave: (eventData: {
    id: string;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    location: { lat: number; lng: number; description?: string };
    invitedFriends: string[];
  }) => void;
};

export default function EventEditModal({
  visible,
  event,
  friends = [],
  onClose,
  onSave,
}: EventEditModalProps) {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState<"date" | "time">("date");
  const [endPickerMode, setEndPickerMode] = useState<"date" | "time">("date");
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());

  // Pre-fill form when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.name);
      setDescription(event.description || "");
      setStartDate(new Date(event.start));
      setEndDate(new Date(event.end));
      
      // Set invited friends (exclude the creator)
      const invited = event.participants.filter(id => id !== event.createdBy);
      setInvitedFriends(new Set(invited));
    }
  }, [event]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 60 * 60 * 1000));
    setShowStartPicker(false);
    setShowEndPicker(false);
    setInvitedFriends(new Set());
  };

  const toggleFriendInvite = (friendId: string) => {
    setInvitedFriends(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = () => {
    if (!event) return;
    
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for the event");
      return;
    }
    if (endDate <= startDate) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    onSave({
      id: event.id,
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      location: event.location,
      invitedFriends: Array.from(invitedFriends),
    });

    resetForm();
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      // Automatically adjust end date if it's before the new start date
      if (selectedDate >= endDate) {
        setEndDate(new Date(selectedDate.getTime() + 60 * 60 * 1000));
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  if (!visible || !event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Pressable onPress={handleClose} hitSlop={8}>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>Edit Event</Text>
          <Pressable
            onPress={handleSave}
            hitSlop={8}
            style={{
              backgroundColor: "#1A73E8",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Location Info */}
          <View
            style={{
              backgroundColor: "#F3F4F6",
              padding: 16,
              borderRadius: 12,
              marginBottom: 24,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="location" size={20} color="#1A73E8" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>Location</Text>
              <Text style={{ fontSize: 16, fontWeight: "500" }}>
                {event.location.description || `${event.location.lat.toFixed(4)}, ${event.location.lng.toFixed(4)}`}
              </Text>
            </View>
          </View>

          {/* Title */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              Event Title *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter event title"
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
              }}
            />
          </View>

          {/* Description */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Enter event description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#fff",
                minHeight: 100,
              }}
            />
          </View>

          {/* Start Date & Time */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              Start Date & Time *
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  setStartPickerMode("date");
                  setShowStartPicker(true);
                }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="calendar" size={20} color="#6B7280" />
                <Text style={{ marginLeft: 8, fontSize: 16 }}>
                  {startDate.toLocaleDateString()}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStartPickerMode("time");
                  setShowStartPicker(true);
                }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="time" size={20} color="#6B7280" />
                <Text style={{ marginLeft: 8, fontSize: 16 }}>
                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* End Date & Time */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              End Date & Time *
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  setEndPickerMode("date");
                  setShowEndPicker(true);
                }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="calendar" size={20} color="#6B7280" />
                <Text style={{ marginLeft: 8, fontSize: 16 }}>
                  {endDate.toLocaleDateString()}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setEndPickerMode("time");
                  setShowEndPicker(true);
                }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="time" size={20} color="#6B7280" />
                <Text style={{ marginLeft: 8, fontSize: 16 }}>
                  {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Participants */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              Participants ({invitedFriends.size + 1} total)
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                backgroundColor: "#fff",
                maxHeight: 200,
              }}
            >
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                {/* Current User (Event Creator) */}
                {user && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F3F4F6",
                      backgroundColor: "#F8F9FA",
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: user.picture ? "transparent" : "#1A73E8",
                        borderWidth: 2,
                        borderColor: "#1A73E8",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                        overflow: "hidden",
                      }}
                    >
                      {user.picture ? (
                        <Image
                          source={{ uri: user.picture }}
                          style={{ width: 28, height: 28, borderRadius: 14 }}
                        />
                      ) : (
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>
                          {user.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "500" }}>
                        {user.name} (You)
                      </Text>
                      {user.email && (
                        <Text style={{ fontSize: 14, color: "#6B7280" }}>
                          {user.email}
                        </Text>
                      )}
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#1A73E8", borderRadius: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>Creator</Text>
                    </View>
                  </View>
                )}

                {/* Other Friends */}
                {friends.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => toggleFriendInvite(item.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: "#F3F4F6",
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: item.picture ? "transparent" : "#10B981",
                          borderWidth: 2,
                          borderColor: invitedFriends.has(item.id) ? "#1A73E8" : "#E5E7EB",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                          overflow: "hidden",
                        }}
                      >
                        {item.picture ? (
                          <Image
                            source={{ uri: item.picture }}
                            style={{ width: 28, height: 28, borderRadius: 14 }}
                          />
                        ) : (
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>
                            {item.name.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "500" }}>
                          {item.name}
                        </Text>
                        {item.email && (
                          <Text style={{ fontSize: 14, color: "#6B7280" }}>
                            {item.email}
                          </Text>
                        )}
                      </View>
                      {invitedFriends.has(item.id) && (
                        <Ionicons name="checkmark-circle" size={24} color="#1A73E8" />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

          {/* Travel Schedule */}
          {event && (
            <View style={{ marginBottom: 24 }}>
              <EventSchedule
                eventId={event.id}
                eventLocation={event.location}
                eventStart={startDate.toISOString()}
                eventEnd={endDate.toISOString()}
                invitedFriends={[
                  ...(user ? [{
                    id: user.id,
                    name: user.name,
                    picture: user.picture,
                    lat: user.lat || user.latitude,
                    lng: user.lng || user.longitude
                  }] : []),
                  ...friends.filter(friend => Array.from(invitedFriends).includes(friend.id))
                ]}
                token={token || undefined}
                isEditing={true}
              />
            </View>
          )}
        </ScrollView>

        {/* Date/Time Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode={startPickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onStartDateChange}
            minimumDate={new Date()}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode={endPickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onEndDateChange}
            minimumDate={startDate}
          />
        )}

        {Platform.OS === 'ios' && (showStartPicker || showEndPicker) && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#fff",
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
              }}
            >
              <Pressable
                onPress={() => {
                  setShowStartPicker(false);
                  setShowEndPicker(false);
                }}
              >
                <Text style={{ fontSize: 16, color: "#1A73E8" }}>Done</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}