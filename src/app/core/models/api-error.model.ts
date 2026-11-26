/**
 * MODEL — Error payload returned by the mock back end.
 *
 * Business rules such as "the activity is full" or "the cut-off has passed" are
 * enforced on the server side and reported with HTTP 409 Conflict, so the
 * client only has to display the reason it is given.
 */
export interface ApiError {
  /** Machine-readable reason, e.g. `ACTIVITY_FULL`. */
  code: ApiErrorCode;
  /** Message shown to the user. */
  message: string;
}

export type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'NOT_FOUND'
  | 'ACTIVITY_FULL'
  | 'CUT_OFF_PASSED'
  | 'ALREADY_REGISTERED'
  | 'ACTIVITY_NOT_PUBLISHED'
  | 'NOT_REGISTERED'
  | 'ALREADY_CHECKED_IN'
  | 'INVALID_QR_TOKEN'
  | 'BAD_REQUEST';
