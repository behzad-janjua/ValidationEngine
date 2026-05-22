// Configuration
const AGENT2_API_BASE_URL = 'http://127.0.0.1:8001';

// DOM Elements
const backBtn = document.getElementById('backBtn');
const ideaTitle = document.getElementById('ideaTitle');
const scoresSummary = document.getElementById('scoresSummary');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const viabilityContent = document.getElementById('viabilityContent');
const positioningContent = document.getElementById('positioningContent');
const mvpPlanContent = document.getElementById('mvpPlanContent');
const critiqueContent = document.getElementById('critiqueContent');
const nextActionsContent = document.getElementById('nextActionsContent');
const proceedAgent3Btn = document.getElementById('proceedAgent3Btn');

let selectedIdea = null;
let agent2Results = null;

// Event Listeners
backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

retryBtn.addEventListener('click', () => {
    if (selectedIdea) {
        analyzeWithAgent2(selectedIdea);
    }
});

proceedAgent3Btn.addEventListener('click', () => {
    alert('Agent 3 integration coming soon! This would proceed to Market & Growth analysis.');
});

// Initialize
window.addEventListener('load', () => {
    // Get the selected idea from sessionStorage
    const storedIdea = sessionStorage.getItem('selectedIdea');
    
    if (!storedIdea) {
        showError('No idea selected. Please go back and select an idea from Agent 1.');
        return;
    }
    
    selectedIdea = JSON.parse(storedIdea);
    displayIdeaOverview(selectedIdea);
    analyzeWithAgent2(selectedIdea);
});

function displayIdeaOverview(idea) {
    ideaTitle.textContent = idea.title;
    
    scoresSummary.innerHTML = `
        <div class="score-badge">
            <div class="score-badge-label">Feasibility</div>
            <div class="score-badge-value">${idea.scores.feasibility}/10</div>
        </div>
        <div class="score-badge">
            <div class="score-badge-label">Innovation</div>
            <div class="score-badge-value">${idea.scores.innovation}/10</div>
        </div>
        <div class="score-badge">
            <div class="score-badge-label">Impact</div>
            <div class="score-badge-value">${idea.scores.impact}/10</div>
        </div>
        <div class="score-badge">
            <div class="score-badge-label">Marketability</div>
            <div class="score-badge-value">${idea.scores.marketability}/10</div>
        </div>
        <div class="score-badge">
            <div class="score-badge-label">Clarity</div>
            <div class="score-badge-value">${idea.scores.clarity}/10</div>
        </div>
        <div class="score-badge">
            <div class="score-badge-label">Overall</div>
            <div class="score-badge-value" style="color: ${getScoreColor(idea.scores.overall)}">${idea.scores.overall.toFixed(1)}/10</div>
        </div>
    `;
}

async function analyzeWithAgent2(idea) {
    try {
        showLoading();
        
        const response = await fetch(`${AGENT2_API_BASE_URL}/plan-and-critique`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(idea)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Agent 2 analysis failed');
        }
        
        agent2Results = await response.json();
        displayAgent2Results(agent2Results);
        
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

function displayAgent2Results(results) {
    loadingSection.style.display = 'none';
    errorSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Display Viability
    displayViability(results.overall_viability, results.viability_reason);
    
    // Display Positioning
    positioningContent.textContent = results.positioning_statement;
    
    // Display MVP Plan
    displayMVPPlan(results.mvp_plan);
    
    // Display Critique
    displayCritique(results.critique);
    
    // Display Next Actions
    displayNextActions(results.next_actions);
}

function displayViability(viability, reason) {
    const viabilityClass = `viability-${viability.toLowerCase()}`;
    
    viabilityContent.innerHTML = `
        <div class="viability-badge ${viabilityClass}">${viability} Viability</div>
        <p class="viability-reason">${escapeHtml(reason)}</p>
    `;
}

function displayMVPPlan(mvpPlan) {
    mvpPlanContent.innerHTML = `
        <div class="mvp-phase">
            <div class="mvp-phase-title">Phase 1: Foundation</div>
            <div class="mvp-phase-content">${escapeHtml(mvpPlan.phase_1)}</div>
        </div>
        <div class="mvp-phase">
            <div class="mvp-phase-title">Phase 2: Validation</div>
            <div class="mvp-phase-content">${escapeHtml(mvpPlan.phase_2)}</div>
        </div>
        <div class="mvp-phase">
            <div class="mvp-phase-title">Phase 3: Scale</div>
            <div class="mvp-phase-content">${escapeHtml(mvpPlan.phase_3)}</div>
        </div>
        
        <div class="mvp-meta">
            <div class="mvp-meta-item">
                <div class="mvp-meta-label">Estimated Timeline</div>
                <div class="mvp-meta-value">${escapeHtml(mvpPlan.estimated_timeline)}</div>
            </div>
            <div class="mvp-meta-item">
                <div class="mvp-meta-label">Key Resources</div>
                <div class="mvp-meta-value">${mvpPlan.key_resources_needed.length} items</div>
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <h4 style="margin-bottom: 10px; color: var(--text-secondary);">Required Resources:</h4>
            <ul class="resources-list">
                ${mvpPlan.key_resources_needed.map(resource => 
                    `<li>${escapeHtml(resource)}</li>`
                ).join('')}
            </ul>
        </div>
    `;
}

function displayCritique(critique) {
    critiqueContent.innerHTML = `
        <div class="critique-section">
            <h4>🚨 Top 3 Risks</h4>
            <ul class="critique-list">
                ${critique.top_risks.map(risk => 
                    `<li>${escapeHtml(risk)}</li>`
                ).join('')}
            </ul>
        </div>
        
        <div class="critique-section">
            <h4>⚠️ Weaknesses</h4>
            <ul class="critique-list">
                ${critique.weaknesses.map(weakness => 
                    `<li>${escapeHtml(weakness)}</li>`
                ).join('')}
            </ul>
        </div>
        
        <div class="critique-section">
            <h4>🔍 Assumptions to Validate</h4>
            <ul class="critique-list">
                ${critique.assumptions_to_validate.map(assumption => 
                    `<li>${escapeHtml(assumption)}</li>`
                ).join('')}
            </ul>
        </div>
    `;
}

function displayNextActions(actions) {
    nextActionsContent.innerHTML = actions.map(action => 
        `<li>${escapeHtml(action)}</li>`
    ).join('');
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

// Made with Bob
