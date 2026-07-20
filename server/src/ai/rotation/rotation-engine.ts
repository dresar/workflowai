import { db } from '../../database/connection';
import { apiKeys, aiProviders, rotationConfig } from '../../database/schema';
import { eq, and, isNull, or, lte, asc } from 'drizzle-orm';
import { decrypt } from '../../shared/utils/crypto.util';
import { logRotation, logError } from '../../logger/logger';
import { AllProvidersExhaustedError, AIRateLimitError } from '../../errors/domain-errors';
import type { RotationStrategy } from '../../shared/constants/app.constants';

export interface SelectedKey {
  id: string;
  apiKey: string;
  providerId: string;
  providerName: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface RotationEvent {
  type: 'selected' | 'exhausted' | 'fallback' | 'cooldown';
  providerId?: string;
  providerName?: string;
  apiKeyId?: string;
  reason?: string;
  timestamp: string;
}

export class RotationEngine {
  private events: RotationEvent[] = [];
  private triedKeyIds = new Set<string>();
  private triedProviderIds = new Set<string>();

  getEvents(): RotationEvent[] {
    return this.events;
  }

  markProviderFailed(providerId: string): void {
    this.triedProviderIds.add(providerId);
  }

  private addEvent(event: Omit<RotationEvent, 'timestamp'>): void {
    this.events.push({ ...event, timestamp: new Date().toISOString() });
  }

  async selectKey(preferredProviderName?: string): Promise<SelectedKey> {
    const config = await this.getConfig();
    const strategy = config?.strategy ?? 'round_robin';
    const now = new Date();

    const allActiveProviders = await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.isActive, true))
      .orderBy(asc(aiProviders.priority));

    let orderedProviders = allActiveProviders;

    if (preferredProviderName) {
      const preferred = orderedProviders.find((p) => p.name === preferredProviderName);
      const rest = orderedProviders.filter((p) => p.name !== preferredProviderName);
      if (preferred) orderedProviders = [preferred, ...rest];
    }

    for (const provider of orderedProviders) {
      if (this.triedProviderIds.has(provider.id)) continue;

      const keys = await db
        .select()
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.providerId, provider.id),
            eq(apiKeys.isActive, true),
            or(isNull(apiKeys.cooldownUntil), lte(apiKeys.cooldownUntil, now)),
          ),
        )
        .orderBy(asc(apiKeys.priority));

      const availableKeys = keys.filter((k) => !this.triedKeyIds.has(k.id));

      if (availableKeys.length === 0) {
        logRotation({ providerId: provider.id }, `No uncooled keys for provider ${provider.name}, rotating to next provider`);
        this.triedProviderIds.add(provider.id);
        continue;
      }

      const selectedKey = this.pickKey(availableKeys, strategy);
      this.triedKeyIds.add(selectedKey.id);

      let decryptedKey: string;
      try {
        decryptedKey = decrypt(selectedKey.keyEncrypted);
      } catch {
        logError({}, `Failed to decrypt key ${selectedKey.id}`);
        continue;
      }

      if (!decryptedKey) {
        continue;
      }

      this.addEvent({
        type: 'selected',
        providerId: provider.id,
        providerName: provider.name,
        apiKeyId: selectedKey.id,
      });

      logRotation(
        { provider: provider.name, keyId: selectedKey.id },
        `Selected API key for ${provider.name}`,
      );

      return {
        id: selectedKey.id,
        apiKey: decryptedKey,
        providerId: provider.id,
        providerName: provider.name,
        model: provider.defaultModel,
        timeoutMs: provider.timeoutMs,
        maxRetries: provider.maxRetries,
      };
    }

    // Environmental Key Fallback: Check if environment variables contain API keys
    const envGemini = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
    if (envGemini) {
      const firstKey = envGemini.split(',')[0].trim();
      if (firstKey && !this.triedKeyIds.has('env-gemini-fallback')) {
        this.triedKeyIds.add('env-gemini-fallback');
        return {
          id: 'env-gemini-fallback',
          apiKey: firstKey,
          providerId: 'env-provider',
          providerName: 'gemini',
          model: 'gemini-3.1-flash-lite-preview',
          timeoutMs: 60000,
          maxRetries: 3,
        };
      }
    }

    const envGroq = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY;
    if (envGroq) {
      const firstKey = envGroq.split(',')[0].trim();
      if (firstKey && !this.triedKeyIds.has('env-groq-fallback')) {
        this.triedKeyIds.add('env-groq-fallback');
        return {
          id: 'env-groq-fallback',
          apiKey: firstKey,
          providerId: 'env-provider',
          providerName: 'groq',
          model: 'llama-3.3-70b-versatile',
          timeoutMs: 30000,
          maxRetries: 3,
        };
      }
    }

    throw new AllProvidersExhaustedError();
  }

  async markKeyFailed(keyId: string, cooldownMinutes: number, isPermanent = false): Promise<void> {
    if (keyId.startsWith('env-')) {
      this.addEvent({ type: 'cooldown', apiKeyId: keyId, reason: 'Env fallback key failed' });
      return;
    }

    if (isPermanent) {
      await db
        .update(apiKeys)
        .set({
          isActive: false,
          failedRequests: db.$count(apiKeys, eq(apiKeys.id, keyId)),
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, keyId));

      this.addEvent({ type: 'cooldown', apiKeyId: keyId, reason: 'Permanently deactivated (invalid API key)' });
      logRotation({ keyId }, 'Key permanently deactivated (invalid API key)');
      return;
    }

    const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60 * 1000);
    await db
      .update(apiKeys)
      .set({
        failedRequests: db.$count(apiKeys, eq(apiKeys.id, keyId)),
        cooldownUntil,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, keyId));

    this.addEvent({ type: 'cooldown', apiKeyId: keyId, reason: `Cooldown until ${cooldownUntil.toISOString()}` });
    logRotation({ keyId, cooldownUntil }, 'Key marked as cooling down');
  }

  async markKeySuccess(keyId: string): Promise<void> {
    if (keyId.startsWith('env-')) {
      return;
    }
    await db
      .update(apiKeys)
      .set({
        totalRequests: db.$count(apiKeys, eq(apiKeys.id, keyId)),
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, keyId));
  }

  private pickKey(keys: typeof apiKeys.$inferSelect[], strategy: RotationStrategy) {
    switch (strategy) {
      case 'random':
        return keys[Math.floor(Math.random() * keys.length)];
      case 'priority':
        return keys[0];
      case 'round_robin':
        return keys[0];
      case 'fallback':
        return keys[0];
      default:
        return keys[0];
    }
  }

  private async getConfig() {
    const [config] = await db.select().from(rotationConfig).limit(1);
    return config;
  }
}
