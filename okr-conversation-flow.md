# OKR AI Agent Conversation Flow Prototype

## Phase 1: Opening Discovery (5-10 minutes)

### Initial Greeting and Context Setting

**Agent**: "Hi! I'm here to help you create meaningful OKRs that drive real impact. Before we dive in, let me explain my approach: I'll ask you some questions to understand what you're trying to achieve, then we'll work together to craft objectives that inspire your team and key results that measure true success. This usually takes about 20-30 minutes. Ready to start?"

### Discovery Question Sequence

#### Question 1: Context and Scope
**Agent**: "First, tell me about the context for these OKRs. Are we creating them for a specific team, department, or the entire organization? And what time period are we focusing on?"

**Human Response Branches**:
- If team/department → Note the scope and continue
- If unclear → "Let's start with your immediate team. We can always expand later if needed."

#### Question 2: The Aspiration Question
**Agent**: "Imagine it's the end of [time period mentioned]. What's the most important change you want to see? Don't worry about how to measure it yet - just paint me a picture of what success looks like."

**Human Response Branches**:
- If outcome-focused → "That's a great vision! Tell me more about why this change matters."
- If activity-focused → Gentle redirect (see Reframing Techniques below)
- If vague → "That's a good starting point. Can you help me understand what would be different for your customers/users/team when this happens?"

#### Question 3: The Impact Question
**Agent**: "Who benefits most when you achieve this? And how would their life or work be different?"

**Purpose**: Forces thinking about external impact rather than internal activities

#### Question 4: The Challenge Question
**Agent**: "What's preventing you from having this impact today? What are the biggest obstacles?"

**Purpose**: Identifies areas where OKRs can drive meaningful change

#### Question 5: The Excitement Test
**Agent**: "On a scale of 1-10, how excited does your team feel about working toward this vision? What would make it a 10?"

**Purpose**: Ensures objectives will be inspirational, not just functional

### Reframing Techniques for Activity-Based Responses

#### Scenario 1: Project Delivery Focus
**Human**: "We need to launch our new mobile app by Q2."

**Agent**: "Launching the mobile app is definitely an important milestone! But let's zoom out a bit - why are you building this app in the first place? What problem does it solve for your users that they can't solve today?"

**Human**: "Well, our customers keep asking for a way to access their accounts on the go."

**Agent**: "Perfect! So it sounds like the real goal is about empowering customers with anywhere, anytime access. How would their behavior change once they have this? What would they be able to do that they can't do now?"

#### Scenario 2: Internal Process Focus
**Human**: "We need to implement the new CRM system."

**Agent**: "I hear that the CRM implementation is critical. Let's explore the 'why' behind it. Once the CRM is fully up and running, what improvements will you see? What problems will disappear?"

**Human**: "Sales reps waste too much time on data entry and can't find customer information quickly."

**Agent**: "Now we're getting somewhere! It sounds like you want to transform sales productivity by eliminating friction in their daily work. What would sales reps do with that extra time? How would it change their results?"

#### Scenario 3: Metric Without Meaning
**Human**: "We want to increase our social media followers by 50%."

**Agent**: "Growing your social presence is great! But help me understand - what does having more followers enable for your business? Are you looking to increase brand awareness, drive more sales, get customer feedback, or something else?"

## Phase 2: Objective Refinement Loop (10-15 minutes)

### Crafting the Objective Statement

**Agent**: "Based on what you've shared, let me reflect back what I'm hearing. You want to [synthesized outcome from discovery]. Is that right?"

#### Iteration Process

**First Draft Attempt**:
**Agent**: "Let's try drafting an objective. Remember, it should be inspirational and describe a future state, not activities. Based on our conversation, how about: '[Draft objective based on discovery]'?"

**Human Response Branches**:
- If agrees → "Good! But let's make sure it really captures the impact. What would [key stakeholder] say if they saw this objective?"
- If disagrees → "What would you change? What's missing?"
- If reverts to activities → Apply gentle correction

#### The Five Whys Technique
**Agent**: "I like where this is heading. Let's make sure we're getting to the true impact. Why is [their stated outcome] important?"

**Continue asking why until reaching business/customer value**

Example:
1. "Why do we want to reduce support tickets?" → "To free up our support team"
2. "Why do we want to free up our support team?" → "So they can handle more complex issues"
3. "Why is handling complex issues important?" → "Because those are where we can really delight customers and differentiate our service"

**Result**: Objective evolves from "Reduce support tickets" to "Transform support into a competitive advantage through proactive problem-solving"

#### Language Enhancement
**Agent**: "Now let's make this objective more inspiring. Which sounds more exciting to your team:"
- Option A: [Current draft]
- Option B: [More aspirational version]
- Option C: "Or would you phrase it differently?"

### Quality Checks

**Agent**: "Let's run a quick test on our objective. Answer yes or no:
1. Could someone outside your team understand what success looks like?
2. Does it describe a future state rather than activities to do?
3. Would your team be excited to work toward this?
4. Is it ambitious enough that achieving 70% would still be valuable?"

**If any "no" answers**: "Let's refine the areas that didn't pass. Which one should we tackle first?"

## Phase 3: Key Results Discovery Process (15-20 minutes)

### Opening the Metrics Conversation

**Agent**: "Great! Now we have our objective: '[Final objective]'. Let's figure out how we'll know we're achieving it. What are 3-5 specific, measurable changes that would prove we've succeeded?"

### Metric Brainstorming

**Agent**: "Let's brainstorm without judgment first. What could we measure that relates to [objective]? Think about:
- Customer behaviors that would change
- Business metrics that would improve  
- Quality indicators that would shift
- Efficiency gains we'd see"

**Human Response Branches**:
- If provides good metrics → "Excellent! Let's specify baselines and targets"
- If provides activities → Redirect to outcomes
- If struggles → Provide category-specific prompts

### Category-Specific Measurement Prompts

#### For Product Objectives
**Agent**: "For product improvements, we often measure things like:
- User adoption rates
- Feature engagement metrics
- Performance improvements
- User satisfaction scores
Which of these resonates with your objective?"

#### For Sales/Revenue Objectives
**Agent**: "For sales objectives, consider measuring:
- Revenue growth
- Deal velocity
- Win rates
- Customer acquisition metrics
What matters most for your specific goal?"

#### For Customer Success Objectives
**Agent**: "For customer success, we might track:
- NPS/CSAT scores
- Retention rates
- Time-to-value
- Support metrics
Which indicators would best show you're achieving '[objective]'?"

### Converting Activities to Outcomes

#### Common Redirects

**When human says**: "Complete training for all team members"
**Agent**: "Training is definitely important! But what should change after the training? What will people do differently? How about measuring the improvement in performance or efficiency that results from the training?"

**When human says**: "Launch 5 new features"
**Agent**: "I see you have specific features in mind. What impact do you expect these features to have on user behavior or business metrics? Could we measure adoption, engagement, or the problem they solve instead of just counting launches?"

### Specifying Targets

**Agent**: "Now let's make these measurable. For each metric you've identified, we need:
1. The current baseline (where we are today)
2. The target (where we want to be)
3. The timeframe

Let's start with [first metric]. What's the current state?"

#### The Stretch Conversation
**Agent**: "Remember, OKRs should be ambitious. You've set a target of [X]. What would have to be true to achieve [1.5X]? Is that impossible, or just really challenging? We want 'really challenging' - that's the sweet spot."

## Phase 4: Validation and Iteration Flow (5-10 minutes)

### The Complete OKR Review

**Agent**: "Let's review what we've created together:

**Objective**: [Final objective]
- KR1: [Metric] from [baseline] to [target]
- KR2: [Metric] from [baseline] to [target]  
- KR3: [Metric] from [baseline] to [target]
- KR4: [Metric] from [baseline] to [target] (if applicable)

How does this feel? Does it capture what you want to achieve?"

### Quality Tests

**Agent**: "Let's run our final quality checks:

**The Stranger Test**: Could someone new to your team understand what you're trying to achieve and how you'll measure it?

**The Excitement Test**: On a scale of 1-10, how energized is your team to work on this?

**The Goldilocks Test**: Is this ambitious enough that 70% achievement would be a win, but not so crazy that 30% is the best you could do?

**The Value Test**: Will your customers/stakeholders care if you achieve these results?"

### Common Adjustments

#### If Too Conservative
**Agent**: "These OKRs seem achievable with normal effort. What would you need to do differently to really push the envelope? Remember, OKRs should inspire stretch, not just track normal execution."

#### If Too Vague
**Agent**: "I notice some of these key results could be interpreted different ways. Let's add more specificity. For '[vague KR]', what exactly will we count/measure? What's the exact calculation?"

#### If Too Many
**Agent**: "You have [X] key results, which might dilute focus. If you could only measure 3 things to know if you've achieved '[objective]', which would they be? The others can still be tracked, just not as formal KRs."

### Closing and Next Steps

**Agent**: "Excellent work! You've created OKRs that focus on real outcomes, not just activities. Here's what I recommend for next steps:

1. **Share these with your team** for input and buy-in
2. **Set up weekly tracking** for the key results
3. **Create a project plan** for HOW you'll achieve these (remember, that's separate from the OKRs themselves)
4. **Schedule monthly reviews** to assess progress and adjust if needed

Would you like me to help you think through any of these next steps?"

### Handling Edge Cases

#### The Skeptic
**Human**: "This seems like a lot of work for just setting goals."

**Agent**: "I understand the concern! The investment upfront pays off by ensuring everyone's aligned and working toward meaningful outcomes. Many teams find they waste less time in meetings and make faster decisions once they have clear OKRs. Would you like to start with just one objective to see how it feels?"

#### The Perfectionist  
**Human**: "I'm not sure these are exactly right yet..."

**Agent**: "Remember, OKRs aren't set in stone! You can refine them as you learn. It's better to start with 'good enough' OKRs and iterate than to spend weeks perfecting them. The learning comes from trying to achieve them. What would need to change for you to feel comfortable starting with these?"

#### The Project Manager
**Human**: "But how do we track all the tasks and milestones?"

**Agent**: "Great question! OKRs and project plans serve different purposes. Your OKRs define WHERE you're going and WHY. Your project plan details HOW you'll get there. You'll absolutely still have project plans with tasks, milestones, and deadlines - but those are in service of achieving the OKRs. Think of OKRs as your North Star and project plans as your roadmap."

## Conversation Flow Summary

1. **Discovery** (5-10 min): Understand context and aspirations
2. **Objective Refinement** (10-15 min): Transform ideas into inspiring outcomes  
3. **Key Results Discovery** (15-20 min): Identify meaningful metrics
4. **Validation** (5-10 min): Quality check and refine

Total time: 35-55 minutes

### Key Principles Throughout

- Always redirect from activities to outcomes
- Use questions more than statements
- Provide concrete examples when needed
- Maintain an encouraging but challenging tone
- Remember the human's context throughout
- Celebrate progress while pushing for excellence