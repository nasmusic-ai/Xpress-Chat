import { auth, db } from './firebase-config.js';

// DOM Elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const avatarInput = document.getElementById('avatar');

// Show message function
function showMessage(message, type = 'error') {
  // Remove existing messages
  const existingMsg = document.querySelector('.message');
  if (existingMsg) existingMsg.remove();
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${type}`;
  msgDiv.textContent = message;
  
  const container = document.querySelector('.login-container');
  container.insertBefore(msgDiv, container.firstChild.nextSibling);
  
  // Auto-remove after 5 seconds
  if (type !== 'error') {
    setTimeout(() => msgDiv.remove(), 5000);
  }
}

// Handle user registration
async function handleSignUp() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const avatar = avatarInput.value.trim();
  
  // Basic validation
  if (!email || !password) {
    showMessage('Please enter email and password');
    return;
  }
  
  if (password.length < 6) {
    showMessage('Password must be at least 6 characters');
    return;
  }
  
  try {
    // Create user with email and password
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore
    await db.collection('users').doc(user.uid).set({
      email: email,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
      displayName: email.split('@')[0],
      uid: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      theme: 'light'
    });
    
    // Store user ID in localStorage for persistence
    localStorage.setItem('uid', user.uid);
    localStorage.setItem('userEmail', email);
    
    showMessage('Registration successful! Redirecting...', 'success');
    
    // Redirect to chat
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    
  } catch (error) {
    console.error('Signup error:', error);
    
    // User-friendly error messages
    switch(error.code) {
      case 'auth/email-already-in-use':
        showMessage('Email already registered. Please login.');
        break;
      case 'auth/invalid-email':
        showMessage('Invalid email format.');
        break;
      case 'auth/weak-password':
        showMessage('Password is too weak.');
        break;
      default:
        showMessage(`Error: ${error.message}`);
    }
  }
}

// Handle user login
async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!email || !password) {
    showMessage('Please enter email and password');
    return;
  }
  
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Store user ID in localStorage
    localStorage.setItem('uid', user.uid);
    localStorage.setItem('userEmail', email);
    
    showMessage('Login successful! Redirecting...', 'success');
    
    // Redirect to chat
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    
  } catch (error) {
    console.error('Login error:', error);
    
    switch(error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        showMessage('Invalid email or password.');
        break;
      case 'auth/user-disabled':
        showMessage('Account has been disabled.');
        break;
      default:
        showMessage(`Error: ${error.message}`);
    }
  }
}

// Make functions globally available
window.handleSignUp = handleSignUp;
window.handleLogin = handleLogin;

// Enable form submission with Enter key
emailInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') passwordInput.focus();
});

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLogin();
});

avatarInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSignUp();
});

// Auto-focus email input on page load
window.addEventListener('DOMContentLoaded', () => {
  emailInput.focus();
});