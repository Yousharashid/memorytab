console.log("Offscreen document script loaded.");

// Function to perform the OpenAI API call
async function callOpenAIAPI(apiKey: string, prompt: string): Promise<any> {
    console.log("Offscreen: Received request to call OpenAI...");
    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo-0125",
                messages: [
                    {
                        role: "system",
                        content: "You are an assistant that analyzes browsing history and generates a timeline of distinct activities as a JSON array. Follow the user's specified JSON structure precisely.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.3,
                max_tokens: 1500,
                // response_format: { type: "json_object" }, // Consider adding if needed
            }),
        });

        if (!res.ok) {
            const errorBody = await res.text();
            console.error("Offscreen OpenAI API Error:", res.status, res.statusText, errorBody);
            // Throw an error object compatible with structured cloning
            throw { 
                message: `OpenAI error: ${res.status} ${res.statusText}`,
                body: errorBody
            };
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content) {
             console.error("Offscreen OpenAI: Response content is empty.");
             throw { message: "OpenAI response content is empty." };
        }
        
        console.log("Offscreen OpenAI: Call successful, returning content.");
        return { success: true, content: content };

    } catch (error: any) {
        console.error("Offscreen: Error during OpenAI fetch:", error);
        // Ensure we throw a structured-clonable error
        throw { 
            success: false, 
            error: error.message || "Unknown fetch error", 
            details: error // Include original error details if possible
        };
    }
}

// Listen for messages from the Service Worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("Offscreen: Message received", message);
    if (message.type === 'callOpenAI') {
        if (!message.apiKey || !message.prompt) {
            console.error("Offscreen: Missing apiKey or prompt in message");
            sendResponse({ success: false, error: "Missing apiKey or prompt" });
            return false; // Indicate asynchronous response will not be sent
        }

        // Call the API and handle the response asynchronously
        callOpenAIAPI(message.apiKey, message.prompt)
            .then(response => {
                console.log("Offscreen: Sending success response", response);
                sendResponse(response); // Contains { success: true, content: ... }
            })
            .catch(error => {
                console.error("Offscreen: Sending error response", error);
                // Send back a structured error
                sendResponse({ 
                    success: false, 
                    error: error.message || "Failed to call OpenAI API",
                    details: error // Pass details back
                });
            });

        return true; // Indicate that the response will be sent asynchronously
    } else {
        console.log("Offscreen: Received unknown message type", message.type);
        sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
        return false;
    }
}); 