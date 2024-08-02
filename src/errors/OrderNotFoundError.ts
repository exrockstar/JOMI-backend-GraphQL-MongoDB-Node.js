export class OrderNotFoundError extends Error {
  /**
   *
   */
  constructor(message?: string) {
    super(message || "Order has been deleted");
  }
}
