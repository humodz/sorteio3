interface HttpExceptionOptions {
  status?: number;
  message?: string;
  response?: any;
}

export class HttpException extends Error {
  status: number;
  response: any;

  constructor({ status = 500, message = 'Internal Server Error', response }: HttpExceptionOptions = {}) {
    super(message);
    this.status = status;
    this.response = response;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  static isHttp(err: any): err is HttpException {
    return err && typeof err.getResponse === 'function' && typeof err.getStatus === 'function';
  }

  getResponse() {
    return this.response || {
      status: this.status,
      message: this.message,
    };
  }

  getStatus() {
    return this.status;
  }
}
