document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');
    
    // Store conversation ID and message history in session storage
    let conversationId = sessionStorage.getItem('conversationId') || null;
    
    // Load existing messages if available
    loadSavedMessages();
    
    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    });

    // Handle Enter key (Shift+Enter for new line)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Send button click handler
    sendButton.addEventListener('click', sendMessage);

    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Disable input while processing
        messageInput.disabled = true;
        sendButton.disabled = true;

        // Add user message to chat and save it
        const userMsgId = addMessage(message, 'user');
        saveMessage(userMsgId, message, 'user');

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Show typing indicator
        typingIndicator.classList.add('active');

        try {
            const API_URL = window.location.hostname === 'localhost' ? 
                'http://localhost:8000' : 
                'https://coding-copilot.onrender.com';

            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversation_id: conversationId
                })
            }); 

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            // Store conversation ID if it's a new conversation
            if (!conversationId) {
                conversationId = data.conversation_id;
                sessionStorage.setItem('conversationId', conversationId);
            }

            // Add bot response to chat and save it
            const botMsgId = addMessage(data.response, 'bot');
            saveMessage(botMsgId, data.response, 'bot');

        } catch (error) {
            console.error('Error:', error);
            const errorMsgId = addMessage('Sorry, there was an error processing your request. Please try again.', 'bot');
            saveMessage(errorMsgId, 'Sorry, there was an error processing your request. Please try again.', 'bot');
        } finally {
            // Hide typing indicator
            typingIndicator.classList.remove('active');
            
            // Re-enable input
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
        }
    }

    function addMessage(content, sender) {
        const messageId = 'msg-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.id = messageId;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // Format code blocks if present
        if (content.includes('```')) {
            let formattedContent = '';
            const parts = content.split('```');
            
            parts.forEach((part, index) => {
                if (index % 2 === 0) {
                    // Regular text - convert newlines to <br> tags
                    formattedContent += part.replace(/\n/g, '<br>');
                } else {
                    // Code block
                    formattedContent += `<pre><code>${part}</code></pre>`;
                }
            });
            
            messageContent.innerHTML = formattedContent;
        } else {
            // For regular text, preserve line breaks
            messageContent.innerHTML = content.replace(/\n/g, '<br>');
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        // Format time without seconds
        const now = new Date();
        timeDiv.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timeDiv);
        chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageId;
    }
    
    // Save message to session storage
    function saveMessage(id, content, sender) {
        const messages = JSON.parse(sessionStorage.getItem('chatMessages') || '[]');
        messages.push({
            id: id,
            content: content,
            sender: sender,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    }
    
    // Load saved messages from session storage
    function loadSavedMessages() {
        const messages = JSON.parse(sessionStorage.getItem('chatMessages') || '[]');
        if (messages.length > 0) {
            // Clear the welcome message since we're loading saved messages
            chatMessages.innerHTML = '';
            
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.sender}`;
                messageDiv.id = msg.id;

                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                
                // Handle possible code blocks in saved messages
                if (msg.content.includes('```')) {
                    let formattedContent = '';
                    const parts = msg.content.split('```');
                    
                    parts.forEach((part, index) => {
                        if (index % 2 === 0) {
                            formattedContent += part.replace(/\n/g, '<br>');
                        } else {
                            formattedContent += `<pre><code>${part}</code></pre>`;
                        }
                    });
                    
                    messageContent.innerHTML = formattedContent;
                } else {
                    messageContent.innerHTML = msg.content.replace(/\n/g, '<br>');
                }

                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                timeDiv.textContent = msg.time;

                messageDiv.appendChild(messageContent);
                messageDiv.appendChild(timeDiv);
                chatMessages.appendChild(messageDiv);
            });
            
            // Scroll to bottom of loaded messages
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            // Add welcome message if no saved messages
            addMessage('Hello! I\'m your Coding Copilot. How can I help you today?', 'bot');
        }
    }
    
    // Add button to clear chat history
    const chatHeader = document.querySelector('.chat-header');
    const clearButton = document.createElement('button');
    clearButton.innerHTML = 'Clear Chat';
    clearButton.style.marginTop = '10px';
    clearButton.style.padding = '5px 10px';
    clearButton.style.background = '#2d2d2d';
    clearButton.style.color = '#ffffff';
    clearButton.style.border = '1px solid #404040';
    clearButton.style.borderRadius = '5px';
    clearButton.style.cursor = 'pointer';
    
    clearButton.addEventListener('click', () => {
        // Clear session storage and reload page
        sessionStorage.removeItem('chatMessages');
        sessionStorage.removeItem('conversationId');
        location.reload();
    });
    
    chatHeader.appendChild(clearButton);
});
