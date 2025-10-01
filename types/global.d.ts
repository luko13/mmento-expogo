// types/global.d.ts
export {};

declare global {
  // RN la expone cuando el engine Hermes está activo (no en debug remoto)
  const HermesInternal: any;
}
