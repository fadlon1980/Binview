// BinView Firebase Cloud Configuration
// This file is used directly by the GitHub Pages static app.
// Do not add Firebase npm imports here. app.js imports the Firebase browser SDK from Google's CDN.

export const firebaseConfig = {
  apiKey: "AIzaSyDQCK3SF2VV6-yjNxYO9-tmjt_YlxroTXY",
  authDomain: "binvie.firebaseapp.com",
  projectId: "binvie",
  storageBucket: "binvie.firebasestorage.app",
  messagingSenderId: "312648958039",
  appId: "1:312648958039:web:eec239d186c5e7a289a312"
};

export const FAMILY_ID = "fadlon-family";

// Approved family members for this first cloud version.
// Only these Google accounts can use the app and access bins/photos.
export const FAMILY_MEMBERS = [
  { name: "Elad", email: "fadlon1980@gmail.com", role: "Owner" },
  { name: "Maayan", email: "fadlonmay@gmail.com", role: "Admin" }
];
