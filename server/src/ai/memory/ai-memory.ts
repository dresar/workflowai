/**
 * AI Memory System
 *
 * Menyimpan konteks draft dan progress setiap generate request per project.
 * Digunakan untuk memastikan AI kedua dapat melanjutkan dari titik yang benar
 * ketika AI pertama gagal karena rate limit atau error.
 */

interface MemoryEntry {
  projectId: string;
  generateType: string;
  primaryProvider: string;
  primaryDraft: string;
  primaryDraftTokens: number;
  lastSection?: string;
  savedAt: number;
  attempts: number;
  contextSummary?: string;
}

const MEMORY_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_DRAFT_LENGTH = 20000; // characters stored in memory

class AIMemoryStore {
  private store = new Map<string, MemoryEntry>();

  private key(projectId: string, generateType: string): string {
    return `${projectId}::${generateType}`;
  }

  /**
   * Save a draft from the primary AI into memory so the collaborator can continue from it.
   */
  save(entry: Omit<MemoryEntry, 'savedAt'>): void {
    const memKey = this.key(entry.projectId, entry.generateType);
    const truncatedDraft = entry.primaryDraft.length > MAX_DRAFT_LENGTH
      ? entry.primaryDraft.slice(0, MAX_DRAFT_LENGTH) + '\n\n[DRAFT TRUNCATED - CONTINUE FROM HERE]'
      : entry.primaryDraft;

    this.store.set(memKey, {
      ...entry,
      primaryDraft: truncatedDraft,
      savedAt: Date.now(),
    });
  }

  /**
   * Retrieve memory for a given project + generateType combination.
   * Returns null if no memory found or memory has expired.
   */
  get(projectId: string, generateType: string): MemoryEntry | null {
    const memKey = this.key(projectId, generateType);
    const entry = this.store.get(memKey);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.savedAt > MEMORY_TTL_MS) {
      this.store.delete(memKey);
      return null;
    }

    return entry;
  }

  /**
   * Increment the attempt counter so we know how many times we've tried.
   */
  incrementAttempts(projectId: string, generateType: string): void {
    const memKey = this.key(projectId, generateType);
    const entry = this.store.get(memKey);
    if (entry) {
      entry.attempts += 1;
      entry.savedAt = Date.now(); // refresh TTL
    }
  }

  /**
   * Clear memory for a successful completion.
   */
  clear(projectId: string, generateType: string): void {
    const memKey = this.key(projectId, generateType);
    this.store.delete(memKey);
  }

  /**
   * Build a context injection string that the handoff AI can use to continue.
   */
  buildContextInjection(entry: MemoryEntry): string {
    const lines: string[] = [
      '=== AI MEMORY CONTEXT ===',
      `This is attempt #${entry.attempts + 1} for project: ${entry.projectId}`,
      `Primary AI (${entry.primaryProvider}) generated a partial draft before failing.`,
      `You are taking over as the collaborator AI. Continue and complete the work below.`,
      '',
      '--- DRAFT FROM PRIMARY AI (expand and complete this): ---',
      entry.primaryDraft,
      '',
    ];

    if (entry.lastSection) {
      lines.push(`--- LAST COMPLETED SECTION: ${entry.lastSection} ---`);
      lines.push('Continue from the NEXT section after the above.');
      lines.push('');
    }

    lines.push('=== END OF MEMORY CONTEXT ===');
    lines.push('Now complete the full document/response as instructed, building upon the draft above.');

    return lines.join('\n');
  }

  /**
   * Detect if content appears to be incomplete (useful to decide when to save memory)
   */
  isLikelyIncomplete(content: string, generateType: string): boolean {
    if (!content || content.length < 100) return true;

    if (generateType === 'canvas') {
      // For canvas, check if JSON array is complete
      try {
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        JSON.parse(cleaned);
        return false; // Valid JSON = complete
      } catch {
        return true;
      }
    }

    // For text documents: check if there's a reasonable ending
    const trimmed = content.trim();
    const lastChar = trimmed[trimmed.length - 1];
    if (['.', '!', '?', '}', ']', ';'].includes(lastChar)) return false;

    return trimmed.length < 500;
  }
}

// Singleton instance
export const aiMemory = new AIMemoryStore();
