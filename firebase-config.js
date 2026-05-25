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

// IMPORTANT:
// Replace these placeholder emails with the real Google emails each person will use to sign in.
// The same emails must also be copied into firestore.rules and storage.rules.
export const FAMILY_MEMBERS = [
  { name: "Elad", email: "REPLACE_ELAD_EMAIL@gmail.com", role: "Owner" },
  { name: "Maayan", email: "REPLACE_MAAYAN_EMAIL@gmail.com", role: "Admin" },
  { name: "Michal", email: "REPLACE_MICHAL_EMAIL@gmail.com", role: "Viewer" },
  { name: "Maya", email: "REPLACE_MAYA_EMAIL@gmail.com", role: "Viewer" },
  { name: "Daniel", email: "REPLACE_DANIEL_EMAIL@gmail.com", role: "Viewer" }
];
