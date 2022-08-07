export type Require<T, K extends keyof T> = Omit<T, K> & Pick<T, K>;
