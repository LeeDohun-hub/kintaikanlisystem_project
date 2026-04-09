import { useState } from "react";

const currentYearMonth = () => new Date().toISOString().slice(0, 7);

/** `<input type="month" />` 용 YYYY-MM 상태 */
export function useYearMonthState() {
  return useState(currentYearMonth);
}
