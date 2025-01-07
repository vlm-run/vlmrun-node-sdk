// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

/**
 * Base prediction response for all API responses.
 */
export interface PredictionResponse {
  /**
   * Unique identifier of the response.
   */
  id?: string;

  /**
   * Date and time when the response was completed (in UTC timezone)
   */
  completed_at?: string | null;

  /**
   * Date and time when the request was created (in UTC timezone)
   */
  created_at?: string;

  /**
   * The response from the model.
   */
  response?: unknown;

  /**
   * The status of the job.
   */
  status?: string;
}
