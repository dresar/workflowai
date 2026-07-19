export const GENERATE_TYPES = [
  'prd',
  'architecture',
  'database',
  'api',
  'tasks',
  'prompt',
  'canvas',
  'workflow',
] as const;

export type GenerateType = (typeof GENERATE_TYPES)[number];

export const ROTATION_STRATEGIES = ['round_robin', 'priority', 'random', 'fallback'] as const;
export type RotationStrategy = (typeof ROTATION_STRATEGIES)[number];

export const AI_PROVIDER_NAMES = [
  'gemini',
  'groq',
  'openai',
  'claude',
  'deepseek',
  'openrouter',
  'ollama',
  'azure',
  'anthropic',
] as const;

export type AIProviderName = (typeof AI_PROVIDER_NAMES)[number];
