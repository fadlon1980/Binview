// BinView Firebase Cloud Configuration
// 1) Create a Firebase project.
// 2) Add a Web App in Firebase Project Settings.
// 3) Copy your Firebase config values below.
// 4) Replace the family member emails with real Google emails.

export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

export const FAMILY_ID = "fadlon-family";

// IMPORTANT: these emails must match the emails in firestore.rules and storage.rules.
// Use the Google email each family member will use to sign in.
export const FAMILY_MEMBERS = [
  { name: "Elad", email: "REPLACE_ELAD_EMAIL@gmail.com", role: "Owner" },
  { name: "Maayan", email: "REPLACE_MAAYAN_EMAIL@gmail.com", role: "Admin" },
  { name: "Michal", email: "REPLACE_MICHAL_EMAIL@gmail.com", role: "Viewer" },
  { name: "Maya", email: "REPLACE_MAYA_EMAIL@gmail.com", role: "Viewer" },
  { name: "Daniel", email: "REPLACE_DANIEL_EMAIL@gmail.com", role: "Viewer" }
];
