import { TechnologyRepository } from './technology.repository';
import { NotFoundError } from '../../errors/domain-errors';
import { parsePagination, calcTotalPages } from '../../shared/utils/pagination.util';
import type { PaginatedResult } from '../../shared/types/api-response.types';
import type { Technology, NewTechnology } from './technology.repository';

export class TechnologyService {
  private repo: TechnologyRepository;

  constructor() {
    this.repo = new TechnologyRepository();
  }

  async list(query: Record<string, unknown>): Promise<PaginatedResult<Technology>> {
    const pagination = parsePagination(query);
    const category = typeof query.category === 'string' ? query.category : undefined;
    const search = typeof query.search === 'string' ? query.search : undefined;
    const activeOnly = query.active === 'true';

    const { items, total } = await this.repo.findAll({ ...pagination, category, search, activeOnly });

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: calcTotalPages(total, pagination.limit),
    };
  }

  async listActive(): Promise<Technology[]> {
    return this.repo.findActive();
  }

  async getById(id: string): Promise<Technology> {
    const tech = await this.repo.findById(id);
    if (!tech) throw new NotFoundError('Technology');
    return tech;
  }

  async getCategories(): Promise<string[]> {
    return this.repo.findCategories();
  }

  async create(data: NewTechnology): Promise<Technology> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<NewTechnology>): Promise<Technology> {
    const tech = await this.repo.update(id, data);
    if (!tech) throw new NotFoundError('Technology');
    return tech;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('Technology');
  }

  async toggleActive(id: string, isActive: boolean): Promise<Technology> {
    const tech = await this.repo.toggleActive(id, isActive);
    if (!tech) throw new NotFoundError('Technology');
    return tech;
  }
}
