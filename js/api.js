// =================================================================
// API Module - v17.9 (Definitive Final)
// =================================================================
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbzB05foGnZsPNZtn7u2LE5rkb0zNBrAQtp8BfLA2iUoe1OtAs4TswMG4ZTjfKJnDdFn9Q/exec';
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';
const apiKey = '9582967';

async function fetchInitialData() {
    try {
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error(`Network response error: ${response.status}`);
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Backend script error.');
        return data;
    } catch (error) {
        console.error('Error fetching initial data:', error);
        throw error;
    }
}

async function postDataToGScript(payload) {
    try {
        await fetch(googleScriptURL, { method: 'POST', mode: 'no-cors', cache: 'no-cache', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'follow' });
        return { status: 'success' };
    } catch (error) {
        console.error('Error posting to Google Script:', error);
        throw error;
    }
}

async function postToRender(action, data) {
    try {
        const response = await fetch(botServerURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, apiKey: apiKey, data: data })
        });
        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `Server error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error posting to Render for action "${action}":`, error);
        throw error;
    }
}
