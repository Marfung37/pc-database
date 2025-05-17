export type Result<T> = Promise<
  | {data: T, error: null}
  | {data: null, error: Error}>
