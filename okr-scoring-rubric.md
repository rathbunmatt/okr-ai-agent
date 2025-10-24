# OKR Quality Scoring Rubric for AI Agent

## Overview

This rubric enables the AI agent to systematically evaluate OKR quality during conversation and provide targeted feedback. Each component is scored on a 0-100 scale, with specific criteria and response strategies for different score ranges.

## Objective Scoring Framework

### 1. Outcome Orientation (Weight: 30%)

**100 Points - Exemplary**
- Clearly describes a future state or condition
- No mention of activities, deliverables, or projects
- Focuses on impact rather than output
- *Example*: "Become the preferred analytics platform for data scientists"

**75 Points - Strong**
- Mostly outcome-focused with minor activity language
- Clear end state with some "how" mixed in
- *Example*: "Transform customer onboarding to create delighted users"

**50 Points - Developing**
- Mix of outcomes and activities
- Some focus on end state but includes implementation details
- *Example*: "Launch new features to improve customer satisfaction"

**25 Points - Weak**
- Primarily activity-based with hint of outcome
- Heavy focus on deliverables
- *Example*: "Implement new CRM system to improve sales efficiency"

**0 Points - Poor**
- Pure activity or task list
- Only describes what will be done, not why
- *Example*: "Complete database migration"

**AI Response by Score**:
- 75-100: "Great outcome focus! Let's refine the language even more."
- 50-74: "I see where you're going. Let's remove the activity words like [specific words] and focus purely on the end state."
- 0-49: "This sounds like a project milestone. What happens AFTER [activity]? What change will we see?"

### 2. Inspirational Quality (Weight: 20%)

**100 Points - Exemplary**
- Language that energizes and motivates
- Creates emotional connection to purpose
- Makes people want to contribute
- *Example*: "Revolutionize how small businesses manage their finances"

**75 Points - Strong**
- Engaging language with clear value
- Some emotional appeal
- *Example*: "Dramatically improve developer productivity"

**50 Points - Developing**
- Functional but not particularly inspiring
- States value without emotional connection
- *Example*: "Increase platform reliability"

**25 Points - Weak**
- Dry, technical language
- No emotional appeal
- *Example*: "Optimize system performance metrics"

**0 Points - Poor**
- Demotivating or purely administrative
- *Example*: "Meet compliance requirements"

**AI Response by Score**:
- 75-100: "This objective would definitely motivate the team!"
- 50-74: "Good start. What words could we use to make this more exciting? What about [suggestion]?"
- 0-49: "Let's inject some energy here. Instead of '[current]', how about '[more inspiring alternative]'?"

### 3. Clarity & Memorability (Weight: 15%)

**100 Points - Exemplary**
- Can be recalled without notes
- Immediately understandable
- 10 words or fewer
- No jargon or acronyms

**75 Points - Strong**
- Clear with minor complexity
- 15 words or fewer
- Minimal jargon

**50 Points - Developing**
- Understandable but wordy
- Some unnecessary complexity
- 20 words or fewer

**25 Points - Weak**
- Confusing or overly complex
- Heavy jargon
- Over 20 words

**0 Points - Poor**
- Incomprehensible without explanation
- Multiple concepts crammed together

**AI Response by Score**:
- 75-100: "Nice and crisp! Easy for everyone to remember."
- 50-74: "Let's simplify. Which words are absolutely essential?"
- 0-49: "This is a bit complex. Can we capture the essence in 10 words or less?"

### 4. Strategic Alignment Potential (Weight: 15%)

**100 Points - Exemplary**
- Clear connection to business value
- Addresses critical challenge/opportunity
- Would excite leadership
- Cross-functional impact

**75 Points - Strong**
- Good business value
- Important but not critical
- Clear department-level impact

**50 Points - Developing**
- Some business value
- Nice-to-have improvement
- Team-level impact

**25 Points - Weak**
- Minimal business impact
- Maintains status quo
- Individual-level impact

**0 Points - Poor**
- No clear business value
- Purely internal benefit

**AI Response by Score**:
- 75-100: "This clearly connects to business impact!"
- 50-74: "How does this objective ladder up to company goals?"
- 0-49: "Let's explore why this matters to the business. Who benefits outside your team?"

### 5. Appropriate Ambition (Weight: 20%)

**100 Points - Exemplary**
- 70% achievement would be celebrated
- Requires new approaches/thinking
- Stretches team capabilities
- Not achievable through business as usual

**75 Points - Strong**
- Challenging but achievable
- Some stretch required
- 80% achievement feels right

**50 Points - Developing**
- Moderate challenge
- Could achieve 90% with normal effort
- Some new thinking required

**25 Points - Weak**
- Too easy or too impossible
- 100% or 30% achievement likely
- Normal effort sufficient

**0 Points - Poor**
- No stretch at all
- Will happen anyway
- Or completely unrealistic

**AI Response by Score**:
- 75-100: "This has great stretch! Achieving 70% would be a real win."
- 50-74: "This might be a bit conservative. What would make it more ambitious?"
- 0-49: "This seems [too easy/impossible]. What's a stretch that's still achievable?"

## Key Results Scoring Framework

### 1. Quantification Quality (Weight: 25%)

**100 Points - Exemplary**
- Specific numbers with baseline and target
- Clear calculation method
- Unambiguous measurement
- *Example*: "Increase MRR from $2.5M to $4M"

**75 Points - Strong**
- Numbers present but missing baseline or context
- *Example*: "Achieve $4M MRR"

**50 Points - Developing**
- Percentages without baselines
- *Example*: "Increase revenue by 60%"

**25 Points - Weak**
- Vague quantifiers
- *Example*: "Significantly increase revenue"

**0 Points - Poor**
- No numbers at all
- *Example*: "Improve revenue"

**AI Response by Score**:
- 75-100: "Excellent specificity! Clear baseline and target."
- 50-74: "Good start. What's our current baseline for this metric?"
- 0-49: "Let's add numbers. What would 'success' look like numerically?"

### 2. Outcome vs Activity (Weight: 30%)

**100 Points - Exemplary**
- Measures change in state/behavior
- Customer or business impact clear
- No mention of tasks/deliverables
- *Example*: "Reduce customer churn from 5% to 3%"

**75 Points - Strong**
- Mostly outcome with minor activity elements
- *Example*: "Launch feature that reduces churn to 3%"

**50 Points - Developing**
- Mix of outcome and activity
- *Example*: "Complete onboarding improvements to reduce churn"

**25 Points - Weak**
- Primarily activity-based
- *Example*: "Implement 5 retention features"

**0 Points - Poor**
- Pure task or deliverable
- *Example*: "Complete retention analysis"

**AI Response by Score**:
- 75-100: "Great outcome focus! This measures real impact."
- 50-74: "What happens after [activity]? Let's measure that instead."
- 0-49: "This is a task. What improvement will completing this task create?"

### 3. Measurement Feasibility (Weight: 15%)

**100 Points - Exemplary**
- Data readily available
- Clear measurement process
- Can track weekly/monthly
- No dependencies on others for data

**75 Points - Strong**
- Data available with minor effort
- Monthly tracking possible
- Some manual work required

**50 Points - Developing**
- Data exists but hard to get
- Quarterly measurement only
- Significant manual effort

**25 Points - Weak**
- Data difficult to obtain
- Measurement process unclear
- Heavy dependencies

**0 Points - Poor**
- No clear way to measure
- Would require new systems
- Pure guesswork

**AI Response by Score**:
- 75-100: "Great! How will you track this?"
- 50-74: "How easy is it to get this data? Should we consider a proxy metric?"
- 0-49: "This seems hard to measure. What's a related metric we could track more easily?"

### 4. Independence (Weight: 15%)

**100 Points - Exemplary**
- Team has full control over outcome
- No dependencies on other teams
- Can influence through own efforts
- Each KR independently valuable

**75 Points - Strong**
- Mostly in team's control
- Minor dependencies
- Can influence 80%+ of outcome

**50 Points - Developing**
- Shared control with others
- Some significant dependencies
- Can influence 50-80%

**25 Points - Weak**
- Heavily dependent on others
- Limited control
- Less than 50% influence

**0 Points - Poor**
- Completely dependent on external factors
- No real control
- Just hoping for the best

**AI Response by Score**:
- 75-100: "Good! Your team can drive this directly."
- 50-74: "What parts depend on others? Can we focus on what you control?"
- 0-49: "This seems outside your control. What aspect CAN you influence?"

### 5. Appropriate Challenge Level (Weight: 15%)

**100 Points - Exemplary**
- 70% achievement would be success
- Requires innovation/new approaches
- Energizing but not demoralizing

**75 Points - Strong**
- Good stretch
- 75-80% achievement expected
- Challenging but realistic

**50 Points - Developing**
- Moderate stretch
- 85-90% achievement likely
- Some new effort required

**25 Points - Weak**
- Too easy or impossible
- 100% or <40% achievement expected

**0 Points - Poor**
- No challenge at all
- Or completely unrealistic

**AI Response by Score**:
- 75-100: "This stretch feels right - ambitious but achievable!"
- 50-74: "Could we make this more ambitious? What would stretch the team?"
- 0-49: "This seems [too conservative/unrealistic]. What's a better target?"

## Overall OKR Set Scoring

### Coherence Score (0-100)
Evaluates how well KRs support the Objective:
- Do all KRs clearly indicate progress toward the Objective?
- Are there missing aspects that should be measured?
- Do KRs overlap or duplicate measurement?

### Focus Score (0-100)
Evaluates appropriate number and scope:
- 3-5 KRs per Objective (lose 20 points per KR over 5)
- KRs cover different dimensions of success
- No kitchen sink effect

### Balance Score (0-100)
Evaluates mix of leading and lagging indicators:
- At least one leading indicator (predictive)
- At least one lagging indicator (outcome)
- Mix of short and long-term measures

## AI Decision Logic

### When to Proceed vs Iterate

**Proceed to Next Phase When**:
- Objective scores >75 overall
- All critical categories (Outcome, Ambition) score >50
- Human expresses satisfaction

**Require Iteration When**:
- Any category scores <25
- Overall score <60
- Human expresses uncertainty

### Intervention Strategies by Score Range

**Score 80-100: Light Touch**
- "Excellent! Just one small refinement..."
- Focus on polishing language
- Celebrate the quality

**Score 60-79: Targeted Improvement**
- "Good foundation. Let's strengthen [specific area]"
- Focus on 1-2 lowest scoring areas
- Provide specific examples

**Score 40-59: Significant Coaching**
- "Let's rethink this approach..."
- Return to discovery questions
- Provide multiple examples

**Score 0-39: Full Reset**
- "I think we might be mixing OKRs with project plans..."
- Explain the concept again
- Start with a simpler example

## Real-Time Scoring Examples

### Example 1: Product Team

**Human Input**: "Our objective is to launch the new mobile app"

**AI Scoring**:
- Outcome Orientation: 0 (pure activity)
- Inspirational: 25 (functional but not inspiring)
- Clarity: 75 (clear but not memorable)
- Strategic Alignment: 50 (unknown without context)
- Ambition: 25 (binary - launched or not)
- **Overall: 35/100**

**AI Response**: "Launching the app is definitely important! But let's think about WHY we're building it. What change will the app create for users? That's where we'll find our objective."

### Example 2: Sales Team

**Human Input**: "Dominate the enterprise market"

**AI Scoring**:
- Outcome Orientation: 100 (pure outcome)
- Inspirational: 100 (energizing language)
- Clarity: 100 (memorable and clear)
- Strategic Alignment: 100 (clear business impact)
- Ambition: 75 (ambitious but needs KRs to validate)
- **Overall: 95/100**

**AI Response**: "Love the ambition! This will definitely energize the team. Now let's define what 'dominate' means with specific metrics."

## Implementation Notes

1. **Scoring should be invisible to the human** - Use scores to guide responses, not share them
2. **Weight adjustments** - Can adjust weights based on organization's priorities
3. **Context matters** - A "maintain" objective might score low but be appropriate for compliance
4. **Learning loop** - Track which interventions successfully improve scores
5. **Cultural sensitivity** - Adjust ambition expectations based on organizational culture

## Quick Reference Card

### Objective Red Flags (Immediate Intervention)
- Contains: "implement," "launch," "complete," "deliver"
- Longer than 20 words
- No clear value proposition
- Can't explain "why" in one sentence

### Key Result Red Flags (Immediate Intervention)
- No numbers
- Binary (done/not done)
- Measures activity not outcome
- Team has no control
- No baseline provided

### Green Flags (Celebrate & Build)
- Describes future state
- Includes specific numbers
- Measures impact
- Appropriately ambitious
- Team is excited