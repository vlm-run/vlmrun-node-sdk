/**
 * VLM Run API Evaluations resource.
 */

import { Client, APIRequestor } from "./base_requestor";
import {
  EvaluationRunResponse,
  EvaluationRunListResponse,
  EvaluationPreviewResponse,
  EvaluationMetricsResponse,
  EvaluationSummaryStatsResponse,
  EvaluationUniqueSourcesResponse,
  EvaluationSourceType,
} from "./types";

export class Evaluations {
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  /**
   * List evaluation runs with pagination and filtering.
   *
   * @param options - Query options for listing evaluation runs
   * @returns Paginated list of evaluation runs
   */
  async list(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    descending?: boolean;
    createdAtGte?: string;
    createdAtLte?: string;
  }): Promise<EvaluationRunListResponse> {
    const params: Record<string, any> = {
      limit: options?.limit ?? 30,
      offset: options?.offset ?? 0,
      order_by: options?.orderBy ?? "created_at",
      descending: options?.descending ?? true,
    };
    if (options?.createdAtGte) params.created_at__gte = options.createdAtGte;
    if (options?.createdAtLte) params.created_at__lte = options.createdAtLte;

    const [response] =
      await this.requestor.request<EvaluationRunListResponse>(
        "GET",
        "evaluations",
        params
      );
    return response;
  }

  /**
   * Get a specific evaluation run by ID.
   *
   * @param runId - The evaluation run ID
   * @returns The evaluation run details
   */
  async get(runId: string): Promise<EvaluationRunResponse> {
    const [response] = await this.requestor.request<EvaluationRunResponse>(
      "GET",
      `evaluations/${runId}`
    );
    return response;
  }

  /**
   * Get a preview of available data for an evaluation source.
   *
   * @param options - Preview query parameters
   * @returns Preview of available evaluation data
   */
  async preview(options: {
    sourceType: EvaluationSourceType;
    sourceId: string;
    dataFrom?: string;
    dataTo?: string;
  }): Promise<EvaluationPreviewResponse> {
    const params: Record<string, string> = {
      source_type: options.sourceType,
      source_id: options.sourceId,
    };
    if (options.dataFrom) params.data_from = options.dataFrom;
    if (options.dataTo) params.data_to = options.dataTo;

    const [response] =
      await this.requestor.request<EvaluationPreviewResponse>(
        "GET",
        "evaluations/preview",
        params
      );
    return response;
  }

  /**
   * Get aggregated metrics across evaluation runs.
   *
   * @param options - Metrics query parameters
   * @returns Aggregated evaluation metrics
   */
  async metrics(options?: {
    limit?: number;
    sourceType?: string;
    sourceLabel?: string;
  }): Promise<EvaluationMetricsResponse> {
    const params: Record<string, any> = { limit: options?.limit ?? 20 };
    if (options?.sourceType) params.source_type = options.sourceType;
    if (options?.sourceLabel) params.source_label = options.sourceLabel;

    const [response] =
      await this.requestor.request<EvaluationMetricsResponse>(
        "GET",
        "evaluations/metrics",
        params
      );
    return response;
  }

  /**
   * Get summary statistics for evaluation runs.
   *
   * @returns Summary stats including total runs and source type counts
   */
  async summaryStats(): Promise<EvaluationSummaryStatsResponse> {
    const [response] =
      await this.requestor.request<EvaluationSummaryStatsResponse>(
        "GET",
        "evaluations/summary-stats"
      );
    return response;
  }

  /**
   * Get unique evaluation sources for filtering.
   *
   * @returns Unique (type, label) pairs
   */
  async uniqueSources(): Promise<EvaluationUniqueSourcesResponse> {
    const [response] =
      await this.requestor.request<EvaluationUniqueSourcesResponse>(
        "GET",
        "evaluations/unique-sources"
      );
    return response;
  }

  /**
   * Delete an evaluation run.
   *
   * @param runId - The evaluation run ID to delete
   */
  async delete(runId: string): Promise<void> {
    await this.requestor.request("DELETE", `evaluations/${runId}`);
  }

}
