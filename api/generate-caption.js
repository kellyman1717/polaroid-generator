export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageData, mimeType, language } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("API key is not configured.");
    }
    
    if (!imageData || !mimeType || !language) {
        return res.status(400).json({ error: 'Missing required parameters: imageData, mimeType, language' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;
    
    const languagePrompt = language === 'id' ? 'dalam Bahasa Indonesia' : 'in English';

    const payload = {
      contents: [{
        parts: [
          { text: `Generate a short, creative, and nostalgic caption for this image, ${languagePrompt}, under 100 characters. The caption should feel like it was handwritten on a polaroid. Do not use quotes.` },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageData
            }
          }
        ]
      }],
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error("API Error:", errorBody);
      throw new Error(`API request failed with status ${apiResponse.status}`);
    }

    const result = await apiResponse.json();
    const caption = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (caption) {
      res.status(200).json({ caption: caption.trim() });
    } else {
      throw new Error("Could not extract caption from API response.");
    }

  } catch (error) {
    console.error("Error in serverless function:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
}
