const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function addMockFriendsViaAPI() {
  const BASE_URL = 'http://10.37.96.184:3000/api';
  
  try {
    // First, get existing users to make them all friends
    console.log('Fetching existing users...');
    const usersResponse = await fetch(`${BASE_URL}/users`);
    const usersData = await usersResponse.json();
    
    if (!usersData.success) {
      throw new Error('Failed to fetch existing users');
    }
    
    const existingUsers = usersData.data;
    console.log('Current users:');
    existingUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ID: ${user.id}`);
    });
    console.log(`Total existing users: ${existingUsers.length}`);
    
    // Prepare mock friends data
    const mockFriend1 = {
      googleId: 'mock_uoft_student_001',
      email: 'alex.student@mail.utoronto.ca',
      name: 'Alex Chen',
      picture: null,
      lat: 43.6629, // UofT coordinates
      lng: -79.3957,
      availability: [],
      friends: existingUsers.map(user => user.id),
      transportModes: ['transit', 'bicycling', 'walking'] // Only bus, bike, walk
    };

    const mockFriend2 = {
      googleId: 'mock_mcmaster_student_001',
      email: 'jordan.miller@mcmaster.ca', 
      name: 'Jordan Miller',
      picture: null,
      lat: 43.2609, // McMaster coordinates
      lng: -79.9192,
      availability: [],
      friends: existingUsers.map(user => user.id),
      transportModes: ['transit', 'bicycling', 'walking'] // Only bus, bike, walk
    };

    // Add mock friend 1
    console.log('\nAdding Alex Chen (UofT student)...');
    const response1 = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockFriend1)
    });
    
    const result1 = await response1.json();
    if (result1.success) {
      console.log(`✓ Added ${mockFriend1.name} at UofT`);
    } else {
      console.log(`Failed to add ${mockFriend1.name}:`, result1.error);
    }

    // Add mock friend 2  
    console.log('Adding Jordan Miller (McMaster student)...');
    const response2 = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockFriend2)
    });
    
    const result2 = await response2.json();
    if (result2.success) {
      console.log(`✓ Added ${mockFriend2.name} at McMaster`);
    } else {
      console.log(`Failed to add ${mockFriend2.name}:`, result2.error);
    }

    // Update existing users to be friends with the new mock friends
    console.log('\nUpdating existing users to be friends with mock friends...');
    const newFriendIds = [mockFriend1.googleId, mockFriend2.googleId];
    
    for (const user of existingUsers) {
      try {
        const currentFriends = user.friends || [];
        const updatedFriends = [...new Set([...currentFriends, ...newFriendIds])];
        
        const updateResponse = await fetch(`${BASE_URL}/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            friends: updatedFriends
          })
        });
        
        const updateResult = await updateResponse.json();
        if (updateResult.success) {
          console.log(`✓ Updated ${user.name} friends list`);
        } else {
          console.log(`Failed to update ${user.name}:`, updateResult.error);
        }
      } catch (error) {
        console.log(`Error updating ${user.name}:`, error.message);
      }
    }

    console.log('\n✅ Mock friends setup complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addMockFriendsViaAPI();