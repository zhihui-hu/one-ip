declare module "fingerprintjs2" {
  const Fingerprint2: {
    VERSION: string;
    getPromise(
      options: Record<string, unknown>,
    ): Promise<{ key: string; value: unknown }[]>;
    x64hash128(value: string, seed: number): string;
  };
  export default Fingerprint2;
}
