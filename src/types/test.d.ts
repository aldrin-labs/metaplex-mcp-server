import '@types/jest';

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchSchema: (schema: any) => R;
    }
  }
}
