import { ValueTransformer } from "typeorm";

/**
 * Postgres BIGINT ↔ JS string
 * 雪花 ID 超过 Number 安全整数范围，必须用字符串，否则会丢精度。
 */
export const bigintTransformer: ValueTransformer = {
  to: (value: unknown): unknown => value, // 写入：原样交给驱动
  from: (value: unknown): string | null | undefined => {
    if (value == null) return value;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "bigint"
    ) {
      return String(value);
    }
    throw new TypeError(`Unexpected BIGINT value type: ${typeof value}`);
  },
};
