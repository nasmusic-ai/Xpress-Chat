// firebase.js (Firebase v9 - PRODUCTION)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-5JP7gDCofoYyXv2rCVJDYBTL4Ydqmt0",
  authDomain: "xpress-chatv1.firebaseapp.com",
  projectId: "xpress-chatv1",
  storageBucket: "xpress-chatv1.firebasestorage.app",
  messagingSenderId: "118218510976",
  appId: "1:118218510976:web:4ab217a909285f52828c65"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
