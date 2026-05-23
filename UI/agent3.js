// Agent 3 — Market & Growth UI
const AGENT3_API = '/agent3';

window.addEventListener('load', () => {
  const ideaRaw = sessionStorage.getItem('idea');
  const agent2Raw = sessionStorage.getItem('agent2Output');

  if (!ideaRaw) {
    showError(
      'No idea selected. Please go back and select an idea from Agent 1.',
    );
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'block';
    return;
  }

  const idea = JSON.parse(ideaRaw);
  const agent2Output = agent2Raw ? JSON.parse(agent2Raw) : null;

  displayIdeaOverview(idea, agent2Output);
  runAgent3(idea, agent2Output);
});

function displayIdeaOverview(idea, agent2Output) {
  const viabilityHtml = agent2Output
    ? `<div class="score-badge">
               <div class="score-badge-label">Viability</div>
               <div class="score-badge-value">${escapeHtml(agent2Output.overall_viability)}</div>
           </div>`
    : '';

  document.getElementById('ideaOverview').innerHTML = `
        <div class="idea-overview">
            <h2>${escapeHtml(idea.title)}</h2>
            <div class="scores-summary">
                <div class="score-badge">
                    <div class="score-badge-label">Overall</div>
                    <div class="score-badge-value" style="color: ${getScoreColor(idea.scores.overall)}">${idea.scores.overall.toFixed(1)}/10</div>
                </div>
                <div class="score-badge">
                    <div class="score-badge-label">Marketability</div>
                    <div class="score-badge-value">${idea.scores.marketability}/10</div>
                </div>
                <div class="score-badge">
                    <div class="score-badge-label">Feasibility</div>
                    <div class="score-badge-value">${idea.scores.feasibility}/10</div>
                </div>
                <div class="score-badge">
                    <div class="score-badge-label">Innovation</div>
                    <div class="score-badge-value">${idea.scores.innovation}/10</div>
                </div>
                ${viabilityHtml}
            </div>
        </div>
    `;
}

async function runAgent3(idea, agent2Output) {
  document.getElementById('loadingSection').style.display = 'block';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('errorSection').style.display = 'none';

  const request = buildAgent3Request(idea, agent2Output);

  try {
    const res = await fetch(`${AGENT3_API}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(
        `Agent 3 request failed: ${res.status} ${res.statusText}. ${txt}`,
      );
    }

    const data = await res.json();
    displayResults(data);
  } catch (e) {
    console.error('Agent 3 error:', e);
    showError(e.message);
  }

  document.getElementById('loadingSection').style.display = 'none';
}

/**
 * Map agent1 scores + agent2 output → Agent3Request shape.
 * Agent3 expects evaluation scores on a 0-100 scale (agent1 rates 0-10).
 */
function buildAgent3Request(idea, agent2Output) {
  const request = {
    idea: {
      title: idea.title,
      description: idea.summary || idea.title,
      target_customer: idea.target_customer || null,
      problem: idea.problem || null,
    },
    evaluation: {
      feasibility_score: Math.round(
        (idea.scores.feasibility || 0) * 10,
      ),
      innovation_score: Math.round(
        (idea.scores.innovation || 0) * 10,
      ),
      impact_score: Math.round((idea.scores.impact || 0) * 10),
      marketability_score: Math.round(
        (idea.scores.marketability || 0) * 10,
      ),
      clarity_score: Math.round((idea.scores.clarity || 0) * 10),
    },
  };

  if (agent2Output) {
    request.planning = {
      launch_plan: [
        agent2Output.mvp_plan?.phase_1,
        agent2Output.mvp_plan?.phase_2,
        agent2Output.mvp_plan?.phase_3,
      ].filter(Boolean),
      positioning: agent2Output.positioning_statement || null,
      next_actions: agent2Output.next_actions || [],
      overall_viability: agent2Output.overall_viability || null,
      viability_reason: agent2Output.viability_reason || null,
      top_risks: agent2Output.critique?.top_risks || [],
    };
  }

  return request;
}

// ─── Display Helpers ──────────────────────────────────────────────────────────

function displayResults(data) {
  document.getElementById('loadingSection').style.display = 'none';
  document.getElementById('errorSection').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'block';

  displayRecommendation(data.final_recommendation);
  displayScorecard(data.scorecard);
  displayMarketability(data.marketability_check);
  displayGTM(data.gtm_channels);
  displayExperiments(data.growth_experiments);
  displayCompetitors(data.competitor_scan);
  displayAds(data.advertisement_help);
  displayRealityCheck(data.reality_check);
  displayNextActions(data.next_actions);
}

function displayRecommendation(rec) {
  const slug = rec.verdict.replace(/_/g, '-').toLowerCase();
  const card = document.getElementById('recommendationCard');
  card.classList.add(`verdict-card-${slug}`);

  document.getElementById('recommendationContent').innerHTML = `
        <div class="verdict-badge verdict-${slug}">${rec.verdict.replace(/_/g, ' ').toUpperCase()}</div>
        <div class="confidence-bar">
            <span class="confidence-label">Confidence: ${rec.confidence}%</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${rec.confidence}%"></div>
            </div>
        </div>
        <p class="viability-reason">${escapeHtml(rec.rationale)}</p>
        <p style="margin-top: 12px; color: var(--text-secondary);">
            Recommended launch window: <b>${rec.launch_window_days} days</b>
        </p>
    `;
}

function displayScorecard(scorecard) {
  const metrics = [
    {
      label: 'Marketability',
      value: scorecard.marketability,
      risk: false,
    },
    {
      label: 'Speed to Market',
      value: scorecard.speed_to_market,
      risk: false,
    },
    {
      label: 'Differentiation',
      value: scorecard.differentiation,
      risk: false,
    },
    {
      label: 'Distribution Fit',
      value: scorecard.distribution_fit,
      risk: false,
    },
    {
      label: 'Monetization Confidence',
      value: scorecard.monetization_confidence,
      risk: false,
    },
    { label: 'Launch Risk', value: scorecard.risk, risk: true },
  ];

  document.getElementById('scorecardContent').innerHTML = `
        <div class="scorecard-grid">
            ${metrics
              .map(
                (m) => `
                <div class="scorecard-item">
                    <div class="scorecard-label">${m.label}</div>
                    <div class="scorecard-bar">
                        <div class="scorecard-fill ${m.risk ? 'risk' : ''}" style="width: ${m.value}%"></div>
                    </div>
                    <div class="scorecard-value">${m.value}<span style="font-weight:400;color:var(--text-secondary)">/100</span></div>
                </div>
            `,
              )
              .join('')}
        </div>
    `;
}

function displayMarketability(m) {
  document.getElementById('marketabilityContent').innerHTML = `
        <div class="market-score-row">
            <span class="market-score-badge">${m.score}<span style="font-size:1rem;font-weight:400">/100</span></span>
            <span style="color:var(--text-secondary)">${escapeHtml(m.target_customer)}</span>
        </div>
        <p><b>Pain Level:</b> ${escapeHtml(m.pain_level)}</p>
        <p style="margin-top:10px; font-style:italic; color: var(--primary-color);">
            🎯 ${escapeHtml(m.strongest_message_angle)}
        </p>
        <div class="market-signals-grid">
            <div>
                <h4>✅ Demand Signals</h4>
                <ul class="critique-list">
                    ${m.demand_signals.map((s) => `<li style="border-left-color: var(--success-color)">${escapeHtml(s)}</li>`).join('')}
                </ul>
            </div>
            <div>
                <h4>⛔ Adoption Blockers</h4>
                <ul class="critique-list">
                    ${m.adoption_blockers.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function displayGTM(channels) {
  if (!channels || !channels.length) {
    document.getElementById('gtmContent').innerHTML =
      '<p>No GTM channels identified.</p>';
    return;
  }
  document.getElementById('gtmContent').innerHTML = channels
    .map(
      (ch) => `
        <div class="gtm-channel">
            <div class="gtm-header">
                <span class="gtm-name">${escapeHtml(ch.name)}</span>
                <span class="priority-badge priority-${ch.priority}">${ch.priority}</span>
            </div>
            <p>${escapeHtml(ch.rationale)}</p>
            <div class="gtm-meta">
                <div><b>First Test:</b> ${escapeHtml(ch.first_test)}</div>
                <div><b>Success Metric:</b> ${escapeHtml(ch.success_metric)}</div>
                <div><b>Effort:</b> ${escapeHtml(ch.estimated_effort)}</div>
            </div>
        </div>
    `,
    )
    .join('');
}

function displayExperiments(experiments) {
  if (!experiments || !experiments.length) {
    document.getElementById('experimentsContent').innerHTML =
      '<p>No growth experiments proposed.</p>';
    return;
  }
  document.getElementById('experimentsContent').innerHTML =
    experiments
      .map(
        (exp) => `
        <div class="experiment-card">
            <div class="gtm-header">
                <span class="gtm-name">${escapeHtml(exp.name)}</span>
                <span class="priority-badge priority-${exp.priority}">${exp.priority}</span>
            </div>
            <p><i>${escapeHtml(exp.hypothesis)}</i></p>
            <p><b>Audience:</b> ${escapeHtml(exp.audience)}</p>
            <div class="exp-meta">
                <span>⏱ ${exp.duration_days} days</span>
                <span>💰 $${exp.budget_usd}</span>
                <span>🎯 ${escapeHtml(exp.success_metric)}</span>
            </div>
            <p><b>Decision rule:</b> ${escapeHtml(exp.decision_rule)}</p>
            <ol class="exp-steps">
                ${exp.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
            </ol>
        </div>
    `,
      )
      .join('');
}

function displayCompetitors(competitors) {
  if (!competitors || !competitors.length) {
    document.getElementById('competitorContent').innerHTML =
      '<p>No competitors identified.</p>';
    return;
  }
  document.getElementById('competitorContent').innerHTML = `
        <div class="competitor-grid">
            ${competitors
              .map(
                (c) => `
                <div class="competitor-card">
                    <div class="competitor-name">${escapeHtml(c.name)}</div>
                    <div class="competitor-category">${escapeHtml(c.category)}</div>
                    <p>${escapeHtml(c.why_it_matters)}</p>
                    <p class="differentiation">💡 ${escapeHtml(c.differentiation_opportunity)}</p>
                </div>
            `,
              )
              .join('')}
        </div>
    `;
}

function displayAds(ads) {
  if (!ads || !ads.length) {
    document.getElementById('adsContent').innerHTML =
      '<p>No ad creatives generated.</p>';
    return;
  }
  document.getElementById('adsContent').innerHTML = ads
    .map(
      (ad) => `
        <div class="ad-card">
            <div class="ad-channel">${escapeHtml(ad.channel)}</div>
            <div class="ad-headline">${escapeHtml(ad.headline)}</div>
            <p>${escapeHtml(ad.primary_text)}</p>
            <div class="ad-cta">CTA: ${escapeHtml(ad.cta)}</div>
        </div>
    `,
    )
    .join('');
}

function displayRealityCheck(rc) {
  document.getElementById('realityContent').innerHTML = `
        <p><b>Biggest Assumption:</b> ${escapeHtml(rc.biggest_assumption)}</p>
        <p style="margin-top:10px;"><b>Fastest Validation Test:</b> ${escapeHtml(rc.fastest_validation_test)}</p>
        <div class="market-signals-grid" style="margin-top:15px;">
            <div>
                <h4>🛑 Kill Criteria</h4>
                <ul class="critique-list">
                    ${rc.kill_criteria.map((k) => `<li>${escapeHtml(k)}</li>`).join('')}
                </ul>
            </div>
            <div>
                <h4>⚠️ Key Risks</h4>
                <ul class="critique-list">
                    ${rc.key_risks.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function displayNextActions(actions) {
  document.getElementById('nextActionsContent').innerHTML = (
    actions || []
  )
    .map((a) => `<li>${escapeHtml(a)}</li>`)
    .join('');
}

function showError(message) {
  document.getElementById('loadingSection').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('errorSection').style.display = 'block';
  document.getElementById('errorMessage').textContent = message;
}

function getScoreColor(score) {
  if (score >= 8) return '#10b981';
  if (score >= 6) return '#f59e0b';
  return '#ef4444';
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}
