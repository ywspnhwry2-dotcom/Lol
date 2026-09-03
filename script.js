// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesArea = document.getElementById('messages');
    const menuBtn = document.getElementById('menu-btn');
    const historySidebar = document.getElementById('history-sidebar');
    const closeHistory = document.getElementById('close-history');
    const historyList = document.getElementById('history-list');
    const fileUpload = document.getElementById('file-upload');

    // State
    let currentConversationId = null;
    let userId = localStorage.getItem('wormgpt_user_id') || crypto.randomUUID();
    localStorage.setItem('wormgpt_user_id', userId);

    // Initialize
    loadHistory();

    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Send message on Enter (without Shift)
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Send button click
    sendBtn.addEventListener('click', sendMessage);

    // File upload
    fileUpload.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            const fileNames = Array.from(files).map(f => f.name).join(', ');
            addMessage('user', `📁 Uploaded files: ${fileNames}`);
            // Here you would handle file upload to backend
        }
    });

    // Menu toggle
    menuBtn.addEventListener('click', () => {
        historySidebar.classList.add('active');
    });

    closeHistory.addEventListener('click', () => {
        historySidebar.classList.remove('active');
    });

    // --- Core Functions ---

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        // Reset input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Add user message
        addMessage('user', text);

        // Add thinking indicator
        const thinkingId = addThinkingIndicator();

        // Fetch AI response
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

            // Remove thinking indicator and add AI response
            removeMessage(thinkingId);
            currentConversationId = data.conversation_id;
            addMessage('ai', data.response);

            // Refresh history
            loadHistory();

        } catch (error) {
            removeMessage(thinkingId);
            addMessage('ai', "⚠️ Error: WormGPT core offline. Check connection.");
            console.error(error);
        }
    }

    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        if (role === 'ai') {
            // Render markdown
            messageDiv.innerHTML = marked.parse(content);
            // Highlight code blocks
            messageDiv.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        } else {
            messageDiv.textContent = content;
        }

        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function addThinkingIndicator() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message ai thinking';
        thinkingDiv.id = 'thinking-' + Date.now();
        thinkingDiv.innerHTML = `
            <div class="thinking">
                <div class="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                Thinking...
            </div>
        `;
        messagesArea.appendChild(thinkingDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        return thinkingDiv.id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    async function loadHistory() {
        const response = await fetch(`/api/conversations/${userId}`);
        const conversations = await response.json();

        historyList.innerHTML = '';

        if (conversations.length === 0) {
            historyList.innerHTML = '<div class="history-item">No history</div>';
            return;
        }

        conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = conv.first_message;
            item.onclick = () => loadConversation(conv.id);
            historyList.appendChild(item);
        });
    }

    async function loadConversation(id) {
        currentConversationId = id;
        historySidebar.classList.remove('active');

        const response = await fetch(`/api/conversations/${userId}/${id}`);
        const data = await response.json();

        messagesArea.innerHTML = '';
        data.messages.forEach(msg => {
            addMessage(msg.role, msg.content);
        });
    }
});
