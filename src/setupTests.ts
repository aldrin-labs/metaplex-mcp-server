import '@jest/globals';
import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchSchema: (schema: any) => R;
    }
  }
}
