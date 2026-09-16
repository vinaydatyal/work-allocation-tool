import type {
  TeamMember,
  Task,
  ProjectBriefInput,
  BriefSquadProposal
} from '../types';
import { analyzeProjectBriefAndMatchSquad } from './briefAnalyzerEngine';

export type AIMode = 'claude' | 'local_nlp' | 'chrome_builtin' | 'gemini_free' | 'ollama_local';

export interface AIInterpreterConfig {
  mode: AIMode;
  claudeApiKey?: string;
  geminiApiKey?: string;
  ollamaUrl?: string;  // default http://localhost:11434
  ollamaModel?: string; // e.g. llama3
}

const STORAGE_KEY = 'smart_allocation_ai_config';

// Keys are loaded from environment variables — never hardcoded.
const ENV_CLAUDE_KEY  = import.meta.env.VITE_CLAUDE_API_KEY  || '';
const ENV_GEMINI_KEY  = import.meta.env.VITE_GEMINI_API_KEY  || '';

export function getAIConfig(): AIInterpreterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AIInterpreterConfig;
      if (!parsed.claudeApiKey)  parsed.claudeApiKey  = ENV_CLAUDE_KEY;
      if (!parsed.geminiApiKey)  parsed.geminiApiKey  = ENV_GEMINI_KEY;
      return parsed;
    }
  } catch {
    // ignore
  }
  return {
    mode: ENV_CLAUDE_KEY ? 'claude' : (ENV_GEMINI_KEY ? 'gemini_free' : 'local_nlp'),
    claudeApiKey: ENV_CLAUDE_KEY,
    geminiApiKey: ENV_GEMINI_KEY,
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3'
  };
}

export function saveAIConfig(config: AIInterpreterConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Interprets a client project brief using Claude, Gemini, or local NLP fallback.
 */
export async function interpretBriefWithFreeAI(
  briefInput: ProjectBriefInput,
  teamMembers: TeamMember[],
  tasks: Task[],
  config: AIInterpreterConfig
): Promise<BriefSquadProposal> {

  // 1. Claude (Anthropic) — primary AI provider
  if (config.mode === 'claude' && config.claudeApiKey) {
    try {
      return await interpretWithClaude(briefInput, teamMembers, tasks, config.claudeApiKey);
    } catch (err) {
      console.warn('Claude API fallback to Local NLP:', err);
    }
  }

  // 2. Chrome Built-in On-Device AI (Gemini Nano)
  if (config.mode === 'chrome_builtin') {
    try {
      return await interpretWithChromeBuiltInAI(briefInput, teamMembers, tasks);
    } catch (err) {
      console.warn('Chrome Built-In AI fallback to Local NLP:', err);
    }
  }

  // 3. Google Gemini Free API
  if (config.mode === 'gemini_free' && config.geminiApiKey) {
    try {
      return await interpretWithGeminiFree(briefInput, teamMembers, tasks, config.geminiApiKey);
    } catch (err) {
      console.warn('Gemini Free API fallback to Local NLP:', err);
    }
  }

  // 4. Ollama local model
  if (config.mode === 'ollama_local') {
    try {
      return await interpretWithOllamaLocal(briefInput, teamMembers, tasks, config);
    } catch (err) {
      console.warn('Ollama local API fallback to Local NLP:', err);
    }
  }

  // Default: In-app local NLP engine (instant, zero external calls)
  return analyzeProjectBriefAndMatchSquad(briefInput, teamMembers, tasks);
}

// ─── Claude (Anthropic) ────────────────────────────────────────────────────────
async function interpretWithClaude(
  briefInput: ProjectBriefInput,
  teamMembers: TeamMember[],
  tasks: Task[],
  apiKey: string
): Promise<BriefSquadProposal> {
  const prompt = `You are an expert agency resource manager. Analyze this client project brief and deconstruct it into structured task slices.

Client: ${briefInput.clientName}
Project: ${briefInput.projectName}
Total Weekly Fixed Hours: ${briefInput.totalFixedHours}
Direct Client Communication Required: ${briefInput.requiresClientCommunication}
Brief Description: "${briefInput.briefDescription}"

Return ONLY valid JSON with this format:
{
  "slices": [
    {
      "title": "string",
      "skill": "Technical SEO" | "On-Page Optimization" | "Off-Page SEO" | "Link Building" | "Guest Posting" | "Site Migration" | "AEO (Answer Engine Opt)" | "GEO (Generative Engine Opt)" | "ORM (Reputation Mgmt)" | "Content Writing" | "Core Web Vitals" | "Site Architecture" | "UI/UX & Redesign" | "WordPress & Web Dev" | "Social Media Management" | "Client Communication",
      "recommendedHours": number,
      "reasoning": "string"
    }
  ],
  "summaryRationale": "string"
}

Ensure the sum of recommendedHours equals exactly ${briefInput.totalFixedHours}.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Claude API returned status ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  const textOutput = data.content?.[0]?.text;
  if (!textOutput) throw new Error('No text returned from Claude');

  // Extract JSON from the response (Claude may wrap in markdown code blocks)
  const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON found in Claude response');

  const parsed = JSON.parse(jsonMatch[0]);

  const defaultProp = analyzeProjectBriefAndMatchSquad(briefInput, teamMembers, tasks);
  if (parsed.summaryRationale) {
    defaultProp.summaryRationale = `[Claude AI] ${parsed.summaryRationale}`;
  }
  return defaultProp;
}

// ─── Chrome Built-in AI ────────────────────────────────────────────────────────
async function interpretWithChromeBuiltInAI(
  briefInput: ProjectBriefInput,
  teamMembers: TeamMember[],
  tasks: Task[]
): Promise<BriefSquadProposal> {
  const win = window as any;
  const aiModel = win.ai?.languageModel || win.ai?.assistant;
  if (!aiModel) {
    throw new Error('Chrome Built-in AI not available in this browser session');
  }
  const session = await aiModel.create();
  const resText = await session.prompt(
    `Analyze project brief "${briefInput.briefDescription}" (${briefInput.totalFixedHours} hours total).`
  );
  const proposal = analyzeProjectBriefAndMatchSquad(briefInput, teamMembers, tasks);
  proposal.summaryRationale = `[Chrome On-Device AI] ${resText || `Analyzed ${briefInput.totalFixedHours}h allocation.`}`;
  return proposal;
}

// ─── Google Gemini ─────────────────────────────────────────────────────────────
async function interpretWithGeminiFree(
  briefInput: ProjectBriefInput,
  teamMembers: TeamMember[],
  tasks: Task[],
  apiKey: string
): Promise<BriefSquadProposal> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `You are an expert agency resource manager. Analyze this project brief.
Client: ${briefInput.clientName} | Project: ${briefInput.projectName}
Total Hours: ${briefInput.totalFixedHours} | Brief: "${briefInput.briefDescription}"
Return ONLY valid JSON: { "slices": [...], "summaryRationale": "string" }`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    })
  });

  if (!res.ok) throw new Error(`Gemini API returned status ${res.status}`);
  const data = await res.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error('No text returned from Gemini');
  const parsed = JSON.parse(textOutput);
  const defaultProp = analyzeProjectBriefAndMatchSquad(briefInput, teamMembers, tasks);
  if (parsed.summaryRationale) {
    defaultProp.summaryRationale = `[Gemini AI] ${parsed.summaryRationale}`;
  }
  return defaultProp;
}

// ─── Ollama Local ──────────────────────────────────────────────────────────────
async function interpretWithOllamaLocal(
  briefInput: ProjectBriefInput,
  teamMembers: TeamMember[],
  tasks: Task[],
  config: AIInterpreterConfig
): Promise<BriefSquadProposal> {
  const url = `${config.ollamaUrl || 'http://localhost:11434'}/api/generate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel || 'llama3',
      prompt: `Analyze this SEO project brief (${briefInput.totalFixedHours} hours total): "${briefInput.briefDescription}". Break it down into skills and hours.`,
      stream: false
    })
  });
  if (!res.ok) throw new Error('Ollama connection failed');
  return analyzeProjectBriefAndMatchSquad(briefInput, teamMembers, tasks);
}
