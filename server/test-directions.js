/**
 * Test script for Google Directions API
 * Run with: node test-directions.js
 */

require('dotenv').config();
const GoogleDirectionsService = require('./services/googleDirections');

async function testDirectionsAPI() {
  const directionsService = new GoogleDirectionsService();
  
  console.log('🚀 Testing Google Directions API...\n');

  // Test 1: Simple route calculation
  console.log('📍 Test 1: Calculate route from Toronto to Ottawa');
  try {
    const routeResult = await directionsService.getDirections({
      origin: 'Toronto, ON, Canada',
      destination: 'Ottawa, ON, Canada',
      mode: 'driving'
    });

    if (routeResult.success) {
      const route = routeResult.data.routes[0];
      console.log(`✅ Route found: ${route.distanceText}, ${route.durationText}`);
      console.log(`   Summary: ${route.summary}\n`);
    } else {
      console.log(`❌ Route calculation failed: ${routeResult.error}\n`);
    }
  } catch (error) {
    console.log(`❌ Route test error: ${error.message}\n`);
  }

  // Test 2: Distance matrix
  console.log('📊 Test 2: Distance matrix for multiple locations');
  try {
    const matrixResult = await directionsService.getDistanceMatrix({
      origins: ['Toronto, ON', 'Montreal, QC'],
      destinations: ['Ottawa, ON', 'Quebec City, QC'],
      mode: 'driving'
    });

    if (matrixResult.success) {
      console.log('✅ Distance matrix calculated:');
      matrixResult.data.rows.forEach((row, i) => {
        row.elements.forEach((element, j) => {
          if (element.status === 'OK') {
            console.log(`   ${matrixResult.data.originAddresses[i]} → ${matrixResult.data.destinationAddresses[j]}: ${element.distance.text}, ${element.duration.text}`);
          }
        });
      });
      console.log('');
    } else {
      console.log(`❌ Matrix calculation failed: ${matrixResult.error}\n`);
    }
  } catch (error) {
    console.log(`❌ Matrix test error: ${error.message}\n`);
  }

  // Test 3: Group itinerary planning
  console.log('👥 Test 3: Plan group meetup itinerary');
  try {
    const participants = [
      { id: 'user1', name: 'Alice', lat: 43.6532, lng: -79.3832 }, // Toronto
      { id: 'user2', name: 'Bob', lat: 45.5017, lng: -73.5673 },   // Montreal
      { id: 'user3', name: 'Charlie', lat: 45.4215, lng: -75.6972 } // Ottawa
    ];

    const meetingTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now

    const itineraryResult = await directionsService.planGroupItinerary({
      participants,
      destination: 'Kingston, ON, Canada', // Meeting point between the cities
      meetingTime,
      mode: 'driving'
    });

    if (itineraryResult.success) {
      console.log('✅ Group itinerary planned:');
      console.log(`   Meeting point: ${itineraryResult.data.meetingPoint}`);
      console.log(`   Meeting time: ${itineraryResult.data.meetingTime}`);
      console.log('   Departure times:');
      
      itineraryResult.data.participants.forEach(participant => {
        if (!participant.error) {
          console.log(`   - ${participant.participantName}: Leave at ${new Date(participant.departureTime).toLocaleTimeString()} (${participant.travelTime} journey)`);
        } else {
          console.log(`   - ${participant.participantName}: ❌ ${participant.error}`);
        }
      });
      console.log('');
    } else {
      console.log(`❌ Itinerary planning failed: ${itineraryResult.error}\n`);
    }
  } catch (error) {
    console.log(`❌ Itinerary test error: ${error.message}\n`);
  }

  // Test 4: Find optimal meeting point
  console.log('📍 Test 4: Find optimal meeting point');
  try {
    const participants = [
      { id: 'user1', name: 'Alice', lat: 43.6532, lng: -79.3832 }, // Toronto
      { id: 'user2', name: 'Bob', lat: 45.5017, lng: -73.5673 },   // Montreal
      { id: 'user3', name: 'Charlie', lat: 44.2312, lng: -76.4860 } // Kingston
    ];

    const meetingPointResult = await directionsService.findOptimalMeetingPoint(
      participants,
      { maxTravelTimeMinutes: 120 }
    );

    if (meetingPointResult.success) {
      console.log('✅ Optimal meeting point found:');
      console.log(`   Location: ${meetingPointResult.data.suggestedMeetingPoint.lat}, ${meetingPointResult.data.suggestedMeetingPoint.lng}`);
      console.log(`   Max travel time: ${meetingPointResult.data.summary.maxTravelTimeMinutes} minutes`);
      console.log(`   Average travel time: ${meetingPointResult.data.summary.avgTravelTimeMinutes} minutes`);
      console.log('   Travel times:');
      
      meetingPointResult.data.travelTimes.forEach(travel => {
        console.log(`   - ${travel.participantName}: ${travel.travelTime} (${travel.distance})`);
      });
      console.log('');
    } else {
      console.log(`❌ Meeting point calculation failed: ${meetingPointResult.error}\n`);
    }
  } catch (error) {
    console.log(`❌ Meeting point test error: ${error.message}\n`);
  }

  console.log('🏁 Testing complete!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDirectionsAPI().catch(console.error);
}

module.exports = { testDirectionsAPI };