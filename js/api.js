// =================================================================
// API Module - v19.4 (Definitive Final)
// Handles all communication with backend services.
// =================================================================

const googleScriptURL = 'https://script.google.com/macros/s/AKfycbwLxHRP04GEhpwiu7d4ILce7i3IsieeBs1Egfv32P3AGL2M0NjdeezyN7NEISACZjef3w/exec';
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';
const apiKey = '9582967'; // The secret API key

/**
 * Sends a POST request to the Google Apps Script backend.
 * @param {object} payload - The full payload object to send.
 * @returns {Promise<object>} - The JSON response from the server.
 */
async function postDataToGScript(payload) {
    try {
        // We use 'no-cors' for form submissions to prevent CORS errors,
        // as we don't need to read the immediate response for those.
        const response = await fetch(googleScriptURL, {
            method: 'POST',
            mode: 'no-cors', 
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        // For 'no-cors', we can't access the response, so we resolve immediately.
        // The script will still execute on the backend.
        return { status: 'success', message: 'Request sent.' };
    } catch (error) {
        console.error('Error posting to Google Script:', error);
        throw error;
    }
}

/**
 * Sends a POST request to the Render server for chatbot actions.
 * @param {string} action - The specific action to perform (e.g., 'getSmartAnswer').
 * @param {object} data - The data associated with the action.
 * @returns {Promise<object>} - The JSON response from the server.
 */
async function postToRender(action, data) {
    try {
        const response = await fetch(botServerURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                apiKey: apiKey, // The API key is sent for secure actions
                data: data
            })
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
