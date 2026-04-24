/** "HH:mm" or "HH:mm:ss" → minutes from midnight */
export function timeStrToMinutes(t) {
  if (t == null || String(t).trim() === "") return null;
  const s = String(t).trim().slice(0, 8);
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return NaN;
  return h * 60 + min;
}

/**
 * 外出が始業・終業の範囲内か、2時間超なら終業＝外出終了（退勤扱い）か。
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateOutingVsWork({ workStart, workEnd, outingStart, outingEnd }) {
  const ws = timeStrToMinutes(workStart);
  const we = timeStrToMinutes(workEnd);
  if (ws == null || we == null || Number.isNaN(ws) || Number.isNaN(we) || !(ws < we)) {
    return { ok: true };
  }

  const osRaw = outingStart != null && String(outingStart).trim() !== "" ? String(outingStart).trim() : "";
  const oeRaw = outingEnd != null && String(outingEnd).trim() !== "" ? String(outingEnd).trim() : "";

  if (!osRaw && !oeRaw) return { ok: true };
  if (!osRaw && oeRaw) {
    return { ok: false, message: "外出開始を入力するか、外出終了を空にしてください。" };
  }

  const os = timeStrToMinutes(osRaw);
  const oe = oeRaw ? timeStrToMinutes(oeRaw) : null;
  if (Number.isNaN(os)) {
    return { ok: false, message: "外出開始の時刻形式が正しくありません。" };
  }

  if (oeRaw === "") {
    if (os < ws || os >= we) {
      return { ok: false, message: "外出開始は勤務開始より後かつ勤務終了より前である必要があります。" };
    }
    return { ok: true };
  }

  if (Number.isNaN(oe)) {
    return { ok: false, message: "外出終了の時刻形式が正しくありません。" };
  }
  if (!(os < oe)) {
    return { ok: false, message: "外出開始は外出終了より前である必要があります。" };
  }
  if (os < ws || oe > we) {
    return { ok: false, message: "外出時間は始業・終業の範囲内で入力してください。" };
  }
  const dur = oe - os;
  if (dur > 120 && oe !== we) {
    return {
      ok: false,
      message:
        "外出が2時間を超える場合は、終業時刻を外出復帰と同じ時刻にしてください（退勤扱い）。",
    };
  }
  return { ok: true };
}
