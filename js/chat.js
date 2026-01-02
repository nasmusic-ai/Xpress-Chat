import { auth, db } from './firebase-config.js';

// DOM Elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('msg');
const sendButton = document.querySelector('.inputBar button');
const roomNameElement = document.getElementById('roomName');
const onlineCountElement = document.getElementById('onlineCount');

// Global variables
let currentUser = null;
let userProfile = null;
let unsubscribeMessages = null;
let unsubscribeOnline = null;
const roomId = 'main'; // Single chat room

// Initialize chat
async function initChat() {
  try {
    // Get current user
    currentUser = auth.currentUser;
    
    if (!currentUser) {
      // Try to get user from localStorage
      const uid = localStorage.getItem('uid');
      if (uid) {
        // Re-authenticate from localStorage
        await auth.signInAnonymously().catch(() => {
          window.location.href = 'login.html';
        });
        currentUser = auth.currentUser;
      } else {
        window.location.href = 'login.html';
        return;
      }
    }
    
    // Load user profile
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists) {
      userProfile = userDoc.data();
      
      // Apply saved theme
      if (userProfile.theme) {
        document.body.dataset.theme = userProfile.theme;
      }
      
      // Update online status
      await db.collection('users').doc(currentUser.uid).update({
        online: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create basic profile if missing
      userProfile = {
        displayName: currentUser.email?.split('@')[0] || 'User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
        theme: 'light'
      };
      await db.collection('users').doc(currentUser.uid).set({
        ...userProfile,
        uid: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        online: true
      });
    }
    
    // Set room name
    roomNameElement.textContent = 'CORUSCANT_CENTRAL';
    
    // Load messages
    loadMessages();
    
    // Setup online users listener
    setupOnlineUsers();
    
    // Set up message input handler
    setupMessageInput();
    
    // Handle page visibility/close
    setupVisibilityHandler();
    
  } catch (error) {
    console.error('Chat initialization error:', error);
    alert('Failed to initialize chat. Please refresh.');
  }
}

// Load and listen for messages
function loadMessages() {
  unsubscribeMessages = db.collection('messages')
    .where('roomId', '==', roomId)
    .orderBy('timestamp', 'asc')
    .limit(100)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          displayMessage(change.doc.data());
        }
      });
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }, (error) => {
      console.error('Message listener error:', error);
    });
}

// Display a single message
function displayMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.senderId === currentUser.uid ? 'own' : ''}`;
  
  const time = message.timestamp ? 
    new Date(message.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
    'Just now';
  
  messageDiv.innerHTML = `
    <div class="sender">${message.senderName}</div>
    ${message.text}
    <div class="time">${time}</div>
  `;
  
  messagesContainer.appendChild(messageDiv);
}

// Setup online users listener
function setupOnlineUsers() {
  unsubscribeOnline = db.collection('users')
    .where('online', '==', true)
    .onSnapshot((snapshot) => {
      const onlineCount = snapshot.size;
      onlineCountElement.textContent = `Online: ${onlineCount}`;
    });
}

// Setup message input handling
function setupMessageInput() {
  // Send button click
  sendButton.addEventListener('click', sendMessage);
  
  // Enter key press
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Auto-resize input (for future multi-line support)
  messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });
}

// Send message function
async function sendMessage() {
  const text = messageInput.value.trim();
  
  if (!text) return;
  
  // Disable input while sending
  messageInput.disabled = true;
  sendButton.disabled = true;
  sendButton.textContent = 'SENDING...';
  
  try {
    const message = {
      text: text,
      senderId: currentUser.uid,
      senderName: userProfile.displayName || currentUser.email?.split('@')[0] || 'User',
      senderAvatar: userProfile.avatar,
      roomId: roomId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Add message to Firestore
    await db.collection('messages').add(message);
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  } finally {
    // Re-enable input
    messageInput.disabled = false;
    sendButton.disabled = false;
    sendButton.textContent = 'SEND';
    messageInput.focus();
  }
}

// Setup page visibility handler
function setupVisibilityHandler() {
  // Handle tab visibility change
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      // User switched tabs or minimized window
      await updateOnlineStatus(false);
    } else {
      // User returned
      await updateOnlineStatus(true);
    }
  });
  
  // Handle page unload
  window.addEventListener('beforeunload', async () => {
    await updateOnlineStatus(false);
  });
}

// Update user's online status
async function updateOnlineStatus(online) {
  if (!currentUser) return;
  
  try {
    await db.collection('users').doc(currentUser.uid).update({
      online: online,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating online status:', error);
  }
}

// Switch theme (Jedi/Sith)
async function switchSide(side) {
  document.body.dataset.theme = side;
  
  // Save theme preference
  if (currentUser) {
    try {
      await db.collection('users').doc(currentUser.uid).update({
        theme: side
      });
      userProfile.theme = side;
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }
}

// Logout function
async function logout() {
  try {
    // Update online status to false
    if (currentUser) {
      await updateOnlineStatus(false);
    }
    
    // Unsubscribe from listeners
    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeOnline) unsubscribeOnline();
    
    // Sign out from Firebase
    await auth.signOut();
    
    // Clear localStorage
    localStorage.removeItem('uid');
    localStorage.removeItem('userEmail');
    
    // Redirect to login
    window.location.href = 'login.html';
    
  } catch (error) {
    console.error('Logout error:', error);
    // Force redirect anyway
    window.location.href = 'login.html';
  }
}

// Override the placeholder send function
window.send = sendMessage;
window.switchSide = switchSide;
window.logout = logout;

// Initialize chat when page loads
window.addEventListener('DOMContentLoaded', initChat);

// Handle Firebase auth state changes
auth.onAuthStateChanged((user) => {
  if (!user && window.location.pathname.endsWith('index.html')) {
    // User signed out while on chat page
    window.location.href = 'login.html';
  }
});