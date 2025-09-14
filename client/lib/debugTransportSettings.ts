import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Debug helper to test transport settings API connection
 * Call this function to diagnose connection issues
 */
export const debugTransportSettings = async () => {
  console.log('🔍 Debugging Transport Settings Connection...');
  
  try {
    // Check environment variables
    const API_BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';
    console.log('📡 API Base URL:', API_BASE_URL);
    
    // Check stored auth data
    const token = await AsyncStorage.getItem('authToken');
    const userData = await AsyncStorage.getItem('userData');
    
    console.log('🔑 Auth Token exists:', !!token);
    console.log('👤 User Data exists:', !!userData);
    
    if (userData) {
      const user = JSON.parse(userData);
      console.log('👤 User ID:', user.id || user.googleId);
      console.log('📧 User Email:', user.email);
    }
    
    if (!token) {
      console.log('❌ No auth token found - user needs to login');
      return;
    }
    
    if (!userData) {
      console.log('❌ No user data found - user needs to login');
      return;
    }
    
    const user = JSON.parse(userData);
    const userId = user.id || user.googleId;
    
    if (!userId) {
      console.log('❌ No user ID found in stored data');
      return;
    }
    
    // Test basic server connectivity
    console.log('🌐 Testing server connectivity...');
    try {
      const pingResponse = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📊 Server ping status:', pingResponse.status);
      
      if (pingResponse.ok) {
        console.log('✅ Server is reachable');
      } else {
        console.log('❌ Server returned error:', pingResponse.statusText);
        const errorText = await pingResponse.text();
        console.log('❌ Error details:', errorText);
      }
    } catch (error) {
      console.log('❌ Server connectivity failed:', error instanceof Error ? error.message : String(error));
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.log('💡 Possible causes:');
        console.log('   - Server not running');
        console.log('   - Wrong API URL:', API_BASE_URL);
        console.log('   - Network connectivity issues');
        console.log('   - CORS issues');
      }
      return;
    }
    
    // Test transport settings endpoint specifically
    console.log('🚗 Testing transport settings endpoint...');
    try {
      const transportResponse = await fetch(`${API_BASE_URL}/api/users/${userId}/transport-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🚗 Transport settings status:', transportResponse.status);
      
      if (transportResponse.ok) {
        const data = await transportResponse.json();
        console.log('✅ Transport settings response:', data);
      } else {
        console.log('❌ Transport settings error:', transportResponse.statusText);
        const errorText = await transportResponse.text();
        console.log('❌ Error details:', errorText);
      }
    } catch (error) {
      console.log('❌ Transport settings request failed:', error instanceof Error ? error.message : String(error));
    }
    
    console.log('🔍 Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug function failed:', error);
  }
};

// Export for easy access
export default debugTransportSettings;