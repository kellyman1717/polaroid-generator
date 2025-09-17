export const config = {
  runtime: 'edge',
};
async function tryApiKeys(apiKeys, payload) {
  for (const key of apiKeys) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${key}&alt=sse`;
    
    try {
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (apiResponse.status === 429) {
        console.warn(`API key ending with ...${key.slice(-4)} is rate-limited. Trying next key.`);
        continue;
      }
      if (apiResponse.ok) {
        console.log(`Successfully connected with API key ending in ...${key.slice(-4)}`);
        return apiResponse;
      }

      const errorBody = await apiResponse.json();
      console.error("API Error from a key:", errorBody);
      throw new Error(`API request failed with status ${apiResponse.status}`);

    } catch (error) {
      console.error(`Fetch error with key ...${key.slice(-4)}:`, error);
      continue;
    }
  }
  return null;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const apiKeyString = process.env.GEMINI_API_KEYS;
    if (!apiKeyString) {
      throw new Error("GEMINI_API_KEYS environment variable is not set.");
    }

    const apiKeys = apiKeyString.split(',').map(key => key.trim());

    const { imageData, mimeType, language } = await req.json();
    const languagePrompt = language === 'id' ? 'dalam Bahasa Indonesia' : 'in English';

    const payload = {
      contents: [{
        parts: [
          { text: `Generate a short, creative, and nostalgic caption for this image, ${languagePrompt}, under 100 characters. The caption should feel like it was handwritten on a polaroid. Do not use quotes and emojis.` },
          { inlineData: { mimeType, data: imageData } }
        ]
      }],
      generationConfig: {
          "temperature": 0.4,
          "topP": 1,
          "topK": 32,
          "maxOutputTokens": 50,
      }
    };
    
    const successfulResponse = await tryApiKeys(apiKeys, payload);

    if (successfulResponse) {
      return new Response(successfulResponse.body, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    } else {
      throw new Error("All available API keys are rate-limited or invalid.");
    }

  } catch (error) {
    console.error("Error in serverless function:", error.message);
    return new Response(JSON.stringify({ error: "An internal server error occurred or all keys failed." }), { status: 500 });
  }
}