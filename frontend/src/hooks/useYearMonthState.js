import { useState } from "react";

const currentYearMonth = () => new Date().toISOString().slice(0, 7);

/** `<input type="month" />` 用 YYYY-MM 状態 */
export function useYearMonthState() {
  return useState(currentYearMonth);
}
