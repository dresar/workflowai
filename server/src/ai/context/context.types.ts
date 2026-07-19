export interface ProjectContext {
  project: {
    id: string;
    name: string;
    idea: string;
    description: string | null;
    language: string;
    preferredAiTarget: string | null;
    techSelectionMode: string;
    status: string;
  };
  technologies: Array<{ category: string; technologyName: string; isAiSelected: boolean }>;
  interviewAnswers: Array<{ questionId: string; question?: string; answer: unknown }>;
  canvasFeatures: Array<{ name: string; phase: string; subs: string[] }>;
  existingDocuments: Partial<Record<string, string>>;
  recentGenerations: Array<{ type: string; version: number; createdAt: Date }>;
}
