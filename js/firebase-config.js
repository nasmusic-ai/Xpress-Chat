// Your Firebase configuration - replace with your own
const firebaseConfig = {
  apiKey: "AIzaSyC-5JP7gDCofoYyXv2rCVJDYBTL4Ydqmt0",
  authDomain: "xpress-chatv1.firebaseapp.com",
  projectId: "xpress-chatv1",
  storageBucket: "xpress-chatv1.firebasestorage.app",
  messagingSenderId: "118218510976",
  appId: "1:118218510976:web:4ab217a909285f52828c65",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

// Export Firebase services
export { auth, db, analytics };