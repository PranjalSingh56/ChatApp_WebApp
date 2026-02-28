const token = sessionStorage.getItem('token');
const user = JSON.parse(sessionStorage.getItem('user'));

if (!token || !user) {
    window.location.href = 'login.html';
}

const socket = io({
    auth: { token }
});

let activeThread = null;
let currentReceiverId = null;

// DOM Elements
const threadList = document.getElementById('thread-list');
const chatMessages = document.getElementById('chat-messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const activeChatName = document.getElementById('active-chat-name');
const activeChatPhone = document.getElementById('active-chat-phone');
const chatActions = document.getElementById('chat-actions');
const phoneSearch = document.getElementById('phone-search');

// Initial Load
async function init() {
    loadThreads();
}

async function loadThreads() {
    try {
        const res = await fetch('/api/chat/threads', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const threads = await res.json();
        renderThreads(threads);
    } catch (err) {
        console.error(err);
    }
}

function renderThreads(threads) {
    threadList.innerHTML = threads.map(thread => {
        const otherParticipant = thread.participants.find(p => p._id !== user._id);
        if (!otherParticipant) return '';

        return `
            <div class="thread-item ${activeThread === thread._id ? 'active' : ''}" 
                 data-id="${thread._id}"
                 onclick="selectThread('${thread._id}', '${otherParticipant._id}', '${otherParticipant.name}', '${otherParticipant.phoneNumber}')">
                <div class="user-profile-btn" style="width: 35px; height: 35px;">${otherParticipant.name[0]}</div>
                <div class="thread-info">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="thread-name">${otherParticipant.name}</div>
                        <span class="unread-badge">New</span>
                    </div>
                    <div class="thread-last-msg">${thread.lastMessages || 'No messages yet'}</div>
                </div>
            </div>
        `;
    }).join('');
}

async function selectThread(threadId, receiverId, name, phone) {
    activeThread = threadId;
    currentReceiverId = receiverId;
    activeChatName.innerText = name;
    activeChatPhone.innerText = phone;
    messageForm.style.display = 'flex';
    chatActions.style.display = 'block';

    if (threadId) {
        socket.emit('join_thread', threadId);
        // Clear unread status locally
        const threadEl = document.querySelector(`.thread-item[data-id="${threadId}"]`);
        if (threadEl) threadEl.classList.remove('unread');
    }

    // Highlight active thread
    document.querySelectorAll('.thread-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.thread-item[data-id="${threadId}"]`);
    if (activeEl) activeEl.classList.add('active');

    loadMessages(threadId);
}

async function loadMessages(threadId) {
    if (!threadId) return;
    try {
        const res = await fetch(`/api/chat/messages/${threadId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();
        renderMessages(messages);
    } catch (err) {
        console.error(err);
    }
}

function renderMessages(messages) {
    chatMessages.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender === user._id ? 'sent' : 'received'}">
            ${msg.message}
        </div>
    `).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value;
    if (!message || !currentReceiverId) return;

    try {
        const res = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ receiver: currentReceiverId, message })
        });
        const newMsg = await res.json();
        // appendMessage(newMsg); // Removed, handled by socket for consistency
        messageInput.value = '';
        if (!activeThread && newMsg.thread) {
            activeThread = newMsg.thread;
            socket.emit('join_thread', activeThread);
        }
        loadThreads(); // Refresh threads for last message
    } catch (err) {
        console.error(err);
    }
});

function appendMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.sender === user._id ? 'sent' : 'received'}`;
    div.innerText = msg.message;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Phone Search
phoneSearch.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const phone = phoneSearch.value.trim();
        if (!phone) return;

        try {
            const res = await fetch(`/api/user/search/${phone}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const foundUser = await res.json();
            if (res.ok) {
                // Check if thread already exists
                selectThread(null, foundUser._id, foundUser.name, foundUser.phoneNumber);
                chatMessages.innerHTML = ''; // Start clean for new user
            } else {
                alert('User not found');
            }
        } catch (err) {
            console.error(err);
        }
    }
});

// Profile Logic
function openProfile() {
    document.getElementById('profile-name').value = user.name;
    document.getElementById('profile-email').value = user.email;
    document.getElementById('profile-phone').value = user.phoneNumber;
    document.getElementById('profile-modal').style.display = 'flex';
}

function closeProfile() {
    document.getElementById('profile-modal').style.display = 'none';
}

async function updateProfile() {
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const phoneNumber = document.getElementById('profile-phone').value;

    try {
        const res = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, phoneNumber })
        });
        const updated = await res.json();
        if (res.ok) {
            sessionStorage.setItem('user', JSON.stringify(updated));
            alert('Profile updated');
            closeProfile();
        } else {
            alert(updated.message);
        }
    } catch (err) {
        console.error(err);
    }
}

async function clearCurrentChat() {
    if (!activeThread) return;
    if (!confirm('Are you sure you want to clear this chat?')) return;

    try {
        await fetch(`/api/chat/clear/${activeThread}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        chatMessages.innerHTML = '';
        loadThreads();
    } catch (err) {
        console.error(err);
    }
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// Socket listener
socket.on('new_message', (msg) => {
    console.log('New message received:', msg);
    if (activeThread === msg.thread) {
        appendMessage(msg);
    } else {
        // Notification logic
        const threadEl = document.querySelector(`.thread-item[data-id="${msg.thread}"]`);
        if (threadEl) {
            threadEl.classList.add('unread');
            const lastMsgEl = threadEl.querySelector('.thread-last-msg');
            if (lastMsgEl) lastMsgEl.innerText = msg.message;
            // Move to top
            threadList.prepend(threadEl);
        } else {
            // New thread or thread not in list, refresh
            loadThreads();
        }
    }
});

init();
