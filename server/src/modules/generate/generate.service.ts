import { AIOrchestrator } from '../../ai/orchestrator/ai-orchestrator';
import { ProjectRepository } from '../project/project.repository';
import { NotFoundError } from '../../errors/domain-errors';
import type { GenerateType } from '../../shared/constants/app.constants';

const orchestrator = new AIOrchestrator();
const projectRepo = new ProjectRepository();

const STATUS_MAP: Partial<Record<GenerateType, typeof import('../../database/schema/projects.schema').projectStatusEnum.enumValues[number]>> = {
  prd: 'prd',
  architecture: 'architecture',
  database: 'database',
  api: 'api',
  tasks: 'tasks',
  prompt: 'prompt',
};

export class GenerateService {
  async generate(
    projectId: string,
    generateType: GenerateType,
    preferredProvider?: string,
    revisionInstructions?: string,
  ): Promise<{ content: string; provider: string; model: string; tokens: number; latencyMs: number }> {
    const project = await projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project');

    const result = await orchestrator.execute(projectId, generateType, preferredProvider, revisionInstructions);

    await projectRepo.saveDocument({
      projectId,
      type: generateType as typeof import('../../database/schema/generated-documents.schema').documentTypeEnum.enumValues[number],
      content: result.content,
      providerUsed: result.provider,
      modelUsed: result.model,
      tokensUsed: result.totalTokens,
      generationTimeMs: result.latencyMs,
    });

    const newStatus = STATUS_MAP[generateType];
    if (newStatus) {
      await projectRepo.update(projectId, { status: newStatus });
    }

    return {
      content: result.content,
      provider: result.provider,
      model: result.model,
      tokens: result.totalTokens,
      latencyMs: result.latencyMs,
    };
  }

  async generatePRD(projectId: string, preferredProvider?: string) {
    return this.generate(projectId, 'prd', preferredProvider);
  }

  async generateArchitecture(projectId: string, preferredProvider?: string) {
    return this.generate(projectId, 'architecture', preferredProvider);
  }

  async generateDatabase(projectId: string, preferredProvider?: string) {
    return this.generate(projectId, 'database', preferredProvider);
  }

  async generateAPI(projectId: string, preferredProvider?: string) {
    return this.generate(projectId, 'api', preferredProvider);
  }

  async generateTasks(projectId: string, preferredProvider?: string) {
    return this.generate(projectId, 'tasks', preferredProvider);
  }

  async generatePrompt(projectId: string, preferredProvider?: string) {
    return this.generate(projectId, 'prompt', preferredProvider);
  }

  async generateCanvas(projectId: string, preferredProvider?: string, revisionInstructions?: string) {
    if (revisionInstructions) {
      await projectRepo.deleteDocuments(projectId);
    }
    return this.generate(projectId, 'canvas', preferredProvider, revisionInstructions);
  }
}
