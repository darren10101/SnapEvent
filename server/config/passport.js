const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const DynamoDBService = require('../services/dynamodb');

// Initialize DynamoDB service for users
const usersDB = new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users');

// Passport configuration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://10.37.96.184:3000/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google OAuth profile received:', {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName
    });

    // Check if user already exists
    let user = await usersDB.getItem({ id: profile.id });
    
    if (user) {
      // Update existing user's login time and profile info
      const updatedUser = await usersDB.updateItem(
        { id: profile.id },
        'SET lastLogin = :lastLogin, #name = :name, picture = :picture',
        {
          ':lastLogin': new Date().toISOString(),
          ':name': profile.displayName,
          ':picture': profile.photos?.[0]?.value || user.picture
        },
        {
          '#name': 'name'
        }
      );
      
      // Merge updated attributes with existing user data
      user = { ...user, ...updatedUser };
      console.log('Updated existing user:', user.id);
    } else {
      // Create new user
      user = {
        id: profile.id, // Google ID as primary key
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        picture: profile.photos?.[0]?.value || null,
        lat: null,
        lng: null,
        availability: [],
        friends: [],
        authProvider: 'google',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      await usersDB.putItem(user);
      console.log('Created new user:', user.id);
    }
    
    return done(null, user);
  } catch (error) {
    console.error('Error in Google OAuth strategy:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await usersDB.getItem({ id });
    done(null, user);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
});

module.exports = passport;