export interface HandlerSchema<T> {
  safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: any }
  parse: (data: unknown) => T
}
