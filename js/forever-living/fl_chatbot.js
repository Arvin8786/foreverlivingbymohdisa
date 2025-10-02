// =================================================================
// Forever Living Chatbot Module - v19.4 (Definitive Final & Corrected)
// Handles all logic for the on-page e-shop assistant.
// =================================================================

let fl_chatSession = { state: 'main_menu' };

function toggleChatWidget(show) {
    const chatWidget = document.getElementById('eshop-chat-widget');
    const fabContainer = document.getElementById('fab-container');
    if (chatWidget) {
        chatWidget.classList.toggle('active', show);
        if (show) {
            if (fabContainer) fabContainer.style.right = '370px';
            if (document.getElementById('chat-body').innerHTML.trim() === '') {
                displayMainMenu();
            }
        } else {
            if (fabContainer) fabContainer.style.right = '20px';
        }
    }
}

function addChatMessage(sender, text, type = 'text') {
    const chatBody = document.getElementById('chat-body');
    if (!chatBody) return;
    const msg = document.createElement('div');
    msg.classList.add('chat-message', sender === 'bot' ? 'bot-message' : 'user-message');
    if (type === 'html') { 
        msg.innerHTML = text; 
    } else { 
        msg.textContent = text; 
    }
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msg;
}

function displayMainMenu() {
    fl_chatSession.state = 'main_menu';
    const menu = `<strong>Welcome! How can I help?</strong><br><br>1. My Account (Orders & Points)<br>2. Talk to a Human<br><br>Or, you can ask me a question about our products!`;
    addChatMessage('bot', menu, 'html');
}

async function handleChatSubmit() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    addChatMessage('user', text);
    input.value = '';
    input.disabled = true;
    const thinkingMsg = addChatMessage('bot', '<i>Thinking...</i>', 'html');

    try {
        if (fl_chatSession.state === 'awaiting_identifier') { 
            await startVerification(text); 
        } else if (fl_chatSession.state === 'awaiting_code') { 
            await submitVerificationCode(text); 
        } else if (fl_chatSession.state === 'my_account_menu') { 
            await handleMyAccountMenu(text); 
        } else { 
            await handleMainMenu(text); 
        }
    } catch (error) {
        addChatMessage('bot', `An unexpected error occurred: ${error.message}`);
    } finally {
        if(thinkingMsg) thinkingMsg.remove();
        input.disabled = false;
        input.focus();
    }
}

async function handleMainMenu(text) {
    if (text === '1') {
        if (sessionStorage.getItem('eshop_session_token')) {
            displayMyAccountMenu();
        } else {
            fl_chatSession.state = 'awaiting_identifier';
            addChatMessage('bot', 'To access your account, please enter your PAC or registered Email address.');
        }
    } else if (text === '2') {
        addChatMessage('bot', 'To speak with our admin, please click the link below to contact them directly on WhatsApp:');
        addChatMessage('bot', '<a href="https://wa.me/601111033154" target="_blank">Contact Admin on WhatsApp</a>', 'html');
        setTimeout(displayMainMenu, 3000);
    } else {
        try {
            const result = await postToRender('getSmartAnswer', { question: text });
            addChatMessage('bot', result.answer || 'Sorry, I had trouble finding an answer.');
        } catch (error) {
            addChatMessage('bot', `Sorry, an error occurred: ${error.message}`);
        }
    }
}

async function startVerification(identifier) {
    try {
        const result = await postToRender('issueChatVerificationCode', { identifier: identifier });
        fl_chatSession.state = 'awaiting_code';
        fl_chatSession.pac = result.pac; // Store PAC temporarily
        addChatMessage('bot', 'A verification code has been sent to your registered WhatsApp. Please enter it here.');
    } catch (error) {
        addChatMessage('bot', `Verification failed: ${error.message}`);
        fl_chatSession.state = 'main_menu';
    }
}

async function submitVerificationCode(code) {
    try {
        const result = await postToRender('verifyChatCode', { pac: fl_chatSession.pac, code: code });
        sessionStorage.setItem('eshop_session_token', result.token); // Store secure token
        delete fl_chatSession.pac; // Remove temporary PAC
        addChatMessage('bot', '✅ Verification Successful!');
        displayMyAccountMenu();
    } catch (error) {
        addChatMessage('bot', `Verification failed: ${error.message}`);
        fl_chatSession.state = 'main_menu';
    }
}

function displayMyAccountMenu() {
    fl_chatSession.state = 'my_account_menu';
    addChatMessage('bot', '<strong>My Account</strong><br>1. View My Last 5 Orders<br>2. Check My Total Points<br>3. Back to Main Menu', 'html');
}

async function handleMyAccountMenu(text) {
    let action = '';
    if (text === '1') { 
        action = 'getPurchaseHistory'; 
    } else if (text === '2') { 
        action = 'getPointsHistory'; 
    } else if (text === '3') { 
        displayMainMenu(); 
        return; 
    } else { 
        addChatMessage('bot', 'Invalid option.'); 
        return; 
    }

    try {
        const token = sessionStorage.getItem('eshop_session_token');
        if (!token) {
            addChatMessage('bot', 'Your session has expired. Please log in again.');
            fl_chatSession.state = 'main_menu';
            setTimeout(displayMainMenu, 2000);
            return;
        }
        
        const result = await postToRender(action, { token: token });
        
        if(action === 'getPurchaseHistory') {
            let historyText = "<strong>Your Last 5 Orders:</strong><br>";
            if (!result.history || result.history.length === 0) { 
                historyText = 'You have no purchase history.'; 
            } else { 
                result.history.forEach(order => { 
                    historyText += `<br><strong>ID:</strong> ${order.invoiceId}<br><strong>Date:</strong> ${order.date}<br><strong>Total:</strong> RM ${order.totalAmount}<br><strong>Status:</strong> ${order.status}`; 
                }); 
            }
            addChatMessage('bot', historyText, 'html');
        } else {
            addChatMessage('bot', `Your total points balance is: <strong>${result.currentBalance}</strong>`, 'html');
        }
    } catch (error) {
        addChatMessage('bot', `Error: ${error.message}. Your session may have expired.`);
        sessionStorage.removeItem('eshop_session_token');
        fl_chatSession.state = 'main_menu';
    }
}
