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
    console.log(`[API Response] status=${statusCode}, message="${message}", data=`, JSON.stringify(data).substring(0, 250));
  }
}
