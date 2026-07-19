import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AIProviderConfig, BuiltPrompt, AIResponse } from './ai-provider.interface';
import { AIError, AITimeoutError } from '../../errors/domain-errors';
import { logAI } from '../../logger/logger';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  async generate(prompt: BuiltPrompt, config: AIProviderConfig): Promise<AIResponse> {
    const start = Date.now();
    const client = new GoogleGenerativeAI(config.apiKey);
    const model = client.getGenerativeModel({
      model: config.model,
      systemInstruction: [prompt.systemPrompt, prompt.developerPrompt].filter(Boolean).join('\n\n'),
      generationConfig: {
        temperature: config.temperature ?? prompt.config.temperature,
        maxOutputTokens: config.maxTokens ?? prompt.config.maxTokens,
        topP: config.topP ?? prompt.config.topP,
      },
    });

    logAI({ provider: this.name, model: config.model }, 'Gemini generate started');

    try {
      const timeoutMs = config.timeoutMs ?? 120000;
      let fullContent = "";
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let isDone = false;
      let currentPrompt = prompt.userPrompt;
      let maxContinuations = 3;

      while (!isDone && maxContinuations > 0) {
        const generatePromise = model.generateContent(currentPrompt);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new AITimeoutError(this.name, timeoutMs)), timeoutMs),
        );

        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = result.response;
        const text = response.text();
        fullContent += text;
        
        const usage = response.usageMetadata;
        if (usage) {
          totalPromptTokens += usage.promptTokenCount ?? 0;
          totalCompletionTokens += usage.candidatesTokenCount ?? 0;
        }

        const finishReason = response.candidates?.[0]?.finishReason;
        // Enum or string check for MAX_TOKENS
        if (finishReason === 'MAX_TOKENS' || finishReason === 2) {
          currentPrompt = `This is what you generated so far:\n\n${fullContent}\n\nYour output was cut off because you reached the maximum token limit. PLEASE CONTINUE EXACTLY FROM WHERE YOU LEFT OFF. Do not repeat the previous text. Do not add introductory text. Just output the direct continuation of the last sentence/word.`;
          maxContinuations--;
          logAI({ provider: this.name }, `Hit MAX_TOKENS, continuing... (${maxContinuations} left)`);
        } else {
          isDone = true;
        }
      }

      const latencyMs = Date.now() - start;

      logAI({ provider: this.name, latencyMs, tokens: totalPromptTokens + totalCompletionTokens }, 'Gemini generate completed');

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
      throw new AIError(`Gemini error: ${err instanceof Error ? err.message : 'Unknown'}`, err);
    }
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const client = new GoogleGenerativeAI(apiKey);
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      await model.generateContent('test');
      return true;
    } catch {
      return false;
    }
  }
}
