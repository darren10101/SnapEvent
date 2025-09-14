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
import EventSchedule from "./EventSchedule";

type SelectedPlace = {
  lat: number;
  lng: number;
  description?: string;
};

type Friend = {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  lat?: number;
  lng?: number;
};

type User = {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
};

export type EventCreationModalProps = {
  visible: boolean;
  selectedPlace: SelectedPlace | null;
  friends?: Friend[];
  currentUser?: User;
  onClose: () => void;
  onSelectStartingLocation?: () => void;
  selectedStartingLocation?: SelectedPlace | null;
  token?: string;
  onSave: (eventData: {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    location: SelectedPlace;
    startingLocation?: SelectedPlace;
    invitedFriends: string[];
  }) => void;
};

export default function EventCreationModal({
  visible,
  selectedPlace,
  friends = [],
  currentUser,
  onClose,
  onSelectStartingLocation,
  selectedStartingLocation,
  token,
  onSave,
}: EventCreationModalProps) {
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState<"date" | "time">("date");
  const [endPickerMode, setEndPickerMode] = useState<"date" | "time">("date");
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(
    new Set(currentUser ? [currentUser.id] : [])
  );
  const [startingLocation, setStartingLocation] = useState<SelectedPlace | null>(null);

  // Update starting location when prop changes
  useEffect(() => {
    if (selectedStartingLocation) {
      setStartingLocation(selectedStartingLocation);
    }
  }, [selectedStartingLocation]);

  // Ensure current user is always included when modal opens or currentUser changes
  useEffect(() => {
    if (currentUser && visible) {
      setInvitedFriends(prev => {
        const newSet = new Set(prev);
        newSet.add(currentUser.id);
        return newSet;
      });
    }
  }, [currentUser?.id, visible]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 60 * 60 * 1000));
    setShowStartPicker(false);
    setShowEndPicker(false);
    setInvitedFriends(new Set(currentUser ? [currentUser.id] : []));
    setStartingLocation(null);
  };

  const toggleFriendInvite = (friendId: string) => {
    // Don't allow current user to unselect themselves
    if (friendId === currentUser?.id) {
      return;
    }
    
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
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for the event");
      return;
    }
    if (!selectedPlace) {
      Alert.alert("Error", "No location selected");
      return;
    }
    if (endDate <= startDate) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      location: selectedPlace,
      startingLocation: startingLocation || undefined,
      invitedFriends: Array.from(invitedFriends),
    });

    resetForm();
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  if (!visible || !selectedPlace) return null;

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
          <Text style={{ fontSize: 18, fontWeight: "600" }}>Create Event</Text>
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
                {selectedPlace.description || `${selectedPlace.lat.toFixed(4)}, ${selectedPlace.lng.toFixed(4)}`}
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

          {/* Optional Starting Location */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              Starting Location (Optional)
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 8 }}>
              Select where participants should start their journey from
            </Text>
            {startingLocation ? (
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  padding: 16,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="location" size={20} color="#10B981" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "500" }}>
                    {startingLocation.description || `${startingLocation.lat.toFixed(4)}, ${startingLocation.lng.toFixed(4)}`}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setStartingLocation(null)}
                  hitSlop={8}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={24} color="#6B7280" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={onSelectStartingLocation}
                style={{
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#6B7280" />
                <Text style={{ marginLeft: 8, fontSize: 16, color: "#6B7280" }}>
                  Select Starting Location
                </Text>
              </Pressable>
            )}
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
                {currentUser && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      borderBottomWidth: friends.length > 0 ? 1 : 0,
                      borderBottomColor: "#F3F4F6",
                      backgroundColor: "#F8F9FA",
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: currentUser.picture ? "transparent" : "#1A73E8",
                        borderWidth: 2,
                        borderColor: "#1A73E8",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                        overflow: "hidden",
                      }}
                    >
                      {currentUser.picture ? (
                        <Image
                          source={{ uri: currentUser.picture }}
                          style={{ width: 28, height: 28, borderRadius: 14 }}
                        />
                      ) : (
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>
                          {currentUser.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "500" }}>
                        {currentUser.name} (You)
                      </Text>
                      {currentUser.email && (
                        <Text style={{ fontSize: 14, color: "#6B7280" }}>
                          {currentUser.email}
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

          {/* Travel Schedule Preview */}
          {selectedPlace && currentUser && (
            <View style={{ marginBottom: 24 }}>
              <EventSchedule
                invitedFriends={[
                  ...(currentUser ? [{
                    id: currentUser.id,
                    name: currentUser.name,
                    picture: currentUser.picture,
                    lat: currentUser.lat || currentUser.latitude,
                    lng: currentUser.lng || currentUser.longitude
                  }] : []),
                  ...friends.filter(friend => invitedFriends.has(friend.id)).map(friend => ({
                    ...friend,
                    lat: friend.lat,
                    lng: friend.lng
                  }))
                ]}
                eventLocation={selectedPlace}
                eventStart={startDate.toISOString()}
                eventEnd={endDate.toISOString()}
                startingLocation={startingLocation || undefined}
                token={token}
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