import json
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Load config relative to this file so imports work when module is mounted
config_path = os.path.join(os.path.dirname(__file__), 'llm-config.json')
with open(config_path) as f:
    config = json.load(f)

# API key: env var takes precedence over config file placeholder
_api_key = os.environ.get("GEMINI_API_KEY") or config.get("apiKey", "")


def analyze_ideas(ideas):
    prompt = _generate_prompt(ideas)
    response = _call_llm(prompt)
    return _parse_response(response)


def _generate_prompt(ideas):
    ideas_text = '\n'.join(f"{i+1}. {json.dumps(idea, default=str)}" for i, idea in enumerate(ideas))
    return f"""You are a hackathon judge. Analyze the following ideas and rate EACH one on a scale of 1-10 for these 5 criteria:
- Feasibility: Can it realistically be built?
- Innovation: How unique and creative is it?
- Impact: What positive difference can it make?
- Marketability: Can it sell or scale in the market?
- Clarity: Is the idea well-defined and clearly articulated?

Ideas:
{ideas_text}

Respond ONLY with valid JSON in this exact structure:
{{
  "ratings": [
    {{
      "ideaIndex": 1,
      "title": "short title of the idea",
      "feasibility": 7,
      "innovation": 8,
      "impact": 6,
      "marketability": 7,
      "clarity": 9,
      "overall": 7.4,
      "summary": "one line summary of reasoning"
    }}
  ],
  "top3Overall": [
    {{ "ideaIndex": 1, "title": "...", "overall": 8.2, "reason": "..." }}
  ],
  "topByCategory": {{
    "feasibility": [{{ "ideaIndex": 1, "title": "...", "score": 9, "reason": "..." }}],
    "innovation": [{{ "ideaIndex": 2, "title": "...", "score": 9, "reason": "..." }}],
    "impact": [{{ "ideaIndex": 3, "title": "...", "score": 9, "reason": "..." }}],
    "marketability": [{{ "ideaIndex": 4, "title": "...", "score": 9, "reason": "..." }}],
    "clarity": [{{ "ideaIndex": 5, "title": "...", "score": 9, "reason": "..." }}]
  }}
}}

top3Overall: best 3 ideas by overall average score.
topByCategory: best 2 ideas in each category."""


def _call_llm(prompt):
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": config.get("maxTokens", 8000),
            "temperature": config.get("temperature", 0.7),
            "responseMimeType": "application/json"
        }
    }
    r = requests.post(f"{config['apiUrl']}?key={_api_key}", json=payload)
    r.raise_for_status()
    return r.json()["candidates"][0]["content"]["parts"][0]["text"]


def _parse_response(response):
    try:
        cleaned = response.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned)
    except (json.JSONDecodeError, KeyError):
        return {"rawResponse": response, "error": "Failed to parse structured response"}