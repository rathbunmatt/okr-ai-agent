import { Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import { OKRSet, KeyResult, OKRMetadata, KeyResultMetadata, DatabaseResult } from '../types/database';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export class OKRRepository {
  constructor(private db: Database) {}

  async createOKRSet(
    sessionId: string,
    objective: string,
    keyResults: Array<{ text: string; metadata?: KeyResultMetadata }>,
    metadata?: OKRMetadata
  ): Promise<DatabaseResult<{ okrSet: OKRSet; keyResults: KeyResult[] }>> {
    try {
      const okrSetId = uuidv4();
      const now = new Date().toISOString();

      // Create OKR Set
      const okrSet: OKRSet = {
        id: okrSetId,
        session_id: sessionId,
        objective,
        objective_score: metadata?.quality_breakdown
          ? Math.round(
              (metadata.quality_breakdown.clarity +
                metadata.quality_breakdown.measurability +
                metadata.quality_breakdown.achievability +
                metadata.quality_breakdown.relevance +
                metadata.quality_breakdown.time_bound) /
                5
            )
          : 0,
        created_at: now,
        updated_at: now,
        metadata: metadata || null,
      };

      await this.db.run(
        `INSERT INTO okr_sets (id, session_id, objective, objective_score, created_at, updated_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          okrSet.id,
          okrSet.session_id,
          okrSet.objective,
          okrSet.objective_score,
          okrSet.created_at,
          okrSet.updated_at,
          okrSet.metadata ? JSON.stringify(okrSet.metadata) : null,
        ]
      );

      // Create Key Results
      const createdKeyResults: KeyResult[] = [];
      for (let i = 0; i < keyResults.length; i++) {
        const kr = keyResults[i];
        const result = await this.db.run(
          `INSERT INTO key_results (okr_set_id, text, score, order_index, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [
            okrSetId,
            kr.text,
            0, // Initial score
            i,
            kr.metadata ? JSON.stringify(kr.metadata) : null,
          ]
        );

        createdKeyResults.push({
          id: result.lastID!,
          okr_set_id: okrSetId,
          text: kr.text,
          score: 0,
          order_index: i,
          created_at: now,
          metadata: kr.metadata || null,
        });
      }

      logger.info('OKR Set created', { okrSetId, sessionId, keyResultsCount: keyResults.length });
      return { success: true, data: { okrSet, keyResults: createdKeyResults } };
    } catch (error) {
      logger.error('Failed to create OKR set', { error: getErrorMessage(error), sessionId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getOKRSetById(okrSetId: string): Promise<DatabaseResult<{ okrSet: OKRSet; keyResults: KeyResult[] }>> {
    try {
      // Get OKR Set
      const okrRow = await this.db.get('SELECT * FROM okr_sets WHERE id = ?', [okrSetId]);

      if (!okrRow) {
        return { success: false, error: 'OKR Set not found' };
      }

      const okrSet: OKRSet = {
        ...okrRow,
        metadata: okrRow.metadata ? JSON.parse(okrRow.metadata) : null,
      };

      // Get Key Results
      const krRows = await this.db.all(
        'SELECT * FROM key_results WHERE okr_set_id = ? ORDER BY order_index ASC',
        [okrSetId]
      );

      const keyResults: KeyResult[] = krRows.map((row) => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));

      return { success: true, data: { okrSet, keyResults } };
    } catch (error) {
      logger.error('Failed to get OKR set', { error: getErrorMessage(error), okrSetId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getOKRSetsBySession(sessionId: string): Promise<DatabaseResult<Array<{ okrSet: OKRSet; keyResults: KeyResult[] }>>> {
    try {
      const okrRows = await this.db.all(
        'SELECT * FROM okr_sets WHERE session_id = ? ORDER BY created_at DESC',
        [sessionId]
      );

      const results: Array<{ okrSet: OKRSet; keyResults: KeyResult[] }> = [];

      for (const okrRow of okrRows) {
        const okrSet: OKRSet = {
          ...okrRow,
          metadata: okrRow.metadata ? JSON.parse(okrRow.metadata) : null,
        };

        const krRows = await this.db.all(
          'SELECT * FROM key_results WHERE okr_set_id = ? ORDER BY order_index ASC',
          [okrRow.id]
        );

        const keyResults: KeyResult[] = krRows.map((row) => ({
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : null,
        }));

        results.push({ okrSet, keyResults });
      }

      return { success: true, data: results };
    } catch (error) {
      logger.error('Failed to get OKR sets by session', { error: getErrorMessage(error), sessionId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async updateOKRSet(
    okrSetId: string,
    updates: {
      objective?: string;
      objective_score?: number;
      metadata?: OKRMetadata;
    }
  ): Promise<DatabaseResult<OKRSet>> {
    try {
      const currentResult = await this.getOKRSetById(okrSetId);
      if (!currentResult.success) {
        return { success: false, error: currentResult.error };
      }

      const current = currentResult.data!.okrSet;
      const updatedMetadata = updates.metadata ? { ...current.metadata, ...updates.metadata } : current.metadata;

      await this.db.run(
        `UPDATE okr_sets
         SET objective = COALESCE(?, objective),
             objective_score = COALESCE(?, objective_score),
             metadata = COALESCE(?, metadata),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          updates.objective,
          updates.objective_score,
          updatedMetadata ? JSON.stringify(updatedMetadata) : null,
          okrSetId,
        ]
      );

      const result = await this.getOKRSetById(okrSetId);
      if (result.success) {
        logger.info('OKR Set updated', { okrSetId });
        return { success: true, data: result.data!.okrSet };
      }
      return { success: false, error: 'Failed to retrieve updated OKR set' };
    } catch (error) {
      logger.error('Failed to update OKR set', { error: getErrorMessage(error), okrSetId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async updateKeyResult(
    keyResultId: number,
    updates: {
      text?: string;
      score?: number;
      metadata?: KeyResultMetadata;
    }
  ): Promise<DatabaseResult<KeyResult>> {
    try {
      const currentRow = await this.db.get('SELECT * FROM key_results WHERE id = ?', [keyResultId]);
      if (!currentRow) {
        return { success: false, error: 'Key Result not found' };
      }

      const currentMetadata = currentRow.metadata ? JSON.parse(currentRow.metadata) : {};
      const updatedMetadata = updates.metadata ? { ...currentMetadata, ...updates.metadata } : currentMetadata;

      await this.db.run(
        `UPDATE key_results
         SET text = COALESCE(?, text),
             score = COALESCE(?, score),
             metadata = COALESCE(?, metadata)
         WHERE id = ?`,
        [
          updates.text,
          updates.score,
          Object.keys(updatedMetadata).length > 0 ? JSON.stringify(updatedMetadata) : null,
          keyResultId,
        ]
      );

      const updatedRow = await this.db.get('SELECT * FROM key_results WHERE id = ?', [keyResultId]);
      const keyResult: KeyResult = {
        ...updatedRow,
        metadata: updatedRow.metadata ? JSON.parse(updatedRow.metadata) : null,
      };

      logger.info('Key Result updated', { keyResultId });
      return { success: true, data: keyResult };
    } catch (error) {
      logger.error('Failed to update key result', { error: getErrorMessage(error), keyResultId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async deleteOKRSet(okrSetId: string): Promise<DatabaseResult<boolean>> {
    try {
      // Delete key results first (cascading should handle this, but being explicit)
      await this.db.run('DELETE FROM key_results WHERE okr_set_id = ?', [okrSetId]);

      // Delete OKR set
      const result = await this.db.run('DELETE FROM okr_sets WHERE id = ?', [okrSetId]);

      if (result.changes === 0) {
        return { success: false, error: 'OKR Set not found' };
      }

      logger.info('OKR Set deleted', { okrSetId });
      return { success: true, data: true };
    } catch (error) {
      logger.error('Failed to delete OKR set', { error: getErrorMessage(error), okrSetId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getOKRStats(): Promise<DatabaseResult<any>> {
    try {
      const stats = await this.db.get(`
        SELECT
          COUNT(DISTINCT okr_sets.id) as total_okr_sets,
          COUNT(key_results.id) as total_key_results,
          AVG(okr_sets.objective_score) as avg_objective_score,
          AVG(key_results.score) as avg_key_result_score,
          COUNT(CASE WHEN okr_sets.objective_score >= 80 THEN 1 END) as high_quality_okrs,
          COUNT(CASE WHEN okr_sets.created_at > datetime('now', '-7 days') THEN 1 END) as recent_okrs
        FROM okr_sets
        LEFT JOIN key_results ON okr_sets.id = key_results.okr_set_id
      `);

      return { success: true, data: stats };
    } catch (error) {
      logger.error('Failed to get OKR stats', { error: getErrorMessage(error) });
      return { success: false, error: getErrorMessage(error) };
    }
  }
}