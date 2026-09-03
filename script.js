// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesArea = document.getElementById('messages-area');
    const welcomeScreen = document.getElementById('welcome-screen');
    const conversationList = document.getElementById('conversation-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // State
    let currentConversationId = null;
    let userId = localStorage.getItem('wormgpt_user_id') || crypto.randomUUID();
    localStorage.setItem('wormgpt_user_id', userId);

    // Initialize
    loadConversations();

    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = this.value.trim() === '';
    });

    // Handle Enter key
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    sendBtn.addEventListener('click', handleSend);
    newChatBtn.addEventListener('click', startNewChat);
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // --- Core Functions ---

    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        // 1. UI Reset
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.disabled = true;
        welcomeScreen.style.display = 'none';

        // 2. Add User Message
        addMessage('user', text);

        // 3. Create "Thinking" Placeholder
        const thinkingId = createThinkingPlaceholder();

        // 4. Fetch AI Response
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    prompt: text,
                    conversation_id: currentConversationId
                })
            });

            const data = await response.json();

            // 5. Replace Thinking with Content
            removeMessage(thinkingId);
            currentConversationId = data.conversation_id;
            addMessage('ai', data.response);

        } catch (error) {
            removeMessage(thinkingId);
            addMessage('ai', "⚠️ Error: Could not connect to WormGPT core. Check connection.");
            console.error(error);
        }

        // 6. Refresh Sidebar
        loadConversations();
    }

    function addMessage(role, content) {
        const row = document.createElement('div');
        row.className = `message-row ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? 'W' : 'W'; // WormGPT Avatar

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        if (role === 'ai') {
            // Render Markdown
            bubble.innerHTML = marked.parse(content);
            // Highlight Code
            bubble.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            bubble.textContent = content;
        }

        row.appendChild(avatar);
        row.appendChild(bubble);
        messagesArea.appendChild(row);
        
        // Scroll to bottom
        const chatWrapper = document.querySelector('.chat-wrapper');
        chatWrapper.scrollTop = chatWrapper.scrollHeight;
    }

    function createThinkingPlaceholder() {
        const id = 'thinking-' + Date.now();
        const row = document.createElement('div');
        row.className = 'message-row ai';
        row.id = id;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'W';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.innerHTML = `
            <div class="thinking-indicator">
                <span class="dots">●●●</span> WormGPT is thinking
            </div>
        `;

        row.appendChild(avatar);
        row.appendChild(bubble);
        messagesArea.appendChild(row);

        const chatWrapper = document.querySelector('.chat-wrapper');
        chatWrapper.scrollTop = chatWrapper.scrollHeight;

        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    async function startNewChat() {
        currentConversationId = null;
        messagesArea.innerHTML = '';
        welcomeScreen.style.display = 'flex';
        if(window.innerWidth <= 768) sidebar.classList.remove('active');
    }

    async function loadConversations() {
        const response = await fetch(`/api/conversations/${userId}`);
        const convs = await response.json();
        
        conversationList.innerHTML = '';
        
        if (convs.length === 0) {
            conversationList.innerHTML = '<div style="color:#666; font-size:12px; padding:10px;">No history yet</div>';
            return;
        }

        convs.forEach(conv => {
            const div = document.createElement('div');
            div.className = 'conv-item';
            div.textContent = conv.first_message;
            div.onclick = () => loadSpecificConversation(conv.id);
            conversationList.appendChild(div);
        });
    }

    async function loadSpecificConversation(id) {
        currentConversationId = id;
        welcomeScreen.style.display = 'none';
        if(window.innerWidth <= 768) sidebar.classList.remove('active');
        
        const response = await fetch(`/api/conversations/${userId}/${id}`);
        const data = await response.json();
        
        messagesArea.innerHTML = '';
        data.messages.forEach(msg => {
            addMessage(msg.role, msg.content);
        });
    }
});
