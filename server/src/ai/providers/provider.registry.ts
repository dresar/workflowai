import type { AIProvider } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';

const registry = new Map<string, AIProvider>();

registry.set('gemini', new GeminiProvider());
registry.set('groq', new GroqProvider());

export function getProvider(name: string): AIProvider | undefined {
  return registry.get(name);
}

export function getAllProviders(): AIProvider[] {
  return Array.from(registry.values());
}

export function registerProvider(provider: AIProvider): void {
  registry.set(provider.name, provider);
}

export function isProviderRegistered(name: string): boolean {
  return registry.has(name);
}
