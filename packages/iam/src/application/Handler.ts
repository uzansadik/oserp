export interface CommandHandler<TCommand, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}

export interface QueryHandler<TQuery, TResult> {
  execute(query: TQuery): Promise<TResult>;
}
