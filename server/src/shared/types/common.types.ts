export interface RequestWithId extends Express.Request {
  requestId: string;
  userId?: string;
}
