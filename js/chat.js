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
const roomId = 'main';

// Initialize chat
async function initChat() {
  try {
    // Get current user
    currentUser = auth.currentUser;
    
    if (!currentUser) {
      const uid = localStorage.getItem('uid');
      if (uid) {
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
      
      if (userProfile.theme) {
        document.body.dataset.theme = userProfile.theme;
      }
      
      await db.collection('users').doc(currentUser.uid).update({
        online: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
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
    
    roomNameElement.textContent = 'CORUSCANT_CENTRAL';
    loadMessages();
    setupOnlineUsers();
    setupMessageInput();
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
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          displayMessage(change.doc.data());
        }
      });
      
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
  sendButton.addEventListener('click', sendMessage);
  
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// Send message function
async function sendMessage() {
  const text = messageInput.value.trim();
  
  if (!text) return;
  
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
    
    await db.collection('messages').add(message);
    messageInput.value = '';
    
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  } finally {
    messageInput.disabled = false;
    sendButton.disabled = false;
    sendButton.textContent = 'SEND';
    messageInput.focus();
  }
}

// Setup page visibility handler
function setupVisibilityHandler() {
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      await updateOnlineStatus(false);
    } else {
      await updateOnlineStatus(true);
    }
  });
  
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
    if (currentUser) {
      await updateOnlineStatus(false);
    }
    
    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeOnline) unsubscribeOnline();
    
    await auth.signOut();
    localStorage.removeItem('uid');
    localStorage.removeItem('userEmail');
    window.location.href = 'login.html';
    
  } catch (error) {
    console.error('Logout error:', error);
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
    window.location.href = 'login.html';
  }
});
