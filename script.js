// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? '🌙' : '☀️';
    });

    // Tab Switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetTab = tab.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-tab`) {
                    content.classList.add('active');
                }
            });

            // Initialize terminal if not already done
            if (targetTab === 'terminal' && !window.terminalInitialized) {
                initTerminal();
                window.terminalInitialized = true;
            }
        });
    });

    // Chat Functionality
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages');
    const newChatBtn = document.getElementById('new-chat-btn');
    const conversationList = document.getElementById('conversation-list');

    let currentConversationId = null;
    let userId = localStorage.getItem('user_id') || crypto.randomUUID();
    localStorage.setItem('user_id', userId);

    // Load conversations
    async function loadConversations() {
        const response = await fetch(`/api/conversations/${userId}`);
        const conversations = await response.json();
        conversationList.innerHTML = '';
        conversations.forEach(conv => {
            const div = document.createElement('div');
            div.className = 'conversation-item';
            div.textContent = conv.first_message;
            div.addEventListener('click', () => loadConversation(conv.id));
            conversationList.appendChild(div);
        });
    }

    // Load a conversation
    async function loadConversation(conversationId) {
        currentConversationId = conversationId;
        const response = await fetch(`/api/conversations/${userId}/${conversationId}`);
        const conversation = await response.json();
        messagesContainer.innerHTML = '';
        conversation.messages.forEach(msg => {
            addMessage(msg.role, msg.content);
        });
    }

    // Add message to chat
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        // Render markdown
        if (role === 'ai') {
            messageDiv.innerHTML = marked.parse(content);
            // Highlight code blocks
            messageDiv.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        } else {
            messageDiv.textContent = content;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Send message
    async function sendMessage() {
        const prompt = userInput.value.trim();
        if (!prompt) return;

        userInput.value = '';
        addMessage('user', prompt);

        // Show typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai typing';
        typingDiv.innerHTML = '<span class="typing-dots">AI is typing...</span>';
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                prompt: prompt,
                conversation_id: currentConversationId
            })
        });

        messagesContainer.removeChild(typingDiv);
        const data = await response.json();
        currentConversationId = data.conversation_id;
        addMessage('ai', data.response);
        await loadConversations();
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    newChatBtn.addEventListener('click', () => {
        currentConversationId = null;
        messagesContainer.innerHTML = '';
    });

    // File Editor
    const fileNameInput = document.getElementById('file-name');
    const saveFileBtn = document.getElementById('save-file-btn');
    const editor = document.getElementById('editor');

    saveFileBtn.addEventListener('click', async () => {
        const fileName = fileNameInput.value.trim();
        const fileContent = editor.textContent;

        if (!fileName) {
            alert('Please enter a file name');
            return;
        }

        const response = await fetch('/api/edit_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                file_name: fileName,
                content: fileContent
            })
        });

        const data = await response.json();
        alert(`File saved to: ${data.file_path}`);
    });

    // Terminal
    function initTerminal() {
        const terminal = new Terminal({
            fontFamily: '"Courier New", Courier, monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#e0e0e0'
            }
        });
        const fitAddon = new FitAddon.FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(document.getElementById('terminal'));
        fitAddon.fit();

        terminal.write('WormGPT Terminal (Unrestricted)\r\n$ ');

        terminal.onData(async (data) => {
            if (data === '\r') { // Enter key
                const command = terminal.currentCommand.trim();
                if (command) {
                    terminal.write('\r\n');
                    const response = await fetch('/api/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: userId,
                            command: command
                        })
                    });
                    const result = await response.json();
                    terminal.write(result.output + '\r\n$ ');
                } else {
                    terminal.write('\r\n$ ');
                }
            } else if (data === '\u007F') { // Backspace
                if (terminal.currentCommand.length > 0) {
                    terminal.currentCommand = terminal.currentCommand.slice(0, -1);
                    terminal.write('\b \b');
                }
            } else {
                terminal.currentCommand += data;
                terminal.write(data);
            }
        });

        window.addEventListener('resize', () => {
            fitAddon.fit();
        });
    }

    // Initialize
    loadConversations();
});
