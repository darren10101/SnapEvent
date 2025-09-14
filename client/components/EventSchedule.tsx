import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { TravelSchedule, generateEventTravelSchedules } from '../lib/travelScheduleService';
import { TRANSPORT_MODES } from '../lib/transportSettings';

// Helper function to get appropriate icon for transit vehicle type
const getTransitIcon = (vehicleType?: string): string => {
  if (!vehicleType) return '🚌';
  
  switch (vehicleType.toUpperCase()) {
    case 'BUS':
      return '🚌';
    case 'SUBWAY':
    case 'HEAVY_RAIL':
      return '🚇';
    case 'LIGHT_RAIL':
    case 'TRAM':
      return '🚋';
    case 'FERRY':
      return '⛴️';
    case 'CABLE_CAR':
      return '🚠';
    case 'GONDOLA_LIFT':
      return '🚡';
    case 'FUNICULAR':
      return '🚟';
    case 'TROLLEYBUS':
      return '🚎';
    default:
      return '🚌';
  }
};

interface EventScheduleProps {
  invitedFriends: Array<{ id: string; name: string; picture?: string; lat?: number; lng?: number }>;
  eventLocation: { lat: number; lng: number };
  eventStart: string;
  eventEnd: string;
  token?: string;
}

export default function EventSchedule({
  invitedFriends,
  eventLocation,
  eventStart,
  eventEnd,
  token
}: EventScheduleProps) {
  const [schedules, setSchedules] = useState<TravelSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedOutbound, setExpandedOutbound] = useState(false);
  const [expandedReturn, setExpandedReturn] = useState(false);

  useEffect(() => {
    if (invitedFriends.length > 0) {
      loadSchedules();
    }
  }, [invitedFriends, eventLocation, eventStart, eventEnd]);

  // Reset expanded states when user selection changes
  useEffect(() => {
    setExpandedOutbound(false);
    setExpandedReturn(false);
  }, [selectedUserId]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      console.log('Loading schedules for invited friends:', invitedFriends);
      console.log('Event location:', eventLocation);
      console.log('Event start:', eventStart);
      console.log('Event end:', eventEnd);
      
      // Check if friends have location data
      const friendsWithLocation = invitedFriends.filter(f => f.lat && f.lng);
      const friendsWithoutLocation = invitedFriends.filter(f => !f.lat || !f.lng);
      
      console.log('Friends with location data:', friendsWithLocation);
      console.log('Friends WITHOUT location data:', friendsWithoutLocation);
      
      if (friendsWithLocation.length === 0) {
        console.warn('No friends have location data');
        setSchedules([]);
        return;
      }
      
      const startDate = new Date(eventStart);
      const endDate = new Date(eventEnd);
      
      const travelSchedules = await generateEventTravelSchedules(
        invitedFriends,
        eventLocation,
        startDate,
        endDate,
        token
      );
      
      console.log('Generated travel schedules:', travelSchedules);
      
      setSchedules(travelSchedules);
      if (travelSchedules.length > 0 && !selectedUserId) {
        setSelectedUserId(travelSchedules[0].userId);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case 'driving': return '🚗';
      case 'walking': return '🚶';
      case 'transit': return '🚌';
      case 'bicycling': return '🚲';
      default: return '🚗';
    }
  };

  const selectedSchedule = schedules.find(s => s.userId === selectedUserId);

  if (invitedFriends.length === 0) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <Text style={{ color: '#666', fontStyle: 'italic' }}>
          No friends invited to show travel schedules
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 16, color: '#333' }}>
        Proposed Travel Schedules
      </Text>

      {loading ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1A73E8" />
          <Text style={{ marginTop: 8, color: '#666' }}>Calculating travel schedules...</Text>
        </View>
      ) : (
        <>
          {/* User Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {invitedFriends.map((friend) => {
              const hasSchedule = schedules.some(s => s.userId === friend.id);
              return (
                <Pressable
                  key={friend.id}
                  onPress={() => setSelectedUserId(friend.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginHorizontal: 4,
                    borderRadius: 20,
                    backgroundColor: selectedUserId === friend.id ? '#1A73E8' : '#f8f9fa',
                    borderWidth: 1,
                    borderColor: selectedUserId === friend.id ? '#1A73E8' : '#e9ecef',
                    opacity: hasSchedule ? 1 : 0.7
                  }}
                >
                  <View style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: 12, 
                    backgroundColor: friend.picture ? "transparent" : "#10B981", 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    marginRight: 8,
                    overflow: "hidden"
                  }}>
                    {friend.picture ? (
                      <Image
                        source={{ uri: friend.picture }}
                        style={{ width: 24, height: 24, borderRadius: 12 }}
                      />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 10 }}>
                        {friend.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '500',
                    color: selectedUserId === friend.id ? '#fff' : '#333',
                    marginRight: 4
                  }}>
                    {friend.name}
                  </Text>
                  {hasSchedule && (
                    <Text style={{ fontSize: 12 }}>
                      {getTransportIcon(schedules.find(s => s.userId === friend.id)?.transportMode || 'driving')}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Selected User's Schedule */}
          {selectedUserId && (() => {
            const selectedSchedule = schedules.find(s => s.userId === selectedUserId);
            const selectedFriend = invitedFriends.find(f => f.id === selectedUserId);
            
            if (!selectedFriend) return null;
            
            if (!selectedSchedule) {
              // User without location data or schedule
              return (
                <View style={{ 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: 12, 
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#e9ecef',
                  alignItems: 'center'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 16, 
                      backgroundColor: selectedFriend.picture ? "transparent" : "#1A73E8", 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      marginRight: 12,
                      overflow: "hidden"
                    }}>
                      {selectedFriend.picture ? (
                        <Image
                          source={{ uri: selectedFriend.picture }}
                          style={{ width: 32, height: 32, borderRadius: 16 }}
                        />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                          {selectedFriend.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>
                      {selectedFriend.name}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 8 }}>
                    Travel schedule unavailable
                  </Text>
                  <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>
                    {!selectedFriend.lat || !selectedFriend.lng 
                      ? 'Location data needed to calculate travel times'
                      : 'Unable to calculate route - may already be at event location'
                    }
                  </Text>
                </View>
              );
            }
            
            // User with schedule
            return (
              <View style={{ 
                backgroundColor: '#f8f9fa', 
                borderRadius: 12, 
                padding: 16,
                borderWidth: 1,
                borderColor: '#e9ecef'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: 16, 
                    backgroundColor: selectedSchedule.userPicture ? "transparent" : "#1A73E8", 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    marginRight: 12,
                    overflow: "hidden"
                  }}>
                    {selectedSchedule.userPicture ? (
                      <Image
                        source={{ uri: selectedSchedule.userPicture }}
                        style={{ width: 32, height: 32, borderRadius: 16 }}
                      />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                        {selectedSchedule.userName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>
                      {selectedSchedule.userName}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666' }}>
                      {TRANSPORT_MODES[selectedSchedule.transportMode]?.name || selectedSchedule.transportMode} {getTransportIcon(selectedSchedule.transportMode)}
                    </Text>
                  </View>
                </View>

                {/* Outbound Trip */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A73E8', marginBottom: 8 }}>
                    🚀 Going to Event
                  </Text>
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: '#333', fontWeight: '500' }}>
                      Depart: {selectedSchedule.outbound.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#333' }}>
                      Arrive: {selectedSchedule.outbound.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#666' }}>
                      Duration: {selectedSchedule.outbound.duration} min • Distance: {selectedSchedule.outbound.distance}
                    </Text>
                  </View>
                  
                  {/* Outbound Steps */}
                  <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
                    {selectedSchedule.outbound.steps
                      .slice(0, selectedSchedule.outbound.steps.length <= 10 || expandedOutbound ? selectedSchedule.outbound.steps.length : 10)
                      .map((step, index) => (
                        <View key={index} style={{ 
                          flexDirection: 'row', 
                          alignItems: 'flex-start',
                          marginBottom: index < (selectedSchedule.outbound.steps.length <= 10 || expandedOutbound ? selectedSchedule.outbound.steps.length : 10) - 1 ? 8 : 0
                        }}>
                          <Text style={{ 
                            fontSize: 12, 
                            color: '#1A73E8', 
                            fontWeight: '600',
                            minWidth: 20,
                            marginRight: 8,
                            marginTop: 2
                          }}>
                            {index + 1}.
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, color: '#333', lineHeight: 18 }}>
                              {step.instruction}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                              {step.distance} • {step.duration}
                            </Text>
                            {/* Transit timing information */}
                            {step.transitDetails && (
                              <View style={{ marginTop: 4, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6 }}>
                                <Text style={{ fontSize: 11, color: '#1A73E8', fontWeight: '600' }}>
                                  {getTransitIcon(step.transitDetails.line?.vehicle?.type)} {step.transitDetails.line?.name || step.transitDetails.line?.shortName}
                                  {step.transitDetails.headsign && ` → ${step.transitDetails.headsign}`}
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                                  <Text style={{ fontSize: 10, color: '#666', flex: 1 }}>
                                    🚏 {step.transitDetails.departureTime?.text}
                                  </Text>
                                  <Text style={{ fontSize: 10, color: '#666', flex: 1, textAlign: 'right' }}>
                                    🏁 {step.transitDetails.arrivalTime?.text}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 10, color: '#666', marginTop: 1 }}>
                                  From: {step.transitDetails.departureStop?.name}
                                </Text>
                                <Text style={{ fontSize: 10, color: '#666' }}>
                                  To: {step.transitDetails.arrivalStop?.name}
                                </Text>
                                {step.transitDetails.numStops && (
                                  <Text style={{ fontSize: 10, color: '#888', marginTop: 2, fontStyle: 'italic' }}>
                                    {step.transitDetails.numStops} stops
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    
                    {/* Show More/Less Button */}
                    {selectedSchedule.outbound.steps.length > 10 && (
                      <Pressable
                        onPress={() => setExpandedOutbound(!expandedOutbound)}
                        style={{
                          marginTop: 8,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          backgroundColor: '#f0f9ff',
                          borderRadius: 6,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#1A73E8'
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#1A73E8', fontWeight: '600' }}>
                          {expandedOutbound 
                            ? `Show Less (hiding ${selectedSchedule.outbound.steps.length - 10} steps)` 
                            : `Show ${selectedSchedule.outbound.steps.length - 10} More Steps`
                          }
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Return Trip */}
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#10B981', marginBottom: 8 }}>
                    🏠 Returning Home
                  </Text>
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: '#333', fontWeight: '500' }}>
                      Depart: {selectedSchedule.return.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#333' }}>
                      Arrive: {selectedSchedule.return.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#666' }}>
                      Duration: {selectedSchedule.return.duration} min • Distance: {selectedSchedule.return.distance}
                    </Text>
                  </View>
                  
                  {/* Return Steps */}
                  <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
                    {selectedSchedule.return.steps
                      .slice(0, selectedSchedule.return.steps.length <= 10 || expandedReturn ? selectedSchedule.return.steps.length : 10)
                      .map((step, index) => (
                        <View key={index} style={{ 
                          flexDirection: 'row', 
                          alignItems: 'flex-start',
                          marginBottom: index < (selectedSchedule.return.steps.length <= 10 || expandedReturn ? selectedSchedule.return.steps.length : 10) - 1 ? 8 : 0
                        }}>
                          <Text style={{ 
                            fontSize: 12, 
                            color: '#10B981', 
                            fontWeight: '600',
                            minWidth: 20,
                            marginRight: 8,
                            marginTop: 2
                          }}>
                            {index + 1}.
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, color: '#333', lineHeight: 18 }}>
                              {step.instruction}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                              {step.distance} • {step.duration}
                            </Text>
                            {/* Transit timing information */}
                            {step.transitDetails && (
                              <View style={{ marginTop: 4, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 6 }}>
                                <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600' }}>
                                  {getTransitIcon(step.transitDetails.line?.vehicle?.type)} {step.transitDetails.line?.name || step.transitDetails.line?.shortName}
                                  {step.transitDetails.headsign && ` → ${step.transitDetails.headsign}`}
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                                  <Text style={{ fontSize: 10, color: '#666', flex: 1 }}>
                                    🚏 {step.transitDetails.departureTime?.text}
                                  </Text>
                                  <Text style={{ fontSize: 10, color: '#666', flex: 1, textAlign: 'right' }}>
                                    🏁 {step.transitDetails.arrivalTime?.text}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 10, color: '#666', marginTop: 1 }}>
                                  From: {step.transitDetails.departureStop?.name}
                                </Text>
                                <Text style={{ fontSize: 10, color: '#666' }}>
                                  To: {step.transitDetails.arrivalStop?.name}
                                </Text>
                                {step.transitDetails.numStops && (
                                  <Text style={{ fontSize: 10, color: '#888', marginTop: 2, fontStyle: 'italic' }}>
                                    {step.transitDetails.numStops} stops
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    
                    {/* Show More/Less Button */}
                    {selectedSchedule.return.steps.length > 10 && (
                      <Pressable
                        onPress={() => setExpandedReturn(!expandedReturn)}
                        style={{
                          marginTop: 8,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          backgroundColor: '#f0fdf4',
                          borderRadius: 6,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#10B981'
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>
                          {expandedReturn 
                            ? `Show Less (hiding ${selectedSchedule.return.steps.length - 10} steps)` 
                            : `Show ${selectedSchedule.return.steps.length - 10} More Steps`
                          }
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })()}

          {/* No schedules message */}
          {schedules.length === 0 && !loading && (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', marginBottom: 8 }}>
                Unable to calculate travel schedules.
              </Text>
              <Text style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>
                This feature requires friends to have location data and transport preferences set up.
                {invitedFriends.filter(f => !f.lat || !f.lng).length > 0 && 
                  ` ${invitedFriends.filter(f => !f.lat || !f.lng).length} friend(s) missing location data.`
                }
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}