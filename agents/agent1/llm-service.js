const axios = require('axios');
const config = require('./llm-config.json');

async function analyzeIdeas(ideas) {
  const prompt = generatePrompt(ideas);

  try {
    const response = await callLLM(prompt);
    return parseResponse(response);
  } catch (error) {
    throw new Error(`LLM analysis failed: ${error.message}`);
  }
}

function generatePrompt(ideas) {
  const ideasText = ideas.map((idea, i) => `${i + 1}. ${JSON.stringify(idea)}`).join('\n');

  return `You are a hackathon judge. Analyze the following ideas and rate EACH one on a scale of 1-10 for these 5 criteria:
- Feasibility: Can it realistically be built?
- Innovation: How unique and creative is it?
- Impact: What positive difference can it make?
- Marketability: Can it sell or scale in the market?
- Clarity: Is the idea well-defined and clearly articulated?

Ideas:
${ideasText}

Respond ONLY with valid JSON in this exact structure:
{
  "ratings": [
    {
      "ideaIndex": 1,
      "title": "short title of the idea",
      "feasibility": 7,
      "innovation": 8,
      "impact": 6,
      "marketability": 7,
      "clarity": 9,
      "overall": 7.4,
      "summary": "one line summary of reasoning"
    }
  ],
  "top3Overall": [
    { "ideaIndex": 1, "title": "...", "overall": 8.2, "reason": "..." }
  ],
  "topByCategory": {
    "feasibility": [{ "ideaIndex": 1, "title": "...", "score": 9, "reason": "..." }],
    "innovation": [{ "ideaIndex": 2, "title": "...", "score": 9, "reason": "..." }],
    "impact": [{ "ideaIndex": 3, "title": "...", "score": 9, "reason": "..." }],
    "marketability": [{ "ideaIndex": 4, "title": "...", "score": 9, "reason": "..." }],
    "clarity": [{ "ideaIndex": 5, "title": "...", "score": 9, "reason": "..." }]
  }
}

top3Overall: best 3 ideas by overall average score.
topByCategory: best 2 ideas in each category.`;
}

async function callLLM(prompt) {
  const requestData = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: config.maxTokens || 8000,
      temperature: config.temperature || 0.7,
      responseMimeType: 'application/json'
    }
  };

  const response = await axios.post(`${config.apiUrl}?key=${config.apiKey}`, requestData, {
    headers: { 'Content-Type': 'application/json' }
  });

  return response.data.candidates[0].content.parts[0].text;
}

function parseResponse(response) {
  try {
    // Strip markdown code fences if present
    const cleaned = response.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    return { rawResponse: response, error: 'Failed to parse structured response' };
  }
}

module.exports = { analyzeIdeas };