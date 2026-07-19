import { ProjectRepository } from './project.repository';
import { NotFoundError } from '../../errors/domain-errors';
import type { CreateProjectDto, UpdateProjectDto, SaveTechnologiesDto, SaveAnswersDto, SaveCanvasDto, SaveDocumentDto } from './project.validation';
import { RotationEngine } from '../../ai/rotation/rotation-engine';
import { getProvider } from '../../ai/providers/provider.registry';

const repo = new ProjectRepository();

export class ProjectService {
  async create(dto: CreateProjectDto) {
    return repo.create({
      name: dto.name,
      idea: dto.idea,
      language: dto.language,
      preferredAiTarget: dto.preferredAiTarget,
      techSelectionMode: dto.techSelectionMode,
      status: 'draft',
    });
  }

  async list(params: { page: number; limit: number }) {
    return repo.findAll(params);
  }

  async getById(id: string) {
    const project = await repo.findById(id);
    if (!project) throw new NotFoundError('Project');
    return project;
  }

  async getFullProject(id: string) {
    const project = await repo.findById(id);
    if (!project) throw new NotFoundError('Project');

    const [technologies, answers, canvas, documents] = await Promise.all([
      repo.findTechnologies(id),
      repo.findAnswers(id),
      repo.findCanvas(id),
      repo.findDocuments(id),
    ]);

    return { ...project, technologies, answers, canvas, documents };
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await repo.update(id, dto);
    if (!project) throw new NotFoundError('Project');
    return project;
  }

  async remove(id: string): Promise<void> {
    const deleted = await repo.delete(id);
    if (!deleted) throw new NotFoundError('Project');
  }

  async saveTechnologies(projectId: string, dto: SaveTechnologiesDto) {
    await this.getById(projectId);
    const techs = dto.technologies.map((t) => ({ ...t, projectId }));
    return repo.saveTechnologies(projectId, techs);
  }

  async getTechnologies(projectId: string) {
    await this.getById(projectId);
    return repo.findTechnologies(projectId);
  }

  async saveAnswers(projectId: string, dto: SaveAnswersDto) {
    const project = await this.getById(projectId);
    const serialized = JSON.stringify(dto.answers);

    let autoName = project.name;
    try {
      const rotationEngine = new RotationEngine();
      const selectedKey = await rotationEngine.selectKey();
      const provider = getProvider(selectedKey.providerName);
      if (provider) {
        const languageLabel = project.language === 'id' ? 'Indonesian' : 'English';
        const systemPrompt = `You are a creative Product Manager. Generate a very brief, professional, catchy, and descriptive software project title (maximum 3-4 words) in ${languageLabel} based on the user's software idea and their answers.
Return ONLY the raw title without any extra text, quotes, or markdown code block.`;
        
        const userPrompt = `Project Idea: ${project.idea}\nDetailed Answers: ${serialized}`;
        const result = await provider.generate({
          systemPrompt,
          userPrompt,
          config: {
            model: selectedKey.model,
            temperature: 0.7,
            maxTokens: 50,
            topP: 0.9,
          }
        }, {
          apiKey: selectedKey.apiKey,
          model: selectedKey.model,
          timeoutMs: 10000,
        });

        const generatedTitle = result.content.replace(/["']/g, '').trim();
        if (generatedTitle && generatedTitle.length > 2 && generatedTitle.length < 50) {
          autoName = generatedTitle;
          await rotationEngine.markKeySuccess(selectedKey.id);
        }
      }
    } catch (err) {
      console.error('Failed to auto-generate project title:', err);
    }

    await repo.update(projectId, {
      name: autoName,
      description: serialized,
      status: 'interview',
    });

    return dto.answers;
  }

  async getAnswers(projectId: string) {
    const project = await this.getById(projectId);
    if (project.description) {
      try {
        const parsed = JSON.parse(project.description);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {}
    }
    return [];
  }

  async saveCanvas(projectId: string, dto: SaveCanvasDto) {
    await this.getById(projectId);
    const canvas = await repo.saveCanvas({ projectId, ...dto });
    await repo.update(projectId, { status: 'canvas' });
    return canvas;
  }

  async getCanvas(projectId: string) {
    await this.getById(projectId);
    return repo.findCanvas(projectId);
  }

  async getDocuments(projectId: string) {
    await this.getById(projectId);
    return repo.findDocuments(projectId);
  }

  async getDocumentByType(projectId: string, type: string) {
    await this.getById(projectId);
    const doc = await repo.findCurrentDocument(projectId, type);
    if (!doc) throw new NotFoundError(`${type} document`);
    return doc;
  }

  async getDocumentHistory(projectId: string, type: string) {
    await this.getById(projectId);
    return repo.findDocumentHistory(projectId, type);
  }

  async saveDocumentManual(projectId: string, type: string, dto: SaveDocumentDto) {
    await this.getById(projectId);

    const doc = await repo.saveDocument({
      projectId,
      type: type as any,
      content: dto.content,
      providerUsed: 'manual',
      modelUsed: 'manual',
      tokensUsed: 0,
      generationTimeMs: 0,
    });

    const statusMap: Record<string, string> = {
      prd: 'prd',
      architecture: 'architecture',
      database: 'database',
      api: 'api',
      tasks: 'tasks',
      prompt: 'prompt',
    };

    const newStatus = statusMap[type];
    if (newStatus) {
      await repo.update(projectId, { status: newStatus as any });
    }

    return doc;
  }
}
