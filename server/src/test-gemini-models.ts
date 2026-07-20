import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyC9GNG6LdA-qZ1zcjbIEovFVYRr1rHfNms';
const ai = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-flash-preview',
  'gemini-3-flash',
  'gemini-1.5-pro',
];

async function runTest() {
  console.log('Testing more Gemini model variations...\n');
  for (const modelName of modelsToTest) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const start = Date.now();
      const res = await model.generateContent('Say "OK"');
      const text = res.response.text().trim();
      console.log(`✅ Model "${modelName}": SUCCESS [${Date.now() - start}ms] -> "${text}"`);
    } catch (err: any) {
      console.log(`❌ Model "${modelName}": FAILED -> ${err.message}`);
    }
  }
}

runTest();
