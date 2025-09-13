// Auth utility with stubbed client-side functions.
// NOTE: Do not implement server logic here. These stubs explain the
// intended server endpoints and client behavior. The server folder must
// not be modified per instructions.

export type Credentials = { email: string; password: string };

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
 * loginWithGoogle
 * - Initiates Google OAuth.
 * - On native: Use Google auth flow to obtain an id_token/access_token.
 * - Then POST token to server `/api/auth/google` for verification and session issuance.
 * - On success, store the returned session token.
 */
export async function loginWithGoogle(): Promise<void> {
  // TODO: Implement client-side Google auth flow using expo-auth-session or similar.
  // After obtaining Google credentials, exchange with your server:
  // await fetch(`${API_BASE_URL}/api/auth/google`, { method: 'POST', body: JSON.stringify({ id_token }) })
}

/**
 * signout
 * - Optionally POST to `/api/auth/logout` to invalidate the session server-side.
 * - Clear stored token locally.
 */
export async function signout(): Promise<void> {
  // TODO: Clear local session and optionally notify server of logout.
}


