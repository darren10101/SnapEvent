/**
 * Test script for transport settings API endpoints
 * Run this script to verify the transport settings functionality
 */

const API_BASE_URL = 'http://localhost:3000';

// Test data
const testUserId = 'test_google_id_123';
const testToken = 'test_jwt_token'; // Replace with actual token for testing

async function testTransportSettingsAPI() {
  console.log('🧪 Testing Transport Settings API...\n');

  try {
    // Test 1: Get transport settings for non-existent user
    console.log('1️⃣ Testing GET transport settings (should return 404 for non-existent user)');
    const getResponse1 = await fetch(`${API_BASE_URL}/api/users/${testUserId}/transport-settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`   Status: ${getResponse1.status}`);
    if (getResponse1.status === 404) {
      console.log('   ✅ Correctly returned 404 for non-existent user\n');
    } else {
      console.log('   ❌ Unexpected response for non-existent user\n');
    }

    // Test 2: Create a test user first
    console.log('2️⃣ Creating test user');
    const createUserResponse = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        googleId: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        transportModes: ['walking', 'transit']
      }),
    });
    console.log(`   Status: ${createUserResponse.status}`);
    if (createUserResponse.status === 201) {
      console.log('   ✅ Test user created successfully\n');
    } else {
      const errorData = await createUserResponse.json();
      console.log(`   ⚠️ User creation response: ${JSON.stringify(errorData, null, 2)}\n`);
    }

    // Test 3: Get transport settings for existing user
    console.log('3️⃣ Testing GET transport settings for existing user');
    const getResponse2 = await fetch(`${API_BASE_URL}/api/users/${testUserId}/transport-settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`   Status: ${getResponse2.status}`);
    if (getResponse2.ok) {
      const getData = await getResponse2.json();
      console.log(`   ✅ Transport settings: ${JSON.stringify(getData.data, null, 2)}\n`);
    } else {
      console.log('   ❌ Failed to get transport settings\n');
    }

    // Test 4: Update transport settings
    console.log('4️⃣ Testing PUT transport settings');
    const updateResponse = await fetch(`${API_BASE_URL}/api/users/${testUserId}/transport-settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transportModes: ['driving', 'bicycling', 'walking']
      }),
    });
    console.log(`   Status: ${updateResponse.status}`);
    if (updateResponse.ok) {
      const updateData = await updateResponse.json();
      console.log(`   ✅ Updated transport settings: ${JSON.stringify(updateData.data, null, 2)}\n`);
    } else {
      const errorData = await updateResponse.json();
      console.log(`   ❌ Failed to update: ${JSON.stringify(errorData, null, 2)}\n`);
    }

    // Test 5: Verify the update
    console.log('5️⃣ Verifying updated transport settings');
    const verifyResponse = await fetch(`${API_BASE_URL}/api/users/${testUserId}/transport-settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log(`   ✅ Verified settings: ${JSON.stringify(verifyData.data, null, 2)}\n`);
    } else {
      console.log('   ❌ Failed to verify settings\n');
    }

    // Test 6: Test invalid transport modes
    console.log('6️⃣ Testing invalid transport modes');
    const invalidResponse = await fetch(`${API_BASE_URL}/api/users/${testUserId}/transport-settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transportModes: ['invalid_mode', 'another_invalid']
      }),
    });
    console.log(`   Status: ${invalidResponse.status}`);
    if (invalidResponse.status === 400) {
      const errorData = await invalidResponse.json();
      console.log(`   ✅ Correctly rejected invalid modes: ${errorData.error}\n`);
    } else {
      console.log('   ❌ Should have rejected invalid transport modes\n');
    }

    // Test 7: Test empty transport modes
    console.log('7️⃣ Testing empty transport modes');
    const emptyResponse = await fetch(`${API_BASE_URL}/api/users/${testUserId}/transport-settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transportModes: []
      }),
    });
    console.log(`   Status: ${emptyResponse.status}`);
    if (emptyResponse.status === 400) {
      const errorData = await emptyResponse.json();
      console.log(`   ✅ Correctly rejected empty modes: ${errorData.error}\n`);
    } else {
      console.log('   ❌ Should have rejected empty transport modes\n');
    }

    console.log('🎉 Transport Settings API tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Export for use in other test files
module.exports = { testTransportSettingsAPI };

// Run tests if this file is executed directly
if (require.main === module) {
  testTransportSettingsAPI();
}