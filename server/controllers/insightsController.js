const Habit = require('../models/Habit');
const Completion = require('../models/Completion');
const HabitInsight = require('../models/HabitInsight');
const User = require('../models/User');
const { calculateHabitRisk } = require('../utils/insightCalculator');
const { getToday, getWeekStart, subtractDays, addDays, getDateRange, getDayOfWeek, formatDate } = require('../utils/dateHelpers');
const { isEncryptionConfigured, decryptApiKey } = require('../utils/crypto');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Call Gemini API with automatic retry and JSON parsing.
 */
async function callGeminiForInsight(prompt, habitId, habitName, apiKey) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');

  if (!apiKey || apiKey.trim().length === 0) {
    const err = new Error('No Gemini API key provided');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const CANDIDATE_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
  ];

  let lastErr = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[AI Coach] Calling Gemini (${modelName}) for habit "${habitName}" (${habitId})...`);
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        },
        { timeout: 8000 }
      );

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`[AI Coach] Gemini response received for "${habitName}":`, text);

      let cleanedText = text.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      const data = JSON.parse(cleanedText);

      if (!data.riskSummary || !data.suggestion) {
        throw new Error('Gemini response missing riskSummary or suggestion fields');
      }

      let suggestedChange = null;
      if (data.suggestedChange && data.suggestedChange.field && data.suggestedChange.newValue !== undefined) {
        suggestedChange = {
          field: String(data.suggestedChange.field),
          newValue: data.suggestedChange.newValue,
        };
      }

      return {
        habitId,
        habitName,
        riskSummary: String(data.riskSummary).trim(),
        suggestion: String(data.suggestion).trim(),
        suggestedChange,
      };
    } catch (err) {
      lastErr = err;
      // Detect invalid API key errors from Gemini (HTTP 400/401/403)
      const status = err?.status || err?.response?.status || err?.httpStatusCode;
      if (status === 400 || status === 401 || status === 403 || /api.key/i.test(err.message)) {
        const keyErr = new Error('Invalid or rejected Gemini API key');
        keyErr.code = 'INVALID_KEY';
        throw keyErr;
      }
      console.warn(`[AI Coach] Gemini model ${modelName} returned error for "${habitName}":`, err.message);
    }
  }

  console.error(`[AI Coach] All candidate models failed for "${habitName}":`, lastErr?.message);
  throw lastErr;
}

/**
 * Helper to generate prompt for an at-risk habit without any personal user info.
 */
function buildPrompt(habit, riskData) {
  const p = riskData.pattern28;
  const w1 = p.slice(21, 28).map((d) => (d.completed ? '✓' : '✗')).join(' ');
  const w2 = p.slice(14, 21).map((d) => (d.completed ? '✓' : '✗')).join(' ');
  const w3 = p.slice(7, 14).map((d) => (d.completed ? '✓' : '✗')).join(' ');
  const w4 = p.slice(0, 7).map((d) => (d.completed ? '✓' : '✗')).join(' ');

  if (riskData.isSingleMiss) {
    return `You are an encouraging, expert habit coach for WeekTrack. The user has been doing relatively well with their habit "${habit.name}", but recently missed JUST A SINGLE DAY.

HABIT DETAILS:
- Habit Name: "${habit.name}"
- Category: "${habit.category || 'General'}"
- Current Schedule: ${riskData.frequencyDesc}
- Performance: Completed ${riskData.thisWeekCompleted} of ${riskData.targetCount} days this week (${riskData.thisWeekRate}%).

4-Week Daily Completion Pattern (✓ = done, ✗ = missed, Mon-Sun):
- Current week:  ${w1}
- 1 week ago:    ${w2}
- 2 weeks ago:   ${w3}
- 3 weeks ago:   ${w4}

COACHING OBJECTIVE (GENTLE MOMENTUM NUDGE):
- The user is NOT failing and does NOT need their schedule reduced. They missed just ONE day.
- Acknowledge their recent consistency positively.
- Educate them on the power of compounding gains: Explain that skipping even a single day can interrupt habit momentum and reduce progress (the "never miss twice" principle).
- Motivate them to bounce back today so a single slip doesn't become a broken streak.
- DO NOT suggest decreasing their frequency or lowering targets. Set "suggestedChange": null.

INSTRUCTIONS:
Respond with ONLY a strict JSON object with these exact keys:
{
  "habitId": "${habit._id}",
  "riskSummary": "one positive sentence acknowledging their strong consistency while noting the single missed day (e.g., 'You have great momentum with 4 sessions this week, but missed yesterday's workout.')",
  "suggestion": "one inspiring sentence explaining that skipping even one day chips away at compounding gains and encouraging them to get right back on track today (e.g., 'Consistency compounds: skipping just one day can stall your momentum and reduce your hard-earned gains. Recommit today—never miss twice!')",
  "suggestedChange": null
}
`;
  }

  return `You are an encouraging, expert habit coach for WeekTrack. Analyze this declining habit and provide a supportive, concrete, actionable suggestion to get back on track.

HABIT DETAILS:
- Habit Name: "${habit.name}"
- Category: "${habit.category || 'General'}"
- Current Schedule: ${riskData.frequencyDesc}
- Current Pomodoros Required per session: ${habit.pomodorosRequired || 1}

COMPLETION PERFORMANCE:
- Last 7 days completion rate: ${riskData.thisWeekRate}% (${riskData.thisWeekCompleted} completed out of ${riskData.targetCount} target days)
- Previous 7 days completion rate: ${riskData.prevWeekRate}% (${riskData.prevWeekCompleted} completed out of ${riskData.targetCount} target days)
- Week-over-week drop: ${riskData.drop} percentage points
- 4-Week Daily Completion Pattern (✓ = done, ✗ = missed, Mon-Sun):
  * Current week:  ${w1}
  * 1 week ago:    ${w2}
  * 2 weeks ago:   ${w3}
  * 3 weeks ago:   ${w4}

INSTRUCTIONS:
Respond with ONLY a strict JSON object with these exact keys:
{
  "habitId": "${habit._id}",
  "riskSummary": "one short, supportive sentence describing the decline noticed (e.g., 'Completed only 2 of 7 days this week after a strong 6-day streak last week.')",
  "suggestion": "one short, concrete, empathetic fix (e.g., 'Lower your target to 4 days a week for the next two weeks to rebuild momentum without burnout.')",
  "suggestedChange": {
    "field": "frequency",
    "newValue": { "type": "x_per_week", "timesPerWeek": 4 }
  }
}

RULES FOR suggestedChange:
- It must represent a valid editable property on the habit:
  * To reduce frequency count: { "field": "frequency", "newValue": { "type": "x_per_week", "timesPerWeek": <integer 1-6> } }
  * To focus on weekdays only: { "field": "frequency", "newValue": { "type": "specific_days", "days": [0, 1, 2, 3, 4] } }
  * To reduce Pomodoros required: { "field": "pomodorosRequired", "newValue": <integer 1-5> }
- If no programmatic setting change is appropriate, set "suggestedChange": null.
`;
}

/**
 * Compute real current and longest streaks from actual completion records.
 */
function computeRealStreaks(habit, completions) {
  const completedDates = new Set(completions.map((c) => c.date));
  const freezeDates = new Set(completions.filter((c) => c.isFreezeDay).map((c) => c.date));
  const today = getToday();
  const yesterday = subtractDays(today, 1);

  if (completedDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const isRequiredDay = (dateStr) => {
    if (habit.frequency?.type === 'specific_days' && Array.isArray(habit.frequency.days) && habit.frequency.days.length > 0) {
      const dayOfWeek = getDayOfWeek(dateStr);
      return habit.frequency.days.includes(dayOfWeek);
    }
    return true;
  };

  // Determine streak start
  let startDay = null;
  if (completedDates.has(today)) {
    startDay = today;
  } else if (completedDates.has(yesterday)) {
    startDay = yesterday;
  } else {
    // Check if previous days were non-required
    let candidate = yesterday;
    for (let i = 0; i < 7; i++) {
      if (!isRequiredDay(candidate)) {
        candidate = subtractDays(candidate, 1);
        if (completedDates.has(candidate)) {
          startDay = candidate;
          break;
        }
      } else {
        break;
      }
    }
  }

  let currentStreak = 0;
  if (startDay) {
    let curr = startDay;
    while (true) {
      if (completedDates.has(curr) || freezeDates.has(curr)) {
        currentStreak++;
        curr = subtractDays(curr, 1);
      } else if (!isRequiredDay(curr)) {
        curr = subtractDays(curr, 1);
      } else {
        break;
      }
    }
  }

  // If today is completed, streak must be at least 1
  if (completedDates.has(today) && currentStreak === 0) {
    currentStreak = 1;
  }

  // Longest streak across all dates
  const sortedDates = Array.from(completedDates).sort();
  let longestStreak = 0;
  let running = 0;
  let prev = null;

  for (const d of sortedDates) {
    if (!prev) {
      running = 1;
    } else {
      const diff = Math.round((new Date(d + 'T00:00:00') - new Date(prev + 'T00:00:00')) / 86400000);
      if (diff === 1) {
        running++;
      } else {
        let allSkippedNonRequired = true;
        for (let s = 1; s < diff; s++) {
          if (isRequiredDay(addDays(prev, s))) {
            allSkippedNonRequired = false;
            break;
          }
        }
        running = allSkippedNonRequired ? running + 1 : 1;
      }
    }
    longestStreak = Math.max(longestStreak, running);
    prev = d;
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  return { currentStreak, longestStreak };
}

/**
 * GET /api/insights
 * Fetches habit insights for the authenticated user.
 * Uses 24-hour cache unless expired or forceFresh requested.
 */
exports.getInsights = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const forceFresh = req.forceFresh || req.query?.force === 'true';

    // Fetch the user's encrypted Gemini API key and decrypt in-memory
    let userApiKey = null;
    if (isEncryptionConfigured()) {
      const userWithKey = await User.findById(userId).select('+geminiApiKeyEncrypted');
      if (userWithKey?.geminiApiKeyEncrypted) {
        try {
          userApiKey = decryptApiKey(userWithKey.geminiApiKeyEncrypted);
        } catch (decryptErr) {
          console.error('[Security] Failed to decrypt user Gemini API key');
          return res.json({
            available: false,
            status: 'error',
            message: 'AI insights are temporarily unavailable. Please try again later.',
            insights: [],
          });
        }
      }
    }

    if (!userApiKey) {
      return res.json({
        available: false,
        status: 'no_api_key',
        message: 'Add your Gemini API key in Settings to unlock AI-powered coaching.',
        insights: [],
      });
    }

    const habits = await Habit.find({ userId, isArchived: false }).lean();
    if (!habits || habits.length === 0) {
      return res.json({
        available: true,
        insights: [],
        lastAnalyzed: new Date(),
      });
    }

    const now = Date.now();
    const results = [];
    let atRiskCount = 0;
    let lastGeminiError = null;

    for (const habit of habits) {
      // 1. ALWAYS calculate real-time habit risk first based on actual completions
      const riskData = await calculateHabitRisk(habit, userId);
      const cached = await HabitInsight.findOne({ userId, habitId: habit._id });

      if (!riskData.isAtRisk) {
        // Habit is currently healthy and not at risk! Clear any stale at-risk flag
        if (cached && (cached.isAtRisk || !cached.dismissed)) {
          cached.isAtRisk = false;
          cached.analyzedAt = new Date();
          await cached.save();
        }
        continue;
      }

      // Habit IS at risk -> check if we have a recent (within 24h) cached AI suggestion of matching riskType
      atRiskCount++;

      if (
        !forceFresh &&
        cached &&
        cached.isAtRisk &&
        !cached.dismissed &&
        cached.riskType === riskData.riskType &&
        cached.completionsCount === riskData.thisWeekCompleted
      ) {
        const ageMs = now - new Date(cached.analyzedAt).getTime();
        if (ageMs < CACHE_TTL_MS) {
          console.log(`[AI Coach] Using cached insight for at-risk habit "${habit.name}" (${habit._id}) [type: ${cached.riskType}, completed: ${cached.completionsCount}]`);
          results.push({
            id: cached._id,
            habitId: habit._id,
            habitName: habit.name,
            habitColor: habit.color,
            category: habit.category,
            currentFrequency: habit.frequency,
            riskSummary: cached.riskSummary,
            suggestion: cached.suggestion,
            suggestedChange: cached.suggestedChange,
            riskType: cached.riskType || riskData.riskType || 'attention',
            analyzedAt: cached.analyzedAt,
            dismissed: cached.dismissed,
          });
          continue;
        }
      }

      // Fresh Gemini evaluation needed
      try {
        const prompt = buildPrompt(habit, riskData);
        const aiResponse = await callGeminiForInsight(prompt, habit._id, habit.name, userApiKey);

        // Update or insert into HabitInsight cache
        const saved = await HabitInsight.findOneAndUpdate(
          { userId, habitId: habit._id },
          {
            userId,
            habitId: habit._id,
            riskSummary: aiResponse.riskSummary,
            suggestion: aiResponse.suggestion,
            suggestedChange: aiResponse.suggestedChange,
            isAtRisk: true,
            riskType: riskData.riskType,
            completionsCount: riskData.thisWeekCompleted,
            analyzedAt: new Date(),
            dismissed: false,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        results.push({
          id: saved._id,
          habitId: habit._id,
          habitName: habit.name,
          habitColor: habit.color,
          category: habit.category,
          currentFrequency: habit.frequency,
          riskSummary: saved.riskSummary,
          suggestion: saved.suggestion,
          suggestedChange: saved.suggestedChange,
          riskType: saved.riskType || riskData.riskType || 'attention',
          analyzedAt: saved.analyzedAt,
          dismissed: saved.dismissed,
        });
      } catch (geminiErr) {
        // If the key is invalid, stop immediately — no point trying more habits
        if (geminiErr.code === 'INVALID_KEY') {
          console.error('[AI Coach] User\'s Gemini API key was rejected.');
          return res.json({
            available: false,
            status: 'invalid_key',
            message: 'Your Gemini API key seems invalid — please check it in Settings.',
            insights: [],
          });
        }

        lastGeminiError = geminiErr.message;
        console.error(`[AI Coach] Failed to generate insight for habit "${habit.name}":`, geminiErr.message);
        // Fallback to cached if available
        if (cached && cached.isAtRisk && !cached.dismissed) {
          results.push({
            id: cached._id,
            habitId: habit._id,
            habitName: habit.name,
            habitColor: habit.color,
            category: habit.category,
            currentFrequency: habit.frequency,
            riskSummary: cached.riskSummary,
            suggestion: cached.suggestion,
            suggestedChange: cached.suggestedChange,
            analyzedAt: cached.analyzedAt,
            dismissed: cached.dismissed,
          });
        }
      }
    }

    // If at least one habit was at risk and every Gemini call failed, report error
    if (results.length === 0 && atRiskCount > 0 && lastGeminiError) {
      console.error('[AI Coach] All Gemini calls failed for at-risk habits:', lastGeminiError);
      return res.json({
        available: false,
        status: 'error',
        message: 'AI insights are temporarily unavailable. Please try again later.',
        insights: [],
      });
    }

    return res.json({
      available: true,
      insights: results,
      lastAnalyzed: new Date(),
    });
  } catch (error) {
    console.error('[AI Coach] getInsights error:', error);
    return res.json({
      available: false,
      status: 'error',
      message: 'AI insights are temporarily unavailable. Please try again later.',
      insights: [],
    });
  }
};

/**
 * POST /api/insights/refresh
 * Forces fresh analysis by clearing the 24-hour cache for the user.
 */
exports.refreshInsights = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    console.log(`[AI Coach] Refresh requested for user ${userId}. Deleting cache and forcing fresh Gemini evaluation...`);

    // Reset all cached insights for this user
    await HabitInsight.deleteMany({ userId });

    req.forceFresh = true;
    return exports.getInsights(req, res, next);
  } catch (error) {
    console.error('[AI Coach] refreshInsights error:', error);
    return res.status(500).json({ message: 'Failed to refresh insights', error: error.message });
  }
};

/**
 * PATCH /api/insights/:habitId/dismiss
 * Dismisses an insight for a habit.
 */
exports.dismissInsight = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { habitId } = req.params;

    const updated = await HabitInsight.findOneAndUpdate(
      { userId, habitId },
      { dismissed: true },
      { new: true }
    );

    return res.json({ success: true, insight: updated });
  } catch (error) {
    console.error('[AI Coach] dismissInsight error:', error);
    return res.status(500).json({ message: 'Failed to dismiss insight' });
  }
};

// In-memory cache for computationally expensive non-AI insight metrics (Sections 2-6)
// Scoped strictly per-user, 1-hour TTL, invalidated when user updates habits or completions
const metricsCache = new Map();
const METRICS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Invalidate cached insight metrics for a specific user.
 * Called on completion toggles, freeze applications, or habit modifications.
 */
function invalidateMetricsCache(userId) {
  if (userId) {
    metricsCache.delete(String(userId));
  }
}
exports.invalidateMetricsCache = invalidateMetricsCache;

/**
 * GET /api/insights/metrics
 * Pure computation metrics for Sections 2-6 of the Insights Page.
 * Uses exact same calendar week boundaries and completions as Week view and History view.
 */
exports.getInsightsMetrics = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const cacheKey = String(userId);
    const forceFresh = req.query?.force === 'true';

    // Check user-scoped metrics cache (1 hour TTL) unless forceFresh requested
    if (!forceFresh && metricsCache.has(cacheKey)) {
      const cached = metricsCache.get(cacheKey);
      if (Date.now() < cached.expiresAt) {
        return res.json(cached.data);
      }
      metricsCache.delete(cacheKey);
    }

    const today = getToday();

    // 1. Fetch active habits for this user
    const habits = await Habit.find({ userId, isArchived: false }).lean();
    if (!habits || habits.length === 0) {
      const emptyPayload = {
        hasData: false,
        weekComparison: { habits: [], overall: { thisWeekRate: 0, lastWeekRate: 0, diff: 0, trend: 'neutral' } },
        performers: { best: null, worst: null },
        timeOfDay: { buckets: [], bestBucket: null },
        streaks: [],
        consistency: { activeDaysLast30: 0, totalDays: 30, percentage: 0, headline: "You've completed at least one habit on 0 of the last 30 days" },
      };
      metricsCache.set(cacheKey, {
        data: emptyPayload,
        expiresAt: Date.now() + METRICS_CACHE_TTL,
      });
      return res.json(emptyPayload);
    }

    const activeHabitIds = new Set(habits.map((h) => String(h._id)));

    // Fetch completions strictly belonging to the logged-in user and active habits
    const allCompletions = await Completion.find({
      userId,
      habitId: { $in: Array.from(activeHabitIds) },
    }).lean();

    // Map completions by habit
    const habitCompletionsMap = new Map();
    for (const h of habits) {
      habitCompletionsMap.set(String(h._id), []);
    }
    for (const c of allCompletions) {
      const hid = String(c.habitId);
      if (habitCompletionsMap.has(hid)) {
        habitCompletionsMap.get(hid).push(c);
      }
    }

    // ─── Section 2: This Week vs Last Week ─────────────────────────
    // Use ISO Monday-Sunday calendar weeks matching WeekGrid
    const weekStart = getWeekStart(today);
    const weekEnd = addDays(weekStart, 6);
    const lastWeekStart = subtractDays(weekStart, 7);
    const lastWeekEnd = subtractDays(weekStart, 1);

    const habitComparisons = habits.map((habit) => {
      const hCompletions = habitCompletionsMap.get(String(habit._id)) || [];

      let targetCount = 7;
      if (habit.frequency?.type === 'x_per_week') {
        targetCount = habit.frequency.timesPerWeek || 7;
      } else if (habit.frequency?.type === 'specific_days') {
        targetCount = (habit.frequency.days && habit.frequency.days.length) || 7;
      }

      // Completions within the current week (from Monday to Sunday, or up to today)
      const thisWeekCompleted = hCompletions.filter((c) => c.date >= weekStart && c.date <= weekEnd).length;
      // Completions within previous week (Monday to Sunday)
      const prevWeekCompleted = hCompletions.filter((c) => c.date >= lastWeekStart && c.date <= lastWeekEnd).length;

      const thisWeekRate = Math.min(100, Math.round((thisWeekCompleted / targetCount) * 100));
      const lastWeekRate = Math.min(100, Math.round((prevWeekCompleted / targetCount) * 100));
      const diff = thisWeekRate - lastWeekRate;
      const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';

      return {
        habitId: habit._id,
        name: habit.name,
        color: habit.color,
        category: habit.category || 'General',
        thisWeekCompleted,
        prevWeekCompleted,
        targetCount,
        thisWeekRate,
        lastWeekRate,
        diff,
        trend,
      };
    });

    const sumThisWeek = habitComparisons.reduce((acc, h) => acc + h.thisWeekRate, 0);
    const sumLastWeek = habitComparisons.reduce((acc, h) => acc + h.lastWeekRate, 0);
    const avgThisWeek = habits.length > 0 ? Math.round(sumThisWeek / habits.length) : 0;
    const avgLastWeek = habits.length > 0 ? Math.round(sumLastWeek / habits.length) : 0;
    const overallDiff = avgThisWeek - avgLastWeek;
    const overallTrend = overallDiff > 0 ? 'up' : overallDiff < 0 ? 'down' : 'neutral';

    // ─── Section 3: Best & Worst Performers ────────────────────────
    // Computes all-time completion rate based on habit tracking span
    const habitPerformances = habits.map((habit) => {
      const hCompletions = habitCompletionsMap.get(String(habit._id)) || [];

      // Find tracking start date: habit createdAt or earliest completion
      const dates = [formatDate(habit.createdAt), ...hCompletions.map((c) => c.date)].filter(Boolean).sort();
      const firstDate = dates[0] || today;
      const elapsedDays = Math.max(1, getDateRange(firstDate, today).length);

      let targetExpected = elapsedDays;
      if (habit.frequency?.type === 'x_per_week') {
        targetExpected = Math.max(1, Math.round(elapsedDays * ((habit.frequency.timesPerWeek || 7) / 7)));
      } else if (habit.frequency?.type === 'specific_days') {
        const days = habit.frequency.days || [0, 1, 2, 3, 4, 5, 6];
        const daysCount = days.length || 7;
        targetExpected = Math.max(1, Math.round(elapsedDays * (daysCount / 7)));
      }

      const allTimeRate = Math.min(100, Math.round((hCompletions.length / targetExpected) * 100));

      return {
        habitId: habit._id,
        name: habit.name,
        color: habit.color,
        category: habit.category || 'General',
        totalCompletions: hCompletions.length,
        allTimeRate,
      };
    });

    // Sort by allTimeRate descending, then totalCompletions descending
    const sortedPerformers = [...habitPerformances].sort((a, b) => {
      if (b.allTimeRate !== a.allTimeRate) return b.allTimeRate - a.allTimeRate;
      return b.totalCompletions - a.totalCompletions;
    });

    const bestPerformer = sortedPerformers[0] || null;
    const worstPerformer = sortedPerformers.length > 1
      ? sortedPerformers[sortedPerformers.length - 1]
      : sortedPerformers[0] || null;

    // ─── Section 4: Best Time of Day ──────────────────────────────
    // Strictly computed from genuine same-day check-ins:
    // Only count completions where the record write timestamp (createdAt) matches
    // the tracked calendar date (date). Excludes backdated or edited completions
    // for past/future dates where true time of day cannot be determined.
    let morningCount = 0;
    let afternoonCount = 0;
    let eveningCount = 0;
    let eligibleCount = 0;

    for (const c of allCompletions) {
      if (!c.createdAt || c.isFreezeDay) continue;

      // Ensure this was checked in on the exact same calendar day it was intended for
      const createdDate = formatDate(c.createdAt);
      const isSameDayCheckin = createdDate === c.date;

      // Also ensure it was not modified on a different calendar day
      const isUnmodifiedOrSameDay = !c.updatedAt || formatDate(c.updatedAt) === c.date;

      if (isSameDayCheckin && isUnmodifiedOrSameDay) {
        eligibleCount++;
        const hour = new Date(c.createdAt).getHours();
        if (hour >= 5 && hour < 12) {
          morningCount++;
        } else if (hour >= 12 && hour < 17) {
          afternoonCount++;
        } else {
          eveningCount++;
        }
      }
    }

    const morningPct = eligibleCount > 0 ? Math.round((morningCount / eligibleCount) * 100) : 0;
    const afternoonPct = eligibleCount > 0 ? Math.round((afternoonCount / eligibleCount) * 100) : 0;
    const eveningPct = eligibleCount > 0 ? Math.round((eveningCount / eligibleCount) * 100) : 0;

    const timeBuckets = [
      { name: 'Morning', timeRange: '5:00 AM – 12:00 PM', count: morningCount, percentage: morningPct },
      { name: 'Afternoon', timeRange: '12:00 PM – 5:00 PM', count: afternoonCount, percentage: afternoonPct },
      { name: 'Evening', timeRange: '5:00 PM – 5:00 AM', count: eveningCount, percentage: eveningPct },
    ];

    const sortedBuckets = [...timeBuckets].sort((a, b) => b.count - a.count);
    const bestBucket = eligibleCount > 0 && sortedBuckets[0]?.count > 0
      ? `${sortedBuckets[0].name}: ${sortedBuckets[0].percentage}% success`
      : 'No same-day completion data yet';

    // ─── Section 5: Streak Leaderboard ────────────────────────────
    // Directly computed from actual completion data — guaranteed accurate!
    const streaksList = habits.map((habit) => {
      const hCompletions = habitCompletionsMap.get(String(habit._id)) || [];
      const computed = computeRealStreaks(habit, hCompletions);

      return {
        habitId: habit._id,
        name: habit.name,
        color: habit.color,
        category: habit.category || 'General',
        currentStreak: computed.currentStreak,
        longestStreak: computed.longestStreak,
      };
    });

    // ─── Section 6: Consistency Summary ───────────────────────────
    const startDate30 = subtractDays(today, 29);
    const activeDatesLast30 = new Set(
      allCompletions
        .filter((c) => c.date >= startDate30 && c.date <= today)
        .map((c) => c.date)
    );
    const activeDaysLast30 = activeDatesLast30.size;
    const consistencyPercentage = Math.round((activeDaysLast30 / 30) * 100);
    const headline = `You've completed at least one habit on ${activeDaysLast30} of the last 30 days`;

    const responsePayload = {
      hasData: true,
      weekComparison: {
        habits: habitComparisons,
        overall: {
          thisWeekRate: avgThisWeek,
          lastWeekRate: avgLastWeek,
          diff: overallDiff,
          trend: overallTrend,
        },
      },
      performers: {
        best: bestPerformer,
        worst: worstPerformer,
      },
      timeOfDay: {
        buckets: timeBuckets,
        bestBucket,
      },
      streaks: streaksList,
      consistency: {
        activeDaysLast30,
        totalDays: 30,
        percentage: consistencyPercentage,
        headline,
      },
    };

    // Cache metrics for 1 hour for this user
    metricsCache.set(cacheKey, {
      data: responsePayload,
      expiresAt: Date.now() + METRICS_CACHE_TTL,
    });

    return res.json(responsePayload);
  } catch (error) {
    console.error('[AI Coach] getInsightsMetrics error:', error);
    return res.status(500).json({ message: 'Failed to compute insight metrics', error: error.message });
  }
};
