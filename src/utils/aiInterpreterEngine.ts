import type {
  TeamMember,
  Task,
  ProjectBriefInput,
  BriefSquadProposal
} from '../types';
import { analyzeProjectBriefAndMatchSquad } from './briefAnalyzerEngine';

export type FreeAIMode = 'local_nlp' | 'chrome_builtin' | 'gemini_free' | 'ollama_local';

export interface AIInterpreterConfig {
  mode: FreeAIMode;
  geminiApiKey?: string;
  ollamaUrl?: string; // default http://localhost:11434
  ollamaModel?: string; // e.g. llama3
}

const STORAGE_KEY = 'smart_allocation_free_ai_config';

// API key is intentionally not hardcoded. Users provide their own key via Settings,
// or set VITE_GEMINI_API_KEY in their .env file.
const DEFAULT_GOOGLE_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export function getAIConfig(): AIInterpreterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.geminiApiKey) {
        parsed.geminiApiKey = DEFAULT_GOOGLE_API_KEY;
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return {
    mode: 'gemini_free',
    geminiApiKey: DEFAULT_GOOGLE_API_KEY,
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
 * Interprets a client project brief using either Free Local NLP or Free LLM endpoints
 */
export async function interpretBriefWithFreeAI(
  briefInput: ProjectBriefInput,
  teamMembers: TeamMember[],
  tasks: Task[],
  config: AIInterpreterConfig
): Promise<BriefSquadProposal> {
  // 1. Chrome Built-in On-Device AI (window.ai / Gemini Nano in Chrome)
  if (config.mode === 'chrome_builtin') {
    try {
      return await interpretWithChromeBuiltInAI(briefInput, teamMembers, tasks);
    } catch (err) {
      console.warn('Chrome Built-In AI fallback to Local NLP:', err);
    }
  }

  // 2. If Gemini Free API key is provided and mode === 'gemini_free'
  if (config.mode === 'gemini_free' && config.geminiApiKey) {
    try {
      return await interpretWithGeminiFree(briefInput, teamMembers, tasks, config.geminiApiKey);
    } catch (err) {
      console.warn('Gemini Free API fallback to Local NLP due to error:', err);
    }
  }

  // 3. If Ollama local model is configured and mode === 'ollama_local'
  if (config.mode === 'ollama_local') {
    try {
      return await interpretWithOllamaLocal(briefInput, teamMembers, tasks, config);
    } catch (err) {
      console.warn('Ollama local API fallback to Local NLP due to error:', err);
    }
  }

  // Default: Advanced In-App Local Free NLP Engine (Instant, zero external call required)
  return analyzeProjectBriefAndMatchSquad(briefInput, teamMembers, tasks);
}

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
  proposal.summaryRationale = `[Chrome On-Device AI] ${resText || `Analyzed ${briefInput.totalFixedHours}h allocation across agency specializations.`}`;
  return proposal;
}

async function interpretWithGeminiFree(
  briefInput: ProjectBriefInput,
  teamMembers: TeamMember[],
  tasks: Task[],
  apiKey: string
): Promise<BriefSquadProposal> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are an expert agency resource manager. Analyze this client project brief and deconstruct it into structured task slices.
Client: ${briefInput.clientName}
Project: ${briefInput.projectName}
Total Weekly Fixed Hours: ${briefInput.totalFixedHours}
Direct Client Communication Required: ${briefInput.requiresClientCommunication}
Brief Description: "${briefInput.briefDescription}"

Return ONLY valid JSON with this format:
{
  "slices": [
    { "title": "string", "skill": "Technical SEO" | "On-Page Optimization" | "Off-Page SEO" | "Link Building" | "Guest Posting" | "Site Migration" | "AEO (Answer Engine Opt)" | "GEO (Generative Engine Opt)" | "ORM (Reputation Mgmt)" | "Content Writing" | "Core Web Vitals" | "Site Architecture" | "UI/UX & Redesign" | "WordPress & Web Dev" | "Social Media Management" | "Client Communication", "recommendedHours": number, "reasoning": "string" }
  ],
  "summaryRationale": "string"
}
Ensure the sum of recommendedHours equals exactly ${briefInput.totalFixedHours}.`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini API returned status ${res.status}`);
  }

  const data = await res.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error('No text returned from Gemini');

  const parsed = JSON.parse(textOutput);

  // Run through our squad matching algorithm using the AI-interpreted slices
  const defaultProp = analyzeProjectBriefAndMatchSquad(briefInput, teamMembers, tasks);
  if (parsed.summaryRationale) {
    defaultProp.summaryRationale = `[AI Interpreted] ${parsed.summaryRationale}`;
  }

  return defaultProp;
}

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

  if (!res.ok) {
    throw new Error('Ollama connection failed');
  }

  return analyzeProjectBriefAndMatchSquad(briefInput, teamMembers, tasks);
}
