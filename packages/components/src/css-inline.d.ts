/** Vite's `?inline` suffix: the processed stylesheet as a string instead of an emitted file. */
declare module "*.css?inline" {
  const css: string;
  export default css;
}
