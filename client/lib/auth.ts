// Auth utility with stubbed client-side functions.
// NOTE: Do not implement server logic here. These stubs explain the
// intended server endpoints and client behavior. The server folder must
// not be modified per instructions.

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export type Credentials = { email: string; password: string };

// Google OAuth configuration
// TODO: Replace with your actual Google OAuth client ID from Google Cloud Console
// Instructions:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select existing one
// 3. Enable Google+ API or People API
// 4. Create OAuth 2.0 credentials
// 5. Add your redirect URI: snapevent://
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * loginWithEmail
 * - Sends POST to server endpoint `/api/auth/login` with JSON body { email, password }.
 * - On success, expects a JSON response containing user info and a session token.
 * - The token should be persisted (e.g., SecureStore/AsyncStorage) for authenticated requests.
 */
export async function loginWithEmail(_credentials: Credentials): Promise<void> {
  // TODO: Replace with actual HTTP call to your server when available.
  // Example:
  // const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(_credentials),
  // });
  // if (!response.ok) throw new Error('Invalid email or password');
  // const { token, user } = await response.json();
  // await SecureStore.setItemAsync('authToken', token);
}

/**
 * signupWithEmail
 * - Sends POST to server endpoint `/api/auth/signup` with JSON body { email, password }.
 * - On success, expects JSON with user record and session token to store.
 */
export async function signupWithEmail(_credentials: Credentials): Promise<void> {
  // TODO: Replace with server call.
}

/**
 * Configuration constants
 */
const IP_ADDRESS = process.env.EXPO_PUBLIC_IP_ADDRESS || '10.37.96.184'; // Fallback IP address
const SERVER_PORT = process.env.EXPO_PUBLIC_SERVER_PORT || '3000';
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || `http://${IP_ADDRESS}.nip.io:${SERVER_PORT}`;

/**
 * loginWithGoogle
 * - Initiates Google OAuth using the server's Passport.js authentication.
 * - Opens the server's Google OAuth endpoint in a web browser.
 * - Handles the callback to extract the token from the redirect.
 */
export async function loginWithGoogle(): Promise<any> {
  try {
    // Create the redirect URI that matches your app scheme
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'snapevent',
      path: 'auth/callback'
    });

    console.log('Redirect URI:', redirectUri);

    // Start the authentication session with your server
    const authUrl = `${SERVER_URL}/auth/google?mobile=true`;
    
    console.log('Opening auth URL:', authUrl);

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    console.log('Auth result:', result);

    if (result.type === 'success') {
      const { url } = result;
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      const userStr = urlObj.searchParams.get('user');
      const error = urlObj.searchParams.get('error');

      if (error) {
        throw new Error(`Authentication failed: ${error}`);
      }

      if (token && userStr) {
        const user = JSON.parse(decodeURIComponent(userStr));
        
        console.log('Google login successful:', user);
        console.log('Token received:', token);
        
        // TODO: Store the token securely
        // await SecureStore.setItemAsync('authToken', token);
        // await SecureStore.setItemAsync('user', JSON.stringify(user));

        return { user, token };
      } else {
        throw new Error('No token received from authentication');
      }
    } else if (result.type === 'cancel') {
      throw new Error('Google login was cancelled');
    } else {
      throw new Error('Google login failed');
    }
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}

/**
 * signout
 * - Optionally POST to `/api/auth/logout` to invalidate the session server-side.
 * - Clear stored token locally.
 */
export async function signout(): Promise<void> {
  // TODO: Clear local session and optionally notify server of logout.
}