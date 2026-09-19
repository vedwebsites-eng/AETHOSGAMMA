export const suggestPassword = async () => {
  const response = await fetch("/api/gemini/suggest-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.password;
};

export const analyzeJournalEntry = async (content: string) => {
  const response = await fetch("/api/gemini/analyze-journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const breakdownBossTask = async (taskTitle: string, category: string) => {
  const response = await fetch("/api/gemini/breakdown-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: taskTitle, category })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const generateDailyBriefing = async (stats: any, activeTasks: any[]) => {
  const response = await fetch("/api/gemini/daily-briefing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stats, activeTasks })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.text;
};

export const analyzeLifeBalance = async (tasks: any[], journals: any[], stats: any) => {
  const response = await fetch("/api/gemini/life-balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, journals, stats })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const generateLifeInsight = async (lowestCategory: string, values: Record<string, number>) => {
  const response = await fetch("/api/gemini/life-insight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lowestCategory, values })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.text;
};

export const generateCoachResponse = async (chatHistory: any[], userStats: any, lowestCategory: string, context?: any, coachProfile?: any) => {
  const response = await fetch("/api/gemini/coach-response", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatHistory, userStats, lowestCategory, context, coachProfile })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return await response.json(); // { text, toolCalls }
};

export const generateCoachResponseStream = async (
  chatHistory: any[],
  userStats: any,
  lowestCategory: string,
  context: any,
  coachProfile: any,
  memorySummary: string | null,
  onChunk: (partialText: string) => void,
  signal?: AbortSignal
): Promise<{ text: string; toolCalls: any[] }> => {
  const response = await fetch("/api/gemini/coach-response", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatHistory, userStats, lowestCategory, context, coachProfile, memorySummary }),
    signal
  });

  if (!response.ok || !response.body) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let toolCalls: any[] = [];
  let streamError: string | null = null;

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
      if (!payload) continue;
      let json;
      try { json = JSON.parse(payload); } catch { continue; }
      if (json.error) { streamError = json.error; continue; }
      if (json.type === 'text') { fullText += json.content; onChunk(fullText); }
      if (json.type === 'done') { toolCalls = json.toolCalls || []; }
    }
  }

  if (streamError) throw new Error(streamError);
  if (!fullText && toolCalls.length === 0) throw new Error("Empty response from Aether Mind.");
  return { text: fullText, toolCalls };
};
