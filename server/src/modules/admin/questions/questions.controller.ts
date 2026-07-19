import { db } from '../../../database/connection';
import { interviewQuestions, projects } from '../../../database/schema';
import { eq, asc } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../shared/utils/response.util';
import { RotationEngine } from '../../../ai/rotation/rotation-engine';
import { getProvider } from '../../../ai/providers/provider.registry';

export async function getActiveQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    if (projectId) {
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (project && project.idea) {
        try {
          const rotationEngine = new RotationEngine();
          const selectedKey = await rotationEngine.selectKey();
          const provider = getProvider(selectedKey.providerName);
          
          if (provider) {
            const languageLabel = project.language === 'id' ? 'Indonesian' : 'English';
            const systemPrompt = `You are an expert Requirements Engineer. Your job is to generate exactly 5 custom, highly relevant, and contextual clarifying questions to deeply understand the requirements and details of the user's software idea.

Return ONLY a raw JSON array matching this typescript signature, without markdown code blocks:
Array<{
  id: string;
  question: string;
  type: 'textarea' | 'chips' | 'radio' | 'checkbox' | 'select' | 'switch';
  options?: string[];
  desc?: string;
}>

Constraints:
1. You MUST generate exactly 5 questions.
2. The language of the questions AND options MUST match the user's preferred language: ${languageLabel}.
3. All questions, options, and descriptions MUST be 100% relevant and specific to the user's project idea. Do NOT use generic or unrelated examples. Tailor every option and question strictly to the project context provided.
4. Use natural, conversational language appropriate to the project domain. Questions should feel like a professional discovery session, not a survey.
5. The 'options' field must contain real, contextual choices that are directly relevant to the specific software idea described. Never include options from a different domain.
6. The 'desc' field must be a short, helpful guide or recommendation on how the user should answer this specific question. Keep it brief and encouraging.
7. Do NOT output markdown ticks or code block wrapper. Output ONLY the raw valid JSON array. No text before or after.
8. Ensure the JSON is complete and valid — do not truncate or leave any field unfinished.`;

            const userPrompt = `Project Idea: ${project.idea}\nLanguage: ${languageLabel}\n\nGenerate 5 highly specific questions tailored exactly to this project idea.`;
            
            const result = await provider.generate({
              systemPrompt,
              userPrompt,
              config: {
                model: selectedKey.model,
                temperature: 0.6,
                maxTokens: 4000,
                topP: 0.9,
              }
            }, {
              apiKey: selectedKey.apiKey,
              model: selectedKey.model,
              timeoutMs: 30000,
            });
            
            // Robust JSON extraction: strip markdown fences if present
            let content = result.content.trim();
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              content = jsonMatch[1].trim();
            } else {
              // Try to extract JSON array directly
              const arrayMatch = content.match(/\[[\s\S]*\]/);
              if (arrayMatch) {
                content = arrayMatch[0];
              }
            }
            
            const generated = JSON.parse(content);
            if (Array.isArray(generated) && generated.length > 0) {
              await rotationEngine.markKeySuccess(selectedKey.id);
              sendSuccess(res, generated);
              return;
            }
          }
        } catch (aiErr) {
          console.error('Dynamic question generation failed, falling back to static questions:', aiErr);
        }
      }
    }

    const fallbackQuestions = [
      {
        id: "fallback-1",
        question: "Ceritakan masalah utama yang ingin diselesaikan aplikasi ini. Siapa yang paling merasakan masalah itu?",
        type: "textarea",
        description: "Menggambarkan user persona dan pain point utama aplikasi"
      },
      {
        id: "fallback-2",
        question: "Apa satu aksi utama yang harus bisa dilakukan pengguna saat pertama kali membuka aplikasi ini?",
        type: "textarea",
        description: "Menentukan core value proposition dan first impression aplikasi"
      },
      {
        id: "fallback-3",
        question: "Fitur-fitur apa yang wajib ada di versi pertama aplikasi ini?",
        type: "checkbox",
        options: ["Autentikasi & manajemen akun", "Dashboard & laporan", "Notifikasi real-time", "Pencarian & filter data", "Integrasi pembayaran", "Export data (PDF/Excel)", "Chat / komunikasi", "API publik / integrasi pihak ketiga"],
        description: "Prioritas fitur untuk MVP (Minimum Viable Product)"
      },
      {
        id: "fallback-4",
        question: "Siapa saja tipe pengguna yang akan mengakses aplikasi ini?",
        type: "chips",
        options: ["End user / pelanggan", "Admin / operator", "Manajer / supervisor", "Tim internal perusahaan", "Mitra / vendor eksternal", "Guest / publik"],
        description: "Menentukan role dan hak akses dalam sistem"
      },
      {
        id: "fallback-5",
        question: "Platform apa yang menjadi target utama aplikasi ini?",
        type: "radio",
        options: ["Web browser (desktop)", "Mobile app (iOS & Android)", "Keduanya (web + mobile)", "Desktop app"],
        description: "Menentukan arsitektur teknis dan prioritas pengembangan"
      }
    ];

    sendSuccess(res, fallbackQuestions);
  } catch (err) { next(err); }
}
