from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import mean

from agent3.models import (
    AdCreative,
    Agent1Evaluation,
    Agent2Planning,
    Agent3Request,
    Agent3Response,
    CompetitorInsight,
    FinalRecommendation,
    GTMChannel,
    GrowthExperiment,
    MarketabilityCheck,
    Priority,
    RealityCheck,
    RecommendationVerdict,
    Scorecard,
)


@dataclass(frozen=True)
class ChannelTemplate:
    name: str
    rationale: str
    first_test: str
    success_metric: str
    estimated_effort: str


class Agent3Analyzer:
    """Market and growth analysis for Agent Service 3.

    This implementation is deterministic so the service can run locally before an
    LLM provider is connected. The prompt in prompts.py can be reused by a future
    LLM-backed adapter while preserving the same API contract.
    """

    def analyze(self, request: Agent3Request) -> Agent3Response:
        text = self._idea_text(request).lower()
        evaluation = request.evaluation or Agent1Evaluation()
        planning = request.planning or Agent2Planning()

        scorecard = self._scorecard(request, text, evaluation)
        marketability = self._marketability_check(request, text, scorecard)
        channels = self._gtm_channels(request, text)
        experiments = self._growth_experiments(request, text, channels)
        ads = self._advertisement_help(request, marketability, channels, planning)
        competitors = self._competitor_scan(request, text)
        recommendation = self._final_recommendation(request, scorecard)
        reality_check = self._reality_check(request, text)
        next_actions = self._next_actions(request, experiments, channels)

        return Agent3Response(
            row_id=request.idea.row_id,
            generated_at=datetime.now(timezone.utc),
            scorecard=scorecard,
            marketability_check=marketability,
            competitor_scan=competitors,
            gtm_channels=channels,
            growth_experiments=experiments,
            advertisement_help=ads,
            final_recommendation=recommendation,
            reality_check=reality_check,
            next_actions=next_actions,
            notes=[
                "Competitor scan is inferred from the idea text unless external research is provided.",
                "Use the first experiment as the launch gate before investing in a full build.",
            ],
        )

    def _scorecard(
        self,
        request: Agent3Request,
        text: str,
        evaluation: Agent1Evaluation,
    ) -> Scorecard:
        marketability = evaluation.marketability_score or self._keyword_score(
            text,
            positive={"urgent", "save", "revenue", "automate", "faster", "cost", "customers", "compliance"},
            negative={"nice to have", "fun", "maybe", "general", "everyone"},
            base=58,
        )
        feasibility = evaluation.feasibility_score or 62
        innovation = evaluation.innovation_score or self._keyword_score(
            text,
            positive={"ai", "agent", "workflow", "automation", "marketplace", "personalized"},
            negative={"directory", "newsletter", "blog", "generic"},
            base=55,
        )

        speed_to_market = self._speed_score(request, feasibility)
        distribution_fit = self._distribution_score(text, request)
        monetization = self._monetization_score(request, text)
        risk = self._risk_score(request, feasibility, marketability)

        return Scorecard(
            marketability=self._clamp(marketability),
            speed_to_market=self._clamp(speed_to_market),
            differentiation=self._clamp(round(mean([innovation, self._differentiation_signal(text)]))),
            distribution_fit=self._clamp(distribution_fit),
            monetization_confidence=self._clamp(monetization),
            risk=self._clamp(risk),
        )

    def _marketability_check(
        self,
        request: Agent3Request,
        text: str,
        scorecard: Scorecard,
    ) -> MarketabilityCheck:
        customer = request.idea.target_customer or self._infer_customer(text)
        pain = "high" if scorecard.marketability >= 75 else "medium" if scorecard.marketability >= 50 else "low"

        demand_signals = [
            f"{customer} can understand the promise without needing a long explanation.",
            "The idea can be validated with a landing page, outreach list, or concierge pilot.",
        ]
        if self._is_b2b(text):
            demand_signals.append("B2B buyers can be reached directly through targeted outbound and niche communities.")
        if "ai" in text or "agent" in text:
            demand_signals.append("The AI angle can be used as a speed or automation benefit, not just as a feature label.")
        if request.idea.price_point:
            demand_signals.append(f"The stated price point gives early tests a monetization anchor: {request.idea.price_point}.")

        blockers = [
            "The target customer must be narrower before paid acquisition scales.",
            "Competitor claims need manual verification before public positioning is finalized.",
        ]
        if scorecard.risk >= 70:
            blockers.append("Execution risk is high enough that the first launch should sell the outcome before building depth.")
        if not request.idea.problem:
            blockers.append("The customer pain is not explicit enough yet; sharpen the problem statement.")

        return MarketabilityCheck(
            score=scorecard.marketability,
            target_customer=customer,
            pain_level=pain,
            demand_signals=demand_signals,
            adoption_blockers=blockers,
            strongest_message_angle=self._message_angle(request, customer),
        )

    def _competitor_scan(self, request: Agent3Request, text: str) -> list[CompetitorInsight]:
        category = request.idea.category or "adjacent solutions"
        if self._is_b2b(text):
            return [
                CompetitorInsight(
                    name="Manual consultant or agency workflow",
                    category="service substitute",
                    why_it_matters="Many early customers solve this problem with people, spreadsheets, or custom consulting.",
                    differentiation_opportunity="Position around speed, repeatability, and a lower first-step cost than bespoke work.",
                ),
                CompetitorInsight(
                    name=f"Vertical SaaS tools in {category}",
                    category="software competitor",
                    why_it_matters="Buyers may already have a partial workflow embedded in their current tools.",
                    differentiation_opportunity="Win by integrating with existing workflows instead of asking users to migrate.",
                ),
                CompetitorInsight(
                    name="Internal ops process",
                    category="status quo",
                    why_it_matters="The biggest competitor may be doing nothing or using an internal checklist.",
                    differentiation_opportunity="Lead with the cost of delay and a small pilot that proves lift quickly.",
                ),
            ]

        return [
            CompetitorInsight(
                name="DIY workaround",
                category="status quo",
                why_it_matters="Consumers often use free tools, notes, spreadsheets, or social platforms before paying.",
                differentiation_opportunity="Make the first value moment faster and more delightful than the workaround.",
            ),
            CompetitorInsight(
                name=f"Popular apps in {category}",
                category="app competitor",
                why_it_matters="Existing apps may already own attention or distribution in the category.",
                differentiation_opportunity="Compete on a narrower audience, stronger hook, or community-led launch.",
            ),
            CompetitorInsight(
                name="Creator or community recommendation",
                category="trust substitute",
                why_it_matters="A trusted creator can beat a product with weaker distribution.",
                differentiation_opportunity="Use creator partnerships and social proof as part of the product launch.",
            ),
        ]

    def _gtm_channels(self, request: Agent3Request, text: str) -> list[GTMChannel]:
        allowed = {channel.lower() for channel in request.constraints.channels_allowed}
        templates = self._channel_templates(text)
        filtered = [
            template for template in templates if not allowed or any(token in template.name.lower() for token in allowed)
        ]
        if not filtered:
            filtered = templates

        channels: list[GTMChannel] = []
        for index, template in enumerate(filtered[:5]):
            channels.append(
                GTMChannel(
                    name=template.name,
                    priority=Priority.HIGH if index < 2 else Priority.MEDIUM if index < 4 else Priority.LOW,
                    rationale=template.rationale,
                    first_test=template.first_test,
                    success_metric=template.success_metric,
                    estimated_effort=template.estimated_effort,
                )
            )
        return channels

    def _growth_experiments(
        self,
        request: Agent3Request,
        text: str,
        channels: list[GTMChannel],
    ) -> list[GrowthExperiment]:
        customer = request.idea.target_customer or self._infer_customer(text)
        budget = request.constraints.budget_usd
        first_channel = channels[0] if channels else None
        second_channel = channels[1] if len(channels) > 1 else first_channel

        experiments = [
            GrowthExperiment(
                name="Problem-to-waitlist smoke test",
                priority=Priority.HIGH,
                hypothesis=f"{customer} will exchange an email or call booking for a clear promise before the product is built.",
                audience=customer,
                steps=[
                    "Publish a one-page landing page with one promise, one proof point, and one call to action.",
                    "Send traffic from the highest-priority channel.",
                    "Follow up with every signup to learn the buying trigger and current workaround.",
                ],
                duration_days=min(7, request.constraints.timeline_days),
                budget_usd=min(150, budget),
                success_metric="Signup or booked-call conversion rate",
                decision_rule="Proceed if conversion is 8%+ from targeted traffic or 3+ qualified calls are booked.",
            ),
            GrowthExperiment(
                name="Concierge pilot pre-sale",
                priority=Priority.HIGH,
                hypothesis="A narrow customer segment will pay or commit if the outcome is delivered manually first.",
                audience=customer,
                steps=[
                    "Create a simple offer with a fixed result and a short delivery window.",
                    "Pitch 25 targeted prospects with a personal note.",
                    "Deliver manually for the first 1-3 users and document objections.",
                ],
                duration_days=min(10, request.constraints.timeline_days),
                budget_usd=0,
                success_metric="Paid pilot, letter of intent, or explicit budget confirmation",
                decision_rule="Build only after 1 paid pilot, 2 letters of intent, or repeated budget-confirmed demand.",
            ),
            GrowthExperiment(
                name=f"{first_channel.name if first_channel else 'Primary channel'} acquisition test",
                priority=Priority.MEDIUM,
                hypothesis="The primary channel can generate qualified demand cheaply enough for a repeatable launch loop.",
                audience=customer,
                steps=[
                    f"Run the first test: {first_channel.first_test if first_channel else 'Send a targeted campaign.'}",
                    "Track source, message, conversion, and objection for every response.",
                    "Double down only on audiences that show intent, not just curiosity.",
                ],
                duration_days=min(14, request.constraints.timeline_days),
                budget_usd=min(250, max(0, budget - 150)),
                success_metric=first_channel.success_metric if first_channel else "Qualified response rate",
                decision_rule="Keep the channel if it produces qualified leads below the target acquisition cost.",
            ),
            GrowthExperiment(
                name=f"{second_channel.name if second_channel else 'Secondary channel'} message test",
                priority=Priority.MEDIUM,
                hypothesis="A stronger hook can increase response before adding more channels or features.",
                audience=customer,
                steps=[
                    "Test three hooks: pain avoidance, speed gain, and outcome proof.",
                    "Use the same audience and call to action for each message.",
                    "Promote the winning hook into ad copy, landing page headline, and outreach opener.",
                ],
                duration_days=min(5, request.constraints.timeline_days),
                budget_usd=min(100, budget),
                success_metric="Reply, signup, or click-through rate by hook",
                decision_rule="Use the hook that beats the runner-up by 30%+ or produces the highest qualified intent.",
            ),
        ]

        return experiments

    def _advertisement_help(
        self,
        request: Agent3Request,
        marketability: MarketabilityCheck,
        channels: list[GTMChannel],
        planning: Agent2Planning,
    ) -> list[AdCreative]:
        positioning = planning.positioning or marketability.strongest_message_angle
        title = request.idea.title.strip()
        customer = marketability.target_customer
        primary_channel = channels[0].name if channels else "Landing page"

        return [
            AdCreative(
                channel=primary_channel,
                headline=f"Get {title} in front of real buyers this week",
                primary_text=f"Stop debating the idea in private. Validate the promise with {customer}, learn the objections, and launch the smallest version that can earn a yes.",
                cta="Join the pilot",
            ),
            AdCreative(
                channel="LinkedIn or founder-led outbound",
                headline=f"Still solving this with spreadsheets or guesswork?",
                primary_text=f"{positioning} I am opening a small pilot for {customer} who want the outcome faster without committing to a full build.",
                cta="Book a 15-minute fit call",
            ),
            AdCreative(
                channel="Short-form social",
                headline=f"Would you use this?",
                primary_text=f"We are testing {title}: {request.idea.description[:180].rstrip()} Share the current workaround and get early access.",
                cta="Get early access",
            ),
        ]

    def _final_recommendation(self, request: Agent3Request, scorecard: Scorecard) -> FinalRecommendation:
        launch_score = round(
            mean(
                [
                    scorecard.marketability,
                    scorecard.speed_to_market,
                    scorecard.distribution_fit,
                    scorecard.monetization_confidence,
                    100 - scorecard.risk,
                ]
            )
        )

        if launch_score >= 72:
            verdict = RecommendationVerdict.LAUNCH
            rationale = "The idea is strong enough for a fast public validation launch with a narrow segment and measurable channel tests."
        elif launch_score >= 55:
            verdict = RecommendationVerdict.VALIDATE_FIRST
            rationale = "The idea has enough signal to test, but the first milestone should prove demand before expanding product scope."
        elif scorecard.differentiation < 45:
            verdict = RecommendationVerdict.PIVOT
            rationale = "The current positioning is not differentiated enough; narrow the buyer, pain, or outcome before launch."
        else:
            verdict = RecommendationVerdict.PARK
            rationale = "The market signal is too weak for a launch push right now compared with faster validation candidates."

        return FinalRecommendation(
            verdict=verdict,
            confidence=self._clamp(launch_score),
            rationale=rationale,
            launch_window_days=min(max(3, request.constraints.timeline_days), 30),
        )

    def _reality_check(self, request: Agent3Request, text: str) -> RealityCheck:
        customer = request.idea.target_customer or self._infer_customer(text)
        return RealityCheck(
            biggest_assumption=f"{customer} feels this problem often enough to act now, not later.",
            fastest_validation_test="Sell the outcome manually to a narrow list before building a full product workflow.",
            kill_criteria=[
                "Fewer than 3 qualified responses after 50 targeted outreaches.",
                "No one can describe a current workaround, budget, or recent trigger event.",
                "Prospects like the concept but will not join a waitlist, book a call, or commit to a pilot.",
            ],
            key_risks=[
                "The idea may be interesting but not urgent.",
                "Distribution may be harder than product development.",
                "A broad customer definition can dilute messaging and make early ads inconclusive.",
            ],
        )

    def _next_actions(
        self,
        request: Agent3Request,
        experiments: list[GrowthExperiment],
        channels: list[GTMChannel],
    ) -> list[str]:
        first_experiment = experiments[0]
        first_channel = channels[0]
        return [
            "Pick one narrow customer segment and rewrite the landing page for only that segment.",
            f"Run '{first_experiment.name}' for {first_experiment.duration_days} days.",
            f"Use {first_channel.name} first: {first_channel.first_test}",
            "Record every objection as either unclear value, low urgency, missing trust, or wrong buyer.",
            "Make the launch decision using the experiment decision rule, not personal excitement.",
        ]

    def _channel_templates(self, text: str) -> list[ChannelTemplate]:
        if self._is_b2b(text):
            return [
                ChannelTemplate(
                    name="Founder-led LinkedIn outbound",
                    rationale="Fastest way to reach a specific B2B buyer without waiting for SEO or paid-learning cycles.",
                    first_test="Send 25 personalized messages to buyers with a visible trigger event.",
                    success_metric="Positive reply rate and booked-call rate",
                    estimated_effort="1 day to set up, 3-5 days to read signal",
                ),
                ChannelTemplate(
                    name="Niche community proof post",
                    rationale="Communities reveal wording, objections, and early believers quickly.",
                    first_test="Post a specific before/after story and ask for 5 pilot users.",
                    success_metric="Qualified comments, DMs, and pilot requests",
                    estimated_effort="Half day to write, 48 hours to read signal",
                ),
                ChannelTemplate(
                    name="Partner or integration wedge",
                    rationale="Borrow trust from tools or service providers already serving the buyer.",
                    first_test="Pitch 5 adjacent consultants, agencies, or tool owners on a co-marketed pilot.",
                    success_metric="Partner intros and referred pilot leads",
                    estimated_effort="2 days to pitch, 1 week to validate",
                ),
                ChannelTemplate(
                    name="Problem-intent search page",
                    rationale="Captures people already searching for the problem or current workaround.",
                    first_test="Publish one high-intent page comparing the old workflow to the new outcome.",
                    success_metric="Search impressions, click-through rate, and waitlist conversion",
                    estimated_effort="1 day to publish, 2-4 weeks to mature",
                ),
                ChannelTemplate(
                    name="Paid micro-test",
                    rationale="Small paid tests can compare messages before committing to a full acquisition channel.",
                    first_test="Run three ad hooks against the same landing page with a capped budget.",
                    success_metric="Cost per qualified signup or booked call",
                    estimated_effort="1 day setup, 3-7 days to read signal",
                ),
            ]

        return [
            ChannelTemplate(
                name="Short-form demo loop",
                rationale="Consumer ideas need fast emotional clarity, and short-form video tests the hook cheaply.",
                first_test="Post 5 versions of the same demo with different first-three-second hooks.",
                success_metric="Save rate, comment intent, and profile-to-waitlist conversion",
                estimated_effort="1 day to create, 3 days to read signal",
            ),
            ChannelTemplate(
                name="Creator affiliate pilot",
                rationale="A trusted small creator can validate audience pull faster than brand-owned content.",
                first_test="Offer 3 micro-creators early access plus a simple referral reward.",
                success_metric="Creator response rate and referred signups",
                estimated_effort="2 days outreach, 1 week to validate",
            ),
            ChannelTemplate(
                name="Community challenge",
                rationale="Challenges create urgency and make the product outcome visible in public.",
                first_test="Run a 5-day challenge around the problem and invite users to try the solution.",
                success_metric="Challenge completion and conversion to signup",
                estimated_effort="2 days setup, 5 days live",
            ),
            ChannelTemplate(
                name="Referral waitlist",
                rationale="If users want status or access, referrals can test shareability before launch.",
                first_test="Give early access priority for every qualified referral.",
                success_metric="Referral rate per signup",
                estimated_effort="1 day setup, 1 week to validate",
            ),
            ChannelTemplate(
                name="Paid social micro-test",
                rationale="Paid social can quickly expose whether the promise earns attention outside your network.",
                first_test="Spend a small budget across three hooks and one landing page.",
                success_metric="Cost per signup and landing page conversion rate",
                estimated_effort="1 day setup, 3-7 days to read signal",
            ),
        ]

    def _idea_text(self, request: Agent3Request) -> str:
        parts = [
            request.idea.title,
            request.idea.description,
            request.idea.target_customer or "",
            request.idea.problem or "",
            request.idea.solution or "",
            request.idea.category or "",
        ]
        return " ".join(part for part in parts if part)

    def _infer_customer(self, text: str) -> str:
        if any(token in text for token in ["b2b", "sales", "founder", "saas", "operations", "enterprise"]):
            return "small B2B teams with an urgent workflow problem"
        if any(token in text for token in ["student", "school", "teacher", "education"]):
            return "students or educators with a recurring learning pain"
        if any(token in text for token in ["creator", "influencer", "newsletter", "audience"]):
            return "creators trying to grow or monetize an audience"
        if any(token in text for token in ["local", "restaurant", "clinic", "retail"]):
            return "local businesses with limited time and budget"
        return "early adopters who already feel the problem"

    def _message_angle(self, request: Agent3Request, customer: str) -> str:
        problem = request.idea.problem or "the painful part of the workflow"
        solution = request.idea.solution or request.idea.title
        return f"Help {customer} solve {problem} faster with {solution}."

    def _is_b2b(self, text: str) -> bool:
        b2b_markers = {
            "b2b",
            "business",
            "company",
            "team",
            "sales",
            "revenue",
            "operations",
            "workflow",
            "saas",
            "enterprise",
            "founder",
            "agency",
        }
        consumer_markers = {"consumer", "friends", "dating", "fitness", "student", "shopping", "home"}
        b2b_score = sum(marker in text for marker in b2b_markers)
        consumer_score = sum(marker in text for marker in consumer_markers)
        return b2b_score > consumer_score

    def _keyword_score(self, text: str, positive: set[str], negative: set[str], base: int) -> int:
        score = base + 5 * sum(keyword in text for keyword in positive) - 6 * sum(keyword in text for keyword in negative)
        return self._clamp(score)

    def _speed_score(self, request: Agent3Request, feasibility: int) -> int:
        score = 55 + round(feasibility * 0.25)
        if request.constraints.timeline_days <= 14:
            score += 8
        if request.constraints.team_size <= 2:
            score -= 4
        if request.constraints.budget_usd <= 100:
            score -= 4
        return self._clamp(score)

    def _distribution_score(self, text: str, request: Agent3Request) -> int:
        score = 58
        if request.idea.target_customer:
            score += 10
        if any(token in text for token in ["community", "creator", "linkedin", "referral", "seo", "marketplace"]):
            score += 8
        if "everyone" in text or "all people" in text:
            score -= 12
        return self._clamp(score)

    def _monetization_score(self, request: Agent3Request, text: str) -> int:
        score = 55
        if request.idea.price_point:
            score += 12
        if any(token in text for token in ["save money", "revenue", "cost", "roi", "paid", "budget"]):
            score += 10
        if any(token in text for token in ["free", "students", "hobby"]):
            score -= 8
        return self._clamp(score)

    def _risk_score(self, request: Agent3Request, feasibility: int, marketability: int) -> int:
        score = 55 - round(feasibility * 0.2) - round(marketability * 0.15)
        if request.constraints.risk_tolerance == "low":
            score += 10
        if not request.idea.target_customer:
            score += 12
        if not request.idea.problem:
            score += 10
        return self._clamp(score)

    def _differentiation_signal(self, text: str) -> int:
        score = 50
        if any(token in text for token in ["first", "unique", "new", "ai", "agent", "automatic", "personalized"]):
            score += 12
        if any(token in text for token in ["better", "simple", "easy", "platform"]):
            score -= 4
        return self._clamp(score)

    def _clamp(self, value: int | float, low: int = 0, high: int = 100) -> int:
        return max(low, min(high, round(value)))
