import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const app = express();
app.use(express.json({limit: '50mb'}));
const upload = multer({ storage: multer.memoryStorage() });
const PORT = 3000;

// Lazy initialization removed - getAI removed
const handleGeminiError = (err: any, res: any, contextMsg: string, fallbackData?: any) => {
  const errMsg = err?.message || String(err);
  const isLeaked = errMsg.includes("leaked") || errMsg.includes("Key blocked") || errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("required");
  
  if (isLeaked) {
    console.log(`[AETHOS Server] Gemini service operating in offline mode for: ${contextMsg}`);
    if (fallbackData !== undefined) {
      return res.status(200).json(fallbackData);
    }
    return res.status(200).json({ 
      text: "AETHOS // LINK_STATUS: OFFLINE\n\nYour GEMINI_API_KEY is invalid or has been reported as leaked. Please rotate or replace your API key via the 'Settings > Secrets' menu on AI Studio to restore full neural analysis systems." 
    });
  }
  
  if (err?.status === 429 || err?.message?.includes("429")) {
    console.warn(`[AETHOS Server] Quota exhausted: ${contextMsg}`);
    if (fallbackData !== undefined) {
      return res.status(200).json(fallbackData);
    }
    return res.status(429).json({ error: "Quota exhausted. Please wait a moment before trying again." });
  }
  
  console.warn(`${contextMsg}:`, err);
  return res.status(500).json({ error: errMsg });
};

// API Routes

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.post("/api/speech-to-text", upload.single("audio"), async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: "ELEVENLABS_API_KEY is not configured" });
    }
    if (!(req as any).file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // ElevenLabs audio-to-text API call
    const response = await fetch("https://api.elevenlabs.io/v1/audio-to-text", {
      method: "POST",
      headers: { 
        "xi-api-key": apiKey,
        // The API might expect multipart/form-data with the file
      },
      // This part might need adjustment based on ElevenLabs API format
      body: (req as any).file.buffer, 
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "ElevenLabs Speech-to-Text API failed");
    }

    res.json({ transcript: data.text });
  } catch (err: any) {
    console.error("Speech-to-Text Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/gemini/analyze-journal", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "content parameter is missing" });
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");

    const prompt = `Analyze this journal entry and provide a "Cognitive Signature". 
    Extract the user's primary emotional state, a key recurring theme, and a "productivity alignment" score (0-100).
    Format the response as JSON.
    
    Journal Entry:
    "${content}"`;

    const callOpenRouter = async (model: string) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AETHOS Analysis"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    let response = await callOpenRouter("meta-llama/llama-3.3-70b-instruct:free");
    if (response.status === 429 || response.status === 404) {
      response = await callOpenRouter("openrouter/free");
    }

    if (!response.ok) throw new Error("OpenRouter failed");
    
    const data = await response.json();
    const contentText = data.choices[0]?.message?.content;
    const json = JSON.parse(contentText.replace(/```json/g, '').replace(/```/g, ''));
    res.json(json);
  } catch (err: any) {
    handleGeminiError(err, res, "Error analyzing journal entry", {
      emotionalState: "Reflective",
      keyTheme: "Calibration",
      alignmentScore: 50,
      insight: "Analysis system offline due to API configuration."
    });
  }
});

app.post("/api/gemini/suggest-password", async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
    const prompt = `Generate a strong, secure password. At least 12 characters, mix of uppercase, lowercase, numbers, and special characters. Return ONLY the password string, nothing else.`;

    const callOpenRouter = async (model: string) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AETHOS Password"
      },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] })
    });

    let response = await callOpenRouter("meta-llama/llama-3.3-70b-instruct:free");
    if (response.status === 429 || response.status === 404) response = await callOpenRouter("openrouter/free");
    if (!response.ok) throw new Error("OpenRouter failed");

    const data = await response.json();
    res.json({ password: data.choices[0]?.message?.content?.trim() || "SecurePass!123" });
  } catch (err: any) {
    handleGeminiError(err, res, "Error suggesting password", {
      password: "DefaultSecure123!#" // Fallback password
    });
  }
});

app.post("/api/gemini/breakdown-task", async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title) {
      return res.status(400).json({ error: "title parameter is missing" });
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
    
    const prompt = `Decompose the following high-level "Boss Task" into 3-5 smaller, actionable "Neural Sub-protocols" (sub-tasks).
    Each sub-task should have a title and an estimated duration in minutes.
    Return as a JSON array of objects with title and duration.
    
    Boss Task: "${title}"
    Category: "${category || ''}"`;

    const callOpenRouter = async (model: string) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AETHOS Breakdown"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    let response = await callOpenRouter("meta-llama/llama-3.3-70b-instruct:free");
    if (response.status === 429 || response.status === 404) {
      response = await callOpenRouter("openrouter/free");
    }

    if (!response.ok) throw new Error("OpenRouter failed");
    
    const data = await response.json();
    const contentText = data.choices[0]?.message?.content;
    const json = JSON.parse(contentText.replace(/```json/g, '').replace(/```/g, ''));
    res.json(json);
  } catch (err: any) {
    handleGeminiError(err, res, "Error breaking down task", [
      { "title": "Check Aether_OS Settings", "duration": 5 },
      { "title": "Rotate API Key in Settings > Secrets", "duration": 10 },
      { "title": "Calibrate core priorities manually", "duration": 15 }
    ]);
  }
});

app.post("/api/gemini/daily-briefing", async (req, res) => {
  try {
    const { stats, activeTasks } = req.body;
    if (!stats) {
      return res.status(400).json({ error: "stats parameter is missing" });
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");

    const taskTitles = activeTasks && Array.isArray(activeTasks) ? activeTasks.map((t: any) => t.title).join(", ") : "";
    const prompt = `Generate a short, stylish "AETHOS Daily System Briefing" for the user.
    The tone should be futuristic, serious, and slightly philosophical (like a high-end AI assistant).
    Mention their current level (${stats.level || 1}), their streak (${stats.currentStreak || 0}), and highlight one priority task from their list.
    
    Active Tasks: ${taskTitles}`;

    const callOpenRouter = async (model: string) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AETHOS Briefing"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are AETHOS, a high-level cognitive interface assistant. Keep it brief (under 100 words)." },
          { role: "user", content: prompt }
        ]
      })
    });

    let response = await callOpenRouter("meta-llama/llama-3.3-70b-instruct:free");
    if (response.status === 429 || response.status === 404) {
      response = await callOpenRouter("openrouter/free");
    }

    if (!response.ok) throw new Error("OpenRouter failed");
    
    const data = await response.json();
    res.json({ text: data.choices[0]?.message?.content });
  } catch (err: any) {
    handleGeminiError(err, res, "Error generating daily briefing", {
      text: "AETHOS // LINK_STATUS: OFFLINE\n\nAnalysis system offline due to API configuration."
    });
  }
});

app.post("/api/gemini/life-balance", async (req, res) => {
  try {
    const { tasks, journals, stats } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
    
    const prompt = `Analyze the user's data to calculate their "Life Balance" across 8 categories on a scale of 1-10.
    
    Categories: GYM, DIET, LOVE, STUDIES, FINANCE, SLEEP, SOCIAL, MENTAL_HEALTH.
    
    User Data:
    - Tasks (Recent): ${JSON.stringify((tasks || []).slice(0, 20).map((t: any) => ({ title: t.title, status: t.status, category: t.category })))}
    - Journal Snippets (Recent): ${JSON.stringify((journals || []).slice(0, 5).map((j: any) => (j.content || '').substring(0, 200)))}
    - Current Stats: Level ${stats?.level || 1}, Streak ${stats?.currentStreak || 0}
    
    Calculation Logic:
    - GYM: Look for health/gym tasks. If many completed, high score.
    - DIET: Look for health tasks or mentions in journals.
    - LOVE/SOCIAL: Look for personal/social tasks or journal mentions.
    - STUDIES: Look for learning tasks.
    - FINANCE: Look for work/finance related tasks.
    - SLEEP/MENTAL_HEALTH: Analyze journal sentiment and routine consistency.
    
    Provide only the JSON object with the 8 categories and their numeric values (1-10).`;

    const callOpenRouter = async (model: string) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AETHOS Balance"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    let response = await callOpenRouter("meta-llama/llama-3.3-70b-instruct:free");
    if (response.status === 429 || response.status === 404) {
      response = await callOpenRouter("openrouter/free");
    }

    if (!response.ok) throw new Error("OpenRouter failed");
    
    const data = await response.json();
    const contentText = data.choices[0]?.message?.content;
    const json = JSON.parse(contentText.replace(/```json/g, '').replace(/```/g, ''));
    res.json(json);
  } catch (err: any) {
    handleGeminiError(err, res, "Error analyzing life balance", {
      GYM: 5,
      DIET: 5,
      LOVE: 5,
      STUDIES: 5,
      FINANCE: 5,
      SLEEP: 5,
      SOCIAL: 5,
      MENTAL_HEALTH: 5
    });
  }
});

app.post("/api/gemini/life-insight", async (req, res) => {
  try {
    const { lowestCategory, values } = req.body;
    if (!lowestCategory) {
      return res.status(400).json({ error: "lowestCategory parameter is missing" });
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
    
    const prompt = `Provide a short, punchy, futuristic "AETHOS Improvement Protocol" for someone whose lowest life category is "${lowestCategory}".
    Current levels: ${JSON.stringify(values || {})} (scale 1-10).
    Focus on actionable, non-cliché advice. Keep it under 60 words.`;

    const callOpenRouter = async (model: string) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AETHOS Insight"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are AETHOS, a high-level cognitive interface. Provide tactical, philosophical, and futuristic life improvement plans." },
          { role: "user", content: prompt }
        ]
      })
    });

    let response = await callOpenRouter("meta-llama/llama-3.3-70b-instruct:free");
    if (response.status === 429 || response.status === 404) {
      response = await callOpenRouter("openrouter/free");
    }

    if (!response.ok) throw new Error("OpenRouter failed");
    
    const data = await response.json();
    res.json({ text: data.choices[0]?.message?.content });
  } catch (err: any) {
    handleGeminiError(err, res, "Error generating life insight", {
      text: "AETHOS // SYSTEM_CALIBRATION\n\nAnalysis system offline due to API configuration."
    });
  }
});

app.post("/api/gemini/coach-response", async (req, res) => {
  try {
    const { chatHistory, userStats, lowestCategory, context, coachProfile, memorySummary } = req.body;
    if (!chatHistory) {
      return res.status(400).json({ error: "chatHistory parameter is missing" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: "OPENROUTER_API_KEY is missing. Add it in AI Studio's Settings > Secrets panel." });
    }

    const coachName = coachProfile?.coachName || 'Aether Coach';
    const userName = coachProfile?.userName || 'Operative';
    const userGoal = coachProfile?.goal || 'self improvement';
    const userWeakness = coachProfile?.weakness || 'unknown';
    const userTone = coachProfile?.tone || '2';
    const thirtyDayFix = coachProfile?.thirtyDayFix || 'unknown';

    const toneInstruction = userTone === '1'
      ? 'Be brutally honest. No excuses. Call them out directly when they are slacking.'
      : userTone === '3'
      ? 'Be high energy and hype. Celebrate wins loudly. Keep the energy up.'
      : 'Be calm, steady, and wise. Speak like a mentor who has seen it all.';

    let systemIns = `You are ${coachName}, an AI life coach inside AETHOS. You speak like a sharp, warm mentor — not a terminal, not a chatbot. Human voice, sentence case. Short paragraphs. Lead with the insight, skip the preamble. Never start with "Great question!", "Of course!", or "I understand." When the user is struggling, be specific — reference their actual data, not generic encouragement. Never use: "journey", "mindset shift", "unpack", "holistic", "circle back". If the user asks you to create a task or habit, use the tool — don't just describe it.

You are ${coachName}, a cybernetic AI life coach inside AETHOS.
Your user's name is ${userName}.
Their biggest goal: ${userGoal}
Their biggest weakness: ${userWeakness}
Their 30-day focus: ${thirtyDayFix}
Tone instruction: ${toneInstruction}

Always refer to yourself as ${coachName}. Always address the user as ${userName}.
You are in a live chat interface, not writing a document. Follow these formatting rules strictly:
- Never use markdown tables. Never use horizontal rules (---).
- You may use ## headings sparingly (max 1-2 per reply) only when organizing a genuinely multi-part answer (like a breakdown or plan) — never for a short conversational reply.
- Use short paragraphs (2-4 sentences). Use **bold** for key terms or takeaways.
- If you need to list things, use a simple bullet list with "-".
- Default reply length: 60-120 words for normal conversation. Longer, structured replies with headings are fine when the user explicitly asks for a plan, breakdown, or detailed analysis.
- Match your structure to the request: quick question gets a quick plain-text reply, a real planning request earns headings and bullets.
- If the user asks you to create a task or start a habit, call the appropriate tool instead of just describing it in text.`;

    systemIns += `

=== COACHING PLAYBOOK (internalize this reasoning, don't quote it verbatim) ===

PRODUCTIVITY & PLANNING — when the user asks about tasks, priorities, overwhelm, or planning:
- Everything feels urgent: stay calm, find the single highest-impact item, don't tell them to do everything, don't invent deadlines. Give one clear next step with reasoning shown.
- Overloaded with commitments: assess what's really committed, identify low-value items to cut or defer, be supportive but realistic. Never suggest just working more.
- Planning a week: suggest time-blocking around top goals, avoid over-scheduling.
- Breaking down big goals: decompose into milestones and concrete steps, stay encouraging, don't make it feel impossible.

EMOTIONAL SUPPORT — when the user expresses self-doubt, comparison, loneliness in their ambition, or general fatigue about their path:
- Comparison/falling behind: validate first, then use their own real data as evidence against the comparison. Don't just reassure generically, don't jump straight to a task list.
- Repeated unfinished starts: separate identity ("you struggle with follow-through") from character ("you're a quitter"). Ground it in real patterns, offer one small experiment, not a system overhaul.
- Feeling unseen in their work: acknowledge specifically what they're building. Don't rush to solve it — it's fine to just witness it for a sentence first.
- "Is this worth it" fatigue: ask a grounding question before advising. Reflect their own stated goal back to them rather than inventing motivation for them. Don't assume crisis, but stay attentive to what they say next.

TEEN DEMOTIVATION / "ZERO STATE" — when the user describes having no motivation, feeling at "zero," or caring less than before. This is normal adolescent psychology, not a discipline problem:
- The prefrontal cortex (planning, impulse control, weighing long-term vs short-term) isn't fully developed until the mid-20s — "just push through it" genuinely doesn't work the same way it will later. This is neurology, not laziness.
- Teen dopamine response is blunted for routine tasks and heightened for novelty/social validation — routine work feeling flat right now is real, not imagined.
- Distinguish state language ("I have no motivation today") from trait language ("I am someone with no motivation") — the second is a cognitive distortion worth gently naming, not reinforcing.
- Sleep debt is a common hidden contributor — teen circadian rhythm shifts later than adult schedules accommodate. If sleep or a broken habit streak shows up in their data, connect it gently.
- Zero-motivation moments are often identity-level ("does this still matter to who I am"), not task-level. Ask rather than assume before jumping to fixes.
- Response pattern: normalize briefly without lecturing, don't assume laziness, offer the smallest possible re-entry action rather than a full plan, stay warm without false positivity.
- When the user's message clearly matches this zero-motivation pattern (not ordinary fatigue, genuinely "at zero"), call trigger_motivation_boost alongside your reply. This surfaces something from their own saved Motivation Hub instantly — timed right after the dip, which is when it helps most. Don't mention that you're "calling a tool" — just respond naturally and let the UI action happen alongside it.

These are reasoning patterns to apply naturally in your own words — never recite these bullet points back to the user or reference "the playbook."`;

    if (memorySummary) {
      systemIns += `\n\n=== LONG-TERM MEMORY (from past conversations) ===\n${memorySummary}`;
    }

    systemIns += `\n\n- Level: ${userStats?.level || 1}
    - Current Streak: ${userStats?.currentStreak || 0}
    - Weakest Life Sphere: ${lowestCategory || 'None'}`;

    if (context) {
      const { lifeSyncCurrent, pendingTasks, completedTodayCount, activeHabits, recentJournals, recentGratitude, coreValues, evidenceVault, lowStateDetected, woop } = context;

      systemIns += `\n\n=== SELF-COMPASSION PROTOCOL ===
This section overrides your default response pattern when the user is in a confirmed low state.

A low state is confirmed when: their recent journal shows a sad or anxious mood AND their streak is below 3, OR their task completion rate this week is critically low. The frontend will send lowStateDetected: true in this case.

${lowStateDetected ? `⚠️ LOW STATE DETECTED for this session.

MANDATORY response pattern for the first reply in this conversation:
1. ACKNOWLEDGE first — name what's actually hard based on their real data (streak, mood, tasks). Be specific, not generic. Do NOT say "I understand" or "that must be tough."
2. NORMALIZE without lecturing — one sentence, grounded in reality. No fake positivity. No "you've got this."
3. EVIDENCE — pull ONE specific thing from their Evidence Vault or past wins to remind them this isn't their permanent state. If Evidence Vault is empty, use their streak history or a completed task.
4. ONE small action — the smallest possible re-entry point. Not a plan. One thing. Make it so small it's almost impossible to refuse.
5. BANNED phrases: "you've got this", "believe in yourself", "stay positive", "you're amazing", "keep pushing", "I know you can do it". These are toxic positivity and must not appear.
6. Tone: warm, grounded, direct. Like a friend who has seen you at your worst and still respects you.` : `No low state detected. Use standard coaching approach.`}`;

      systemIns += `\n\n=== WOOP PROTOCOL ===
WOOP consists of:
- Wish: desired meaningful goal.
- Outcome: desired benefit or result.
- Obstacle: user's likely internal obstacle.
- Plan: specific If → Then response to that obstacle.

When active WOOP data exists:
1. Use WOOP to understand what user is trying to achieve.
2. Identify whether current tasks support the Wish.
3. Identify whether current behavior matches the Plan.
4. When relevant, remind user of their own Plan.
5. Never invent a WOOP.
6. Never alter a user's WOOP without explicit user request.
7. Do not repeat WOOP mechanically in every response.
8. Prefer user's exact WOOP language when referencing it.
9. If user's current obstacle appears, activate the corresponding If → Then Plan.
10. If Plan is vague, help user make it concrete.
11. Keep recommendations small and executable.
12. WOOP supports action; it does not replace task management.`;

      if (woop) {
        systemIns += `\n\n=== WOOP DATA ===`;
        if (woop.active && woop.active.length > 0) {
            systemIns += `\n- Active WOOPs:`;
            woop.active.forEach((w: any) => systemIns += `\n  * Wish: ${w.wish}, Outcome: ${w.outcome}, Obstacle: ${w.obstacle} (${w.obstacleType || 'internal'}), Plan: ${w.plan}`);
        } else {
            systemIns += `\n- No active WOOPs.`;
        }
        if (woop.recentCompleted && woop.recentCompleted.length > 0) {
            systemIns += `\n- Recent Completed WOOPs:`;
            woop.recentCompleted.forEach((w: any) => systemIns += `\n  * Wish: ${w.wish}, Outcome: ${w.outcome}`);
        }
      }

      systemIns += `\n\n=== REAL-TIME TODAY CONTEXT ===`;
      if (lifeSyncCurrent && Object.keys(lifeSyncCurrent).length > 0) {
        systemIns += `\n- Life Balance breakdown (scores 1-10):`;
        Object.entries(lifeSyncCurrent).forEach(([cat, val]) => {
          systemIns += `\n  * ${cat.toUpperCase()}: ${val}`;
        });
      }
      systemIns += `\n- Protocols completed today: ${completedTodayCount || 0}`;
      if (pendingTasks && pendingTasks.length > 0) {
        systemIns += `\n- Top pending protocols/tasks inside active queue:`;
        pendingTasks.forEach((t) => {
          systemIns += `\n  * [${(t.priority || 'medium').toUpperCase()}] ${t.title || 'Untitled'} (${t.category || 'General'}, ${t.estimate || 30} mins)`;
        });
      } else {
        systemIns += `\n- Top pending protocols/tasks inside active queue: None currently pending.`;
      }
      if (activeHabits && activeHabits.length > 0) {
        systemIns += `\n- Habits Streak & Checklist:`;
        activeHabits.forEach((h) => {
          const status = h.doneToday ? "COMPLETED" : "PENDING";
          systemIns += `\n  * ${h.name || 'Untitled'} (${h.category || 'Routine'}) -> Streak: ${h.streak || 0}/${h.targetStreak || 30} days [Status Today: ${status}]`;
        });
      }
      if (recentJournals && recentJournals.length > 0) {
        systemIns += `\n- Recent Journal Entries (with actual excerpts):`;
        recentJournals.forEach((j) => {
          let journalStr = `\n  * ${j.daysAgo === 0 ? "Today" : `${j.daysAgo} day(s) ago`} -> mood: ${(j.mood || 'neutral').toUpperCase()}${j.energyLevel ? `, energy: ${j.energyLevel}` : ''}`;
          if (j.keyTheme) journalStr += `, theme: "${j.keyTheme}"`;
          if (j.alignmentScore !== undefined) journalStr += `, alignment score: ${j.alignmentScore}/100`;
          if (j.tags?.length) journalStr += `, tags: [${j.tags.join(', ')}]`;
          if (j.excerpt) journalStr += `\n    excerpt: "${j.excerpt}"`;
          systemIns += journalStr;
        });
      }

      if (coreValues && coreValues.length > 0) {
        systemIns += `\n- User's core values (ranked, most important first): ${coreValues.join(', ')}. Reference these when helping them make decisions or when their actions seem misaligned with what they care about.`;
      }

      if (recentGratitude && recentGratitude.length > 0) {
        systemIns += `\n- Recent gratitude entries (use these when user is in a low state to remind them of what's good): ${recentGratitude.slice(0, 5).map((g: any) => `"${g.entry}"`).join(', ')}`;
      }

      if (evidenceVault && evidenceVault.length > 0) {
        systemIns += `\n- Evidence Vault — personal wins the user has logged as proof they can execute:`;
        evidenceVault.slice(0, 5).forEach((w: any) => {
          systemIns += `\n  * [${w.category}] "${w.title}" (${w.date})`;
        });
        systemIns += `\n  Use these wins as specific evidence when the user doubts themselves — don't be generic, cite what they actually did.`;
      }
    }

    const openRouterMessages = chatHistory.map((h) => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts?.[0]?.text || h.text || ''
    }));

    const tools = [
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Create a new task/protocol for the user when they ask you to add, remind, or set up a task.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              category: { type: "string", enum: ["health", "learning", "creative", "work", "personal", "routine"] },
              priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
              estimate: { type: "number", description: "Estimated minutes to complete" }
            },
            required: ["title", "category", "priority", "estimate"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_habit",
          description: "Create a new recurring habit for the user when they ask you to start tracking or build a habit.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string", enum: ["health", "learning", "creative", "work", "personal", "routine"] },
              frequency: { type: "string", description: "e.g. 'daily' or 'weekdays'" },
              targetStreak: { type: "number", description: "Target streak length in days, default 30" }
            },
            required: ["name", "category", "frequency"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "trigger_motivation_boost",
          description: "Trigger an immediate motivation boost from the user's personal Motivation Hub when they show signs of being at 'zero' — genuine demotivation, not ordinary tiredness. Call this in addition to your normal supportive reply, not instead of it.",
          parameters: {
            type: "object",
            properties: {
              reason: { type: "string", description: "Brief internal note on why this was triggered, e.g. 'zero motivation state detected'" }
            },
            required: []
          }
        }
      }
    ];

    const callOpenRouterStream = (model) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AetherOS Coach"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemIns }, ...openRouterMessages],
        tools,
        stream: true
      })
    });

    let orResponse = await callOpenRouterStream("meta-llama/llama-3.3-70b-instruct:free");
    if (orResponse.status === 429 || orResponse.status === 404) {
      console.warn(`[OpenRouter] llama-3.3-70b returned ${orResponse.status}, falling back to openrouter/free`);
      orResponse = await callOpenRouterStream("openrouter/free");
    }

    if (!orResponse.ok || !orResponse.body) {
      const errText = await orResponse.text().catch(() => '');
      console.error("[OpenRouter Error]", orResponse.status, errText);
      return res.status(orResponse.status === 429 ? 429 : 500).json({
        error: orResponse.status === 429
          ? "Both the primary and fallback free models are currently rate-limited upstream. Wait a minute and try again."
          : `OpenRouter request failed: ${errText}`
      });
    }

    // Switch to SSE streaming mode for the client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();

    const reader = orResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = '';
    const toolCallAccumulator: any = {};
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
    
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let json;
        try { json = JSON.parse(payload); } catch { continue; }
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
    
        if (delta.content) {
          accumulatedText += delta.content;
          res.write(`data: ${JSON.stringify({ type: 'text', content: delta.content })}\n\n`);
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallAccumulator[idx]) toolCallAccumulator[idx] = { name: '', arguments: '' };
            if (tc.function?.name) toolCallAccumulator[idx].name += tc.function.name;
            if (tc.function?.arguments) toolCallAccumulator[idx].arguments += tc.function.arguments;
          }
        }
      }
    }
    
    const toolCalls = Object.values(toolCallAccumulator)
      .filter((tc: any) => tc.name)
      .map((tc: any) => {
        let args = {};
        try { args = JSON.parse(tc.arguments || '{}'); } catch {}
        return { name: tc.name, args };
      });
    
    // Free-tier models occasionally return a completely empty completion with no error.
    // If that happens and there were no tool calls either, retry once against the fallback model.
    if (!accumulatedText.trim() && toolCalls.length === 0) {
      console.warn("[OpenRouter] Empty response from primary model, retrying with fallback");
      const retryResponse = await callOpenRouterStream("openrouter/free");
      if (retryResponse.ok && retryResponse.body) {
        const retryReader = retryResponse.body.getReader();
        let retryBuffer = '';
        while (true) {
          const { done: retryDone, value: retryValue } = await retryReader.read();
          if (retryDone) break;
          retryBuffer += decoder.decode(retryValue, { stream: true });
          const retryLines = retryBuffer.split('\n');
          retryBuffer = retryLines.pop() || '';
          for (const line of retryLines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            let json;
            try { json = JSON.parse(payload); } catch { continue; }
            const retryDelta = json.choices?.[0]?.delta;
            if (retryDelta?.content) {
              accumulatedText += retryDelta.content;
              res.write(`data: ${JSON.stringify({ type: 'text', content: retryDelta.content })}\n\n`);
            }
          }
        }
      }
    }
    
    if (!accumulatedText.trim() && toolCalls.length === 0) {
      res.write(`data: ${JSON.stringify({ error: "Both attempts returned an empty response. This can happen with free-tier models on long or complex prompts — try rephrasing more concisely, or retry." })}\n\n`);
    }
    
    res.write(`data: ${JSON.stringify({ type: 'done', toolCalls })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("[Coach Response Error]", err?.message || err);
    try {
      res.write(`data: ${JSON.stringify({ error: `Coach response failed: ${err?.message || String(err)}` })}\n\n`);
      res.end();
    } catch {
      res.status(500).json({ error: `Coach response failed: ${err?.message || String(err)}` });
    }
  }
});
app.post("/api/gemini/generate-chat-title", async (req, res) => {
  try {
    const { userText, coachText } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || !userText) {
      return res.status(200).json({ title: (userText || 'New Chat').slice(0, 40) });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AetherOS Coach"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: "Generate a concise 3-6 word title summarizing this conversation. No quotes, no punctuation at the end, no preamble — respond with only the title text." },
          { role: "user", content: `User: ${userText}\nCoach: ${(coachText || '').slice(0, 300)}` }
        ]
      })
    });

    if (!response.ok) {
      return res.status(200).json({ title: userText.slice(0, 40) });
    }

    const data = await response.json();
    const rawTitle = data.choices?.[0]?.message?.content?.trim();
    res.json({ title: rawTitle && rawTitle.length > 0 ? rawTitle.slice(0, 50) : userText.slice(0, 40) });
  } catch (err: any) {
    console.error("[Title Generation Error]", err?.message || err);
    res.status(200).json({ title: (req.body?.userText || 'New Chat').slice(0, 40) });
  }
});

app.post("/api/gemini/estimate-xp", async (req, res) => {
  try {
    const { title, category, estimate, difficultyMultiplier } = req.body;
    if (!title) return res.status(400).json({ error: "title parameter is missing" });
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");

    const prompt = `You are a gamification engine for a productivity app. Analyze this task and respond with ONLY a single integer for XP reward. Rules: Quick tasks (5-15m) = 10-50 XP, Medium (30-60m) = 100-250 XP, Hard/Deep (2h+) = 300-600 XP. Apply the difficulty multiplier in your calculation.
    Task: "${title}", Category: "${category || ''}", Estimated Time: ${estimate || 30} mins, Difficulty: ${difficultyMultiplier === 0.5 ? 'NOVICE (0.5x)' : difficultyMultiplier === 2.0 ? 'VM_MODE (2.0x)' : 'HARDWARE (1.0x)'}`;

    const callOpenRouter = async (model: string) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AetherOS XP"
      },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] })
    });

    let response = await callOpenRouter("meta-llama/llama-3.3-70b-instruct:free");
    if (response.status === 429 || response.status === 404) response = await callOpenRouter("openrouter/free");
    if (!response.ok) throw new Error("OpenRouter failed");

    const data = await response.json();
    res.json({ text: data.choices[0]?.message?.content?.trim() || "100" });
  } catch (err: any) {
    handleGeminiError(err, res, "Error estimating XP", {
      text: "100"
    });
  }
});

app.post("/api/gemini/update-memory", async (req, res) => {
  try {
    const { existingSummary, recentMessages } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || !recentMessages || recentMessages.length === 0) {
      return res.status(200).json({ summary: existingSummary || '' });
    }

    const conversationText = recentMessages
      .map((m: any) => `${m.sender === 'user' ? 'User' : 'Coach'}: ${m.text}`)
      .join('\n');

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AETHOS Coach Memory"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          {
            role: "system",
            content: `You maintain a compact long-term memory summary about a user, for an AI life coach to reference in future conversations. You will be given the EXISTING memory summary (may be empty) and a NEW conversation excerpt. Merge any new durable facts, preferences, goals, or patterns into the existing summary. Keep it under 150 words total. Write plain factual bullet-style sentences, no fluff, no meta-commentary. Only include things worth remembering long-term (recurring goals, stated preferences, ongoing struggles, key life context) — not one-off small talk. Respond with ONLY the updated summary text, nothing else.`
          },
          {
            role: "user",
            content: `EXISTING SUMMARY:\n${existingSummary || '(none yet)'}\n\nNEW CONVERSATION EXCERPT:\n${conversationText}`
          }
        ]
      })
    });

    if (!response.ok) {
      return res.status(200).json({ summary: existingSummary || '' });
    }

    const data = await response.json();
    const newSummary = data.choices?.[0]?.message?.content?.trim();
    res.json({ summary: newSummary || existingSummary || '' });
  } catch (err: any) {
    console.error("[Memory Update Error]", err?.message || err);
    res.status(200).json({ summary: req.body?.existingSummary || '' });
  }
});

app.post("/api/gemini/generate-timetable", async (req, res) => {
  try {
    const { todayStr, pendingTasks, routine } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
    
    const prompt = `Generate a daily timetable for today (${todayStr}) starting from 5:00 AM to 11:00 PM.
    Available Tasks to Schedule:
    ${(pendingTasks || []).map((t: any) => `- [${t.priority.toUpperCase()}] ${t.title} (${t.estimate} mins, Category: ${t.category})`).join('\n')}
    
    User Fixed Routine Events (Integrate these at realistic times):
    ${(routine || []).join(', ')}
    
    Requirements:
    1. Use only the provided tasks and routine events.
    2. Spread them out reasonably with breaks.
    3. Categorize each block as 'task', 'event', 'routine', or 'break'.
    4. Ensure no overlap.
    5. Output ONLY a JSON array of objects.
    
    Block Schema: { "title": string, "type": "task"|"event"|"routine"|"break", "startTime": "${todayStr}THH:mm", "endTime": "${todayStr}THH:mm" }`;

    const callOpenRouter = async (model: string) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aetheros.app",
        "X-Title": "AETHOS Timetable"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    let response = await callOpenRouter("meta-llama/llama-3.3-70b-instruct:free");
    if (response.status === 429 || response.status === 404) {
      response = await callOpenRouter("openrouter/free");
    }

    if (!response.ok) throw new Error("OpenRouter failed");
    
    const data = await response.json();
    const contentText = data.choices[0]?.message?.content;
    const json = JSON.parse(contentText.replace(/```json/g, '').replace(/```/g, ''));
    res.json(json);
  } catch (err: any) {
    const todayStr = req.body.todayStr || new Date().toISOString().split('T')[0];
    handleGeminiError(err, res, "Error generating timetable", [
      { "title": "AETHOS Wakeup & Calibration", "type": "routine", "startTime": `${todayStr}T07:00`, "endTime": `${todayStr}T08:00` },
      { "title": "Focused Protocol Execution", "type": "task", "startTime": `${todayStr}T09:00`, "endTime": `${todayStr}T12:00` },
      { "title": "Recreation & System Maintenance", "type": "break", "startTime": `${todayStr}T12:00`, "endTime": `${todayStr}T13:00` },
      { "title": "Neural Archival & Reflection", "type": "routine", "startTime": `${todayStr}T21:00`, "endTime": `${todayStr}T22:00` }
    ]);
  }
});

// Serve assets & fallback to SPA route
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
