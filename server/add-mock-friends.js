const DynamoDBService = require('./services/dynamodb');
require('dotenv').config();

const usersDB = new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users');

async function addMockFriends() {
  try {
    // First, get existing users
    const existingUsers = await usersDB.scanTable();
    console.log('Current users in database:');
    existingUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ID: ${user.id}`);
    });
    console.log(`Total existing users: ${existingUsers.length}`);
    
    // UofT coordinates: 43.6629, -79.3957
    // McMaster coordinates: 43.2609, -79.9192
    
    const mockFriend1 = {
      id: 'mock_uoft_student_001',
      email: 'alex.student@mail.utoronto.ca',
      name: 'Alex Chen',
      picture: null,
      lat: 43.6629,
      lng: -79.3957,
      availability: [],
      friends: existingUsers.map(user => user.id), // Friends with all existing users
      transportModes: ['transit', 'bicycling', 'walking'], // Only bus, bike, walk
      authProvider: 'mock',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    const mockFriend2 = {
      id: 'mock_mcmaster_student_001', 
      email: 'jordan.miller@mcmaster.ca',
      name: 'Jordan Miller',
      picture: null,
      lat: 43.2609,
      lng: -79.9192,
      availability: [],
      friends: existingUsers.map(user => user.id), // Friends with all existing users
      transportModes: ['transit', 'bicycling', 'walking'], // Only bus, bike, walk
      authProvider: 'mock',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    // Add the mock friends
    console.log('\nAdding mock friends...');
    await usersDB.putItem(mockFriend1);
    console.log(`✓ Added ${mockFriend1.name} at UofT`);
    
    await usersDB.putItem(mockFriend2);
    console.log(`✓ Added ${mockFriend2.name} at McMaster`);

    // Now update all existing users to be friends with the new mock friends
    console.log('\nUpdating existing users to be friends with mock friends...');
    const newFriendIds = [mockFriend1.id, mockFriend2.id];
    
    for (const user of existingUsers) {
      const currentFriends = user.friends || [];
      const updatedFriends = [...new Set([...currentFriends, ...newFriendIds])];
      
      await usersDB.updateItem(
        { id: user.id },
        'SET friends = :friends',
        { ':friends': updatedFriends }
      );
      
      console.log(`✓ Updated ${user.name} friends list`);
    }

    console.log('\n✅ Successfully added mock friends and updated all friendships!');
    
    // Show final state
    const allUsers = await usersDB.scanTable();
    console.log(`\nTotal users now: ${allUsers.length}`);
    
  } catch (error) {
    console.error('Error adding mock friends:', error.message);
  }
}

addMockFriends();