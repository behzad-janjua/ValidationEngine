// Configuration
const API_BASE_URL = 'http://127.0.0.1:8000';
const AGENT2_API_BASE_URL = 'http://127.0.0.1:8001';

// DOM Elements
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');
const analyzeLocalBtn = document.getElementById('analyzeLocalBtn');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const top3Container = document.getElementById('top3Container');
const allIdeasContainer = document.getElementById('allIdeasContainer');

let selectedFile = null;
let analysisData = null;

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        fileName.textContent = selectedFile.name;
        analyzeBtn.style.display = 'inline-block';
    }
});

analyzeBtn.addEventListener('click', () => analyzeIdeas(false));
analyzeLocalBtn.addEventListener('click', () => analyzeIdeas(true));
retryBtn.addEventListener('click', () => location.reload());

// Main Functions
async function analyzeIdeas(useLocal = false) {
    try {
        showLoading();
        
        let response;
        if (useLocal) {
            // Use the local CSV endpoint
            response = await fetch(`${API_BASE_URL}/analyze-local`, {
                method: 'POST'
            });
        } else {
            // Upload file
            if (!selectedFile) {
                throw new Error('Please select a file first');
            }
            
            const formData = new FormData();
            formData.append('excel', selectedFile);
            
            response = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                body: formData
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Analysis failed');
        }
        
        analysisData = await response.json();
        displayResults(analysisData);
        
    } catch (error) {
        showError(error.message);
    }
}

function showLoading() {
    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

function showError(message) {
    loadingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'block';
    errorMessage.textContent = message;
}

function displayResults(data) {
    loadingSection.style.display = 'none';
    errorSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Display top 3 ideas
    displayTop3Ideas(data.analysis.top3_overall);
    
    // Display all ideas sorted by overall score
    displayAllIdeas(data.analysis.ratings);
}

function displayTop3Ideas(top3) {
    top3Container.innerHTML = '';
    
    top3.forEach((idea, index) => {
        const card = createIdeaCard(idea, index + 1, true);
        top3Container.appendChild(card);
    });
}

function displayAllIdeas(ratings) {
    allIdeasContainer.innerHTML = '';
    
    // Sort by overall score descending
    const sortedRatings = [...ratings].sort((a, b) => b.overall - a.overall);
    
    sortedRatings.forEach((idea, index) => {
        const card = createIdeaCard(idea, index + 1, false);
        allIdeasContainer.appendChild(card);
    });
}

function createIdeaCard(idea, rank, isTop3 = false) {
    const card = document.createElement('div');
    card.className = `idea-card ${isTop3 ? 'top-idea' : ''}`;
    
    const overallScore = idea.overall || 0;
    const scoreColor = getScoreColor(overallScore);
    
    card.innerHTML = `
        <div class="idea-rank">Rank #${rank}</div>
        <div class="idea-title">${escapeHtml(idea.title)}</div>
        <div class="idea-summary">${escapeHtml(idea.summary || 'No summary available')}</div>
        
        <div class="scores-grid">
            <div class="score-item">
                <span class="score-label">Feasibility:</span>
                <span class="score-value">${idea.feasibility}/10</span>
            </div>
            <div class="score-item">
                <span class="score-label">Innovation:</span>
                <span class="score-value">${idea.innovation}/10</span>
            </div>
            <div class="score-item">
                <span class="score-label">Impact:</span>
                <span class="score-value">${idea.impact}/10</span>
            </div>
            <div class="score-item">
                <span class="score-label">Marketability:</span>
                <span class="score-value">${idea.marketability}/10</span>
            </div>
            <div class="score-item">
                <span class="score-label">Clarity:</span>
                <span class="score-value">${idea.clarity}/10</span>
            </div>
        </div>
        
        <div class="overall-score">
            <div class="overall-score-value" style="color: ${scoreColor}">${overallScore.toFixed(1)}</div>
            <div class="overall-score-label">Overall Score</div>
        </div>
    `;
    
    // Add click handler to navigate to Agent 2
    card.addEventListener('click', () => {
        navigateToAgent2(idea);
    });
    
    return card;
}

function navigateToAgent2(idea) {
    // Store the idea data in sessionStorage
    const agent2Input = {
        idea_index: idea.idea_index,
        title: idea.title,
        scores: {
            feasibility: idea.feasibility,
            innovation: idea.innovation,
            impact: idea.impact,
            marketability: idea.marketability,
            clarity: idea.clarity,
            overall: idea.overall
        },
        summary: idea.summary,
        target_customer: null, // These would come from the original spreadsheet
        problem: null
    };
    
    sessionStorage.setItem('selectedIdea', JSON.stringify(agent2Input));
    
    // Navigate to agent2.html
    window.location.href = 'agent2.html';
}

function getScoreColor(score) {
    if (score >= 8) return '#10b981'; // green
    if (score >= 6) return '#f59e0b'; // orange
    return '#ef4444'; // red
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Check if we're returning from Agent 2 and have cached data
window.addEventListener('load', () => {
    const cachedData = sessionStorage.getItem('agent1Results');
    if (cachedData) {
        analysisData = JSON.parse(cachedData);
        displayResults(analysisData);
    }
});

// Cache results when navigating away
window.addEventListener('beforeunload', () => {
    if (analysisData) {
        sessionStorage.setItem('agent1Results', JSON.stringify(analysisData));
    }
});

// Made with Bob
