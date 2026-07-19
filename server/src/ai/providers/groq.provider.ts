import Groq from 'groq-sdk';
import type { AIProvider, AIProviderConfig, BuiltPrompt, AIResponse } from './ai-provider.interface';
import { AIError, AITimeoutError } from '../../errors/domain-errors';
import { logAI } from '../../logger/logger';

export class GroqProvider implements AIProvider {
  readonly name = 'groq';

  async generate(prompt: BuiltPrompt, config: AIProviderConfig): Promise<AIResponse> {
    const start = Date.now();
    const client = new Groq({ apiKey: config.apiKey });

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
    const systemContent = [prompt.systemPrompt, prompt.developerPrompt].filter(Boolean).join('\n\n');
    if (systemContent) messages.push({ role: 'system', content: systemContent });
    messages.push({ role: 'user', content: prompt.userPrompt });

    logAI({ provider: this.name, model: config.model }, 'Groq generate started');

    try {
      const timeoutMs = config.timeoutMs ?? 120000;
      let fullContent = "";
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let isDone = false;
      let currentMessages = [...messages];
      let maxContinuations = 4; // Allow more continuations for Groq since we clamp tokens smaller

      // Clamp max_tokens to 6000 to avoid Groq's 12000 TPM limit on free tier (prompt + completion)
      const requestedTokens = config.maxTokens ?? prompt.config.maxTokens ?? 6000;
      const safeMaxTokens = Math.min(requestedTokens, 6000);

      while (!isDone && maxContinuations > 0) {
        const generatePromise = client.chat.completions.create({
          model: config.model,
          messages: currentMessages,
          temperature: config.temperature ?? prompt.config.temperature,
          max_tokens: safeMaxTokens,
          top_p: config.topP ?? prompt.config.topP,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new AITimeoutError(this.name, timeoutMs)), timeoutMs),
        );

        const result = await Promise.race([generatePromise, timeoutPromise]);
        const text = result.choices[0]?.message?.content ?? '';
        fullContent += text;
        
        const usage = result.usage;
        if (usage) {
          totalPromptTokens += usage.prompt_tokens ?? 0;
          totalCompletionTokens += usage.completion_tokens ?? 0;
        }

        const finishReason = result.choices[0]?.finish_reason;
        if (finishReason === 'length') {
          currentMessages = [
            { role: 'user', content: `This is what you generated so far:\n\n${fullContent}\n\nYour output was cut off because you reached the maximum token limit. PLEASE CONTINUE EXACTLY FROM WHERE YOU LEFT OFF. Do not repeat the previous text. Do not add introductory text. Just output the direct continuation of the last sentence/word.` }
          ];
          maxContinuations--;
          logAI({ provider: this.name }, `Hit length limit, continuing... (${maxContinuations} left)`);
        } else {
          isDone = true;
        }
      }

      const latencyMs = Date.now() - start;

      logAI({ provider: this.name, latencyMs, tokens: totalPromptTokens + totalCompletionTokens }, 'Groq generate completed');

      return {
        content: fullContent,
        provider: this.name,
        model: config.model,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens,
        latencyMs,
      };
    } catch (err) {
      if (err instanceof AITimeoutError) throw err;
      throw new AIError(`Groq error: ${err instanceof Error ? err.message : 'Unknown'}`, err);
    }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const client = new Groq({ apiKey });
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
