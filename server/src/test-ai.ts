import * as dotenv from 'dotenv';
dotenv.config();

import { db } from './database/connection';
import { apiKeys, aiProviders } from './database/schema';
import { eq } from 'drizzle-orm';
import { decrypt, maskKey } from './shared/utils/crypto.util';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

async function testAll() {
  console.log('--- STARTING AI MODEL & KEY ROTATION TEST ---\n');

  try {
    const keysList = await db.select().from(apiKeys).where(eq(apiKeys.isActive, true));
    const providersList = await db.select().from(aiProviders);

    console.log(`Found ${keysList.length} active API keys in Neon DB:`);
    keysList.forEach(k => {
      const p = providersList.find(prov => prov.id === k.providerId);
      console.log(`- Label: "${k.label}" | Provider: ${p?.displayName} | Preview: ${k.keyPreview}`);
    });
    console.log('');

    const geminiKeys = keysList.filter(k => {
      const p = providersList.find(prov => prov.id === k.providerId);
      return p?.name === 'gemini';
    });

    const groqKeys = keysList.filter(k => {
      const p = providersList.find(prov => prov.id === k.providerId);
      return p?.name === 'groq';
    });

    if (geminiKeys.length > 0) {
      console.log('Testing Google Gemini (Model: gemini-2.5-flash)...');
      const targetKey = geminiKeys[0];
      const decryptedKey = decrypt(targetKey.keyEncrypted);
      const ai = new GoogleGenerativeAI(decryptedKey);
      
      try {
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const start = Date.now();
        const generatePromise = model.generateContent('Say "Gemini is Online!" in 3 words.');
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout 10 seconds')), 10000)
        );
        const res = await Promise.race([generatePromise, timeoutPromise]);
        const text = res.response.text().trim();
        console.log(`✅ Gemini (gemini-2.5-flash) success [${Date.now() - start}ms]: "${text}"`);
      } catch (err) {
        console.log(`❌ Gemini (gemini-2.5-flash) failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      console.log('⚠️ No active Gemini keys found in DB.');
    }
    console.log('');

    if (groqKeys.length > 0) {
      console.log('Testing Groq...');
      const targetKey = groqKeys[0];
      try {
        const decryptedKey = decrypt(targetKey.keyEncrypted);
        const groq = new Groq({ apiKey: decryptedKey });
        const start = Date.now();
        
        const generatePromise = groq.chat.completions.create({
          messages: [{ role: 'user', content: 'Say "Groq is Online!" in 3 words.' }],
          model: 'llama-3.3-70b-versatile',
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout 10 seconds')), 10000)
        );
        
        const completion = await Promise.race([generatePromise, timeoutPromise]);
        const text = completion.choices[0]?.message?.content?.trim() || '';
        console.log(`✅ Groq success [${Date.now() - start}ms]: "${text}"`);
      } catch (err) {
        console.log(`❌ Groq failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      console.log('⚠️ No active Groq keys found in DB.');
    }

  } catch (error) {
    console.error('Fatal test error:', error);
  }

  console.log('\n--- AI TEST RUN COMPLETE ---');
  process.exit(0);
}

testAll();
