export class InvalidCredentialsError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid email or password");
  }
}
