export class ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;

  constructor(statusCode: number, data: T, message: string = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    // NOTE: do not log `data` here. This constructor wraps every admin
    // response, including customer listings and user records, so a debug dump
    // at this point writes PII to stdout on every request.
  }
}
