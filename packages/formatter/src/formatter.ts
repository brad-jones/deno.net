export interface IFormatter {
  fmt(srcCode: string): Promise<string>;
}
