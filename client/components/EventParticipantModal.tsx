import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import EventSchedule from "./EventSchedule";
import DepartureLocationMap from "./DepartureLocationMap";
import { useAuth } from "../contexts/AuthContext";

type EventParticipantModalProps = {
  visible: boolean;
  event: {
    id: string;
    name: string;
    description?: string;
    start: string;
    end: string;
    location: { lat: number; lng: number; description?: string };
    participants: string[];
    createdBy: string;
    createdAt: string;
    startingLocations?: { [userId: string]: { lat: number; lng: number; description?: string } };
  };
  friends?: Array<{
    id: string;
    name: string;
    email?: string;
    picture?: string;
    lat?: number;
    lng?: number;
  }>;
  onClose: () => void;
};

export default function EventParticipantModal({
  visible,
  event,
  friends = [],
  onClose,
}: EventParticipantModalProps) {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  
  const [userStartingLocation, setUserStartingLocation] = useState<{ lat: number; lng: number; description?: string } | null>(null);
  const [showDepartureMap, setShowDepartureMap] = useState(false);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  // Load user's starting location when modal opens
  useEffect(() => {
    if (event && user && event.startingLocations && event.startingLocations[user.id]) {
      setUserStartingLocation(event.startingLocations[user.id]);
    } else {
      setUserStartingLocation(null);
    }
  }, [event, user]);

  const saveUserStartingLocation = async (location: { lat: number; lng: number; description?: string }) => {
    if (!user || !token) {
      Alert.alert('Error', 'You must be logged in to set a starting location');
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events/${event.id}/starting-location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          location: location
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUserStartingLocation(location);
        setShowDepartureMap(false);
        setScheduleRefreshKey(prev => prev + 1); // Force refresh of travel schedules
        Alert.alert('Success', 'Your starting location has been saved!');
      } else {
        console.error('Failed to save starting location:', result.error);
        Alert.alert('Error', result.error || 'Failed to save starting location');
      }
    } catch (error) {
      console.error('Error saving starting location:', error);
      Alert.alert('Error', 'Failed to save starting location. Please try again.');
    }
  };

  const removeUserStartingLocation = async () => {
    if (!user || !token) {
      Alert.alert('Error', 'You must be logged in to remove starting location');
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/events/${event.id}/starting-location`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUserStartingLocation(null);
        setScheduleRefreshKey(prev => prev + 1); // Force refresh of travel schedules
        Alert.alert('Success', 'Your starting location has been removed!');
      } else {
        console.error('Failed to remove starting location:', result.error);
        Alert.alert('Error', result.error || 'Failed to remove starting location');
      }
    } catch (error) {
      console.error('Error removing starting location:', error);
      Alert.alert('Error', 'Failed to remove starting location. Please try again.');
    }
  };

  const getParticipantFriends = () => {
    if (!user) return [];
    
    return event.participants
      .map(participantId => {
        if (participantId === user.id) {
          return {
            id: user.id,
            name: user.name,
            picture: user.picture,
            lat: user.lat || user.latitude,
            lng: user.lng || user.longitude
          };
        }
        return friends.find(friend => friend.id === participantId);
      })
      .filter(Boolean) as Array<{
        id: string;
        name: string;
        picture?: string;
        lat?: number;
        lng?: number;
      }>;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>Close</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>Event Details</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Event Info */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
              {event.name}
            </Text>
            {event.description && (
              <Text style={{ fontSize: 16, color: "#6B7280", marginBottom: 12 }}>
                {event.description}
              </Text>
            )}
            
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="time" size={20} color="#10B981" />
              <Text style={{ marginLeft: 8, fontSize: 16 }}>
                {formatDateTime(event.start)} - {formatDateTime(event.end)}
              </Text>
            </View>
            
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="location" size={20} color="#10B981" />
              <Text style={{ marginLeft: 8, fontSize: 16, flex: 1 }}>
                {event.location.description || `${event.location.lat.toFixed(4)}, ${event.location.lng.toFixed(4)}`}
              </Text>
            </View>
          </View>

          {/* Starting Location Section */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
              Your Starting Location
            </Text>
            
            {!showDepartureMap ? (
              <View>
                {userStartingLocation ? (
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: "#F0F9FF",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#BAE6FD"
                  }}>
                    <Ionicons name="location" size={20} color="#10B981" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "500" }}>
                        {userStartingLocation.description || `${userStartingLocation.lat.toFixed(4)}, ${userStartingLocation.lng.toFixed(4)}`}
                      </Text>
                    </View>
                    <Pressable
                      onPress={removeUserStartingLocation}
                      hitSlop={8}
                      style={{ padding: 4, marginRight: 8 }}
                    >
                      <Ionicons name="close-circle" size={24} color="#6B7280" />
                    </Pressable>
                    <Pressable
                      onPress={() => setShowDepartureMap(true)}
                      hitSlop={8}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="pencil" size={20} color="#1A73E8" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowDepartureMap(true)}
                    style={{
                      padding: 16,
                      backgroundColor: "#F9FAFB",
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: "#E5E7EB",
                      borderStyle: "dashed",
                      alignItems: "center"
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={32} color="#6B7280" />
                    <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 8 }}>
                      Set Your Starting Location
                    </Text>
                    <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
                      Choose where you'll be departing from to get personalized travel directions
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <DepartureLocationMap
                  selectedLocation={userStartingLocation}
                  onLocationSelected={saveUserStartingLocation}
                  onLocationCleared={() => {
                    setUserStartingLocation(null);
                    setShowDepartureMap(false);
                  }}
                  height={300}
                />
                <Pressable
                  onPress={() => setShowDepartureMap(false)}
                  style={{
                    marginTop: 8,
                    padding: 12,
                    backgroundColor: "#F3F4F6",
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, color: "#6B7280" }}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Travel Schedule */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
              Travel Schedules
            </Text>
            <EventSchedule
              key={scheduleRefreshKey} // Force refresh when starting location changes
              eventId={event.id}
              eventLocation={event.location}
              eventStart={event.start}
              eventEnd={event.end}
              invitedFriends={getParticipantFriends()}
              token={token || undefined}
              isEditing={false}
              eventData={{
                startingLocations: event.startingLocations || {}
              }}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}