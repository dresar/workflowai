export interface AIProviderConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeoutMs?: number;
}

export interface BuiltPrompt {
  systemPrompt: string;
  developerPrompt?: string;
  userPrompt: string;
  config: AIModelConfig;
}

export interface AIModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface AIProvider {
  readonly name: string;
  generate(prompt: BuiltPrompt, config: AIProviderConfig): Promise<AIResponse>;
  validateKey(apiKey: string): Promise<boolean>;
}
