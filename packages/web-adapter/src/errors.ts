export class WebAdapterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WebAdapterError";
  }
}

export class ApiUnavailableError extends WebAdapterError {
  statusCode?: number;

  constructor(
    message: string,
    options?: { cause?: Error; statusCode?: number },
  ) {
    super(message, { cause: options?.cause });
    this.name = "ApiUnavailableError";
    this.statusCode = options?.statusCode;
  }
}

export class NetworkError extends WebAdapterError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, { cause: options?.cause });
    this.name = "NetworkError";
  }
}