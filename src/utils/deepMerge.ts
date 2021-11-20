import { isObject } from "./isObject";

export function deepMerge(target: any, ...sources: any[]) {
  sources.forEach((source) => {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  });
  return target;
}