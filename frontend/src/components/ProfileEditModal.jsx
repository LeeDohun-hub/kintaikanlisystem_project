import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import api from "../api/api";
import TotpSection from "./TotpSection";

const GENDER_OPTIONS = [
  { value: "", label: "未選択" },
  { value: "男性", label: "男性" },
  { value: "女性", label: "女性" },
  { value: "その他", label: "その他" },
];

export default function ProfileEditModal({ open, onClose, onPhotoUpdated, employeeId }) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [readonly, setReadonly] = useState({ employeeCode: "", employeeName: "", department: "" });
  const [form, setForm] = useState({
    address: "",
    phoneNumber: "",
    birthDate: "",
    gender: "",
  });
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoCacheBust, setPhotoCacheBust] = useState(() => Date.now());
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoClearing, setPhotoClearing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef(null);

  const photoPickPreviewUrl = useMemo(() => {
    if (!photoFile) return null;
    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (photoPickPreviewUrl) URL.revokeObjectURL(photoPickPreviewUrl);
    };
  }, [photoPickPreviewUrl]);

  const loadProfile = useCallback(() => {
    setLoading(true);
    setLoadError("");
    setProfileMsg("");
    setProfileErr("");
    api
      .get("/employees/me/profile")
      .then((res) => {
        const d = res.data || {};
        setReadonly({
          employeeCode: d.employeeCode ?? "",
          employeeName: d.employeeName ?? "",
          department: d.department ?? "",
        });
        setForm({
          address: d.address ?? "",
          phoneNumber: d.phoneNumber ?? "",
          birthDate: d.birthDate ?? "",
          gender: d.gender ?? "",
        });
        setHasPhoto(Boolean(d.hasPhoto));
        setPhotoCacheBust(Date.now());
      })
      .catch((err) => {
        setLoadError(err.response?.data?.error || "プロフィールを読み込めませんでした。");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    setProfileMsg("");
    setProfileErr("");
    loadProfile();
    setPhotoFile(null);
    setPhotoError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  }, [open, loadProfile]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    setSavingProfile(true);
    try {
      await api.patch("/employees/me/profile", {
        address: form.address.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
        birthDate: form.birthDate || null,
        gender: form.gender || null,
      });
      setProfileMsg("個人情報を保存しました。");
      loadProfile();
    } catch (err) {
      setProfileErr(err.response?.data?.error || "保存に失敗しました。");
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return;
    setPhotoUploading(true);
    setPhotoError("");
    try {
      const fd = new FormData();
      fd.append("file", photoFile);
      await api.post("/employees/me/photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      setHasPhoto(true);
      setPhotoCacheBust(Date.now());
      onPhotoUpdated?.();
      setProfileMsg("写真を更新しました。");
    } catch (err) {
      setPhotoError(err.response?.data?.error || "アップロードに失敗しました。");
    } finally {
      setPhotoUploading(false);
    }
  };

  const clearPhotoToDefault = async () => {
    if (!hasPhoto) return;
    if (!window.confirm("プロフィール写真を削除し、デフォルトのアイコン表示に戻しますか？")) return;
    setPhotoClearing(true);
    setPhotoError("");
    try {
      const { data } = await api.delete("/employees/me/photo");
      setHasPhoto(false);
      setPhotoCacheBust(Date.now());
      setPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      onPhotoUpdated?.();
      setProfileMsg(data?.message || "写真をデフォルト表示に戻しました。");
      loadProfile();
    } catch (err) {
      setPhotoError(err.response?.data?.error || "削除に失敗しました。");
    } finally {
      setPhotoClearing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="layout-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="card layout-modal-card layout-modal-card--profile"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <h3 id="profile-modal-title" className="layout-modal-title">
          プロフィール編集
        </h3>
        <p className="layout-modal-lead">
          プロフィール写真の変更と、ご本人の個人情報（住所・連絡先など）を編集できます。
        </p>

        {loadError && <div className="layout-modal-error">{loadError}</div>}
        {(profileMsg || profileErr) && (
          <div
            className={profileErr ? "layout-modal-error" : "layout-modal-success"}
            style={{ marginBottom: 12 }}
          >
            {profileErr || profileMsg}
          </div>
        )}

        {loading ? (
          <div className="layout-modal-loading">読み込み中…</div>
        ) : (
          <>
            <section className="profile-modal-section">
              <h4 className="profile-modal-section-title">プロフィール写真</h4>
              {photoError && <div className="layout-modal-error" style={{ marginBottom: 8 }}>{photoError}</div>}
              <p className="layout-modal-hint">JPEG・PNG・GIF・WebP、5MB以下</p>

              <div className="profile-photo-preview-row">
                {hasPhoto && employeeId ? (
                  <img
                    src={`/api/employees/${employeeId}/photo?v=${photoCacheBust}`}
                    alt="現在のプロフィール写真"
                    className="layout-modal-preview"
                    onError={() => setHasPhoto(false)}
                  />
                ) : (
                  <div className="profile-photo-default-avatar" aria-hidden="true">
                    <span className="profile-photo-default-avatar-icon">{"\u{1F464}"}</span>
                    <span className="profile-photo-default-avatar-label">デフォルト</span>
                  </div>
                )}
              </div>

              <div className="profile-photo-file-row">
                <input
                  ref={photoInputRef}
                  id="profile-photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  className="profile-photo-input-hidden"
                />
                <label htmlFor="profile-photo-input" className="secondary profile-photo-file-btn">
                  ファイルを選択
                </label>
                <span className="profile-photo-file-name" title={photoFile?.name || ""}>
                  {photoFile ? photoFile.name : "選択されていません"}
                </span>
              </div>

              {photoPickPreviewUrl && (
                <div className="layout-modal-preview-wrap">
                  <img src={photoPickPreviewUrl} alt="選択中のプレビュー" className="layout-modal-preview" />
                </div>
              )}

              <div className="profile-photo-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={!photoFile || photoUploading || photoClearing}
                  onClick={uploadPhoto}
                >
                  {photoUploading ? "アップロード中…" : "写真をアップロード"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={!hasPhoto || photoUploading || photoClearing}
                  onClick={clearPhotoToDefault}
                >
                  {photoClearing ? "処理中…" : "デフォルト表示に戻す"}
                </button>
              </div>
            </section>

            <section className="profile-modal-section">
              <h4 className="profile-modal-section-title">個人情報</h4>
              <div className="profile-modal-readonly-grid">
                <div>
                  <span className="profile-modal-label">社員コード</span>
                  <div className="profile-modal-readonly-value">{readonly.employeeCode || "—"}</div>
                </div>
                <div>
                  <span className="profile-modal-label">氏名</span>
                  <div className="profile-modal-readonly-value">{readonly.employeeName || "—"}</div>
                </div>
                <div className="profile-modal-readonly-full">
                  <span className="profile-modal-label">所属</span>
                  <div className="profile-modal-readonly-value">{readonly.department || "—"}</div>
                </div>
              </div>

              <form onSubmit={saveProfile} className="profile-modal-form">
                <div className="profile-modal-field">
                  <label htmlFor="pf-birth">生年月日</label>
                  <input
                    id="pf-birth"
                    name="birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={onChange}
                  />
                </div>
                <div className="profile-modal-field">
                  <label htmlFor="pf-gender">性別</label>
                  <select id="pf-gender" name="gender" value={form.gender} onChange={onChange}>
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o.value || "empty"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="profile-modal-field profile-modal-field-full">
                  <label htmlFor="pf-address">住所</label>
                  <input
                    id="pf-address"
                    name="address"
                    type="text"
                    value={form.address}
                    onChange={onChange}
                    maxLength={200}
                    placeholder="都道府県から建物名まで"
                    autoComplete="street-address"
                  />
                </div>
                <div className="profile-modal-field">
                  <label htmlFor="pf-phone">電話番号</label>
                  <input
                    id="pf-phone"
                    name="phoneNumber"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={onChange}
                    maxLength={20}
                    placeholder="090-0000-0000"
                    autoComplete="tel"
                  />
                </div>
                <div className="layout-modal-actions profile-modal-form-actions">
                  <button type="submit" className="primary" disabled={savingProfile}>
                    {savingProfile ? "保存中…" : "個人情報を保存"}
                  </button>
                </div>
              </form>
            </section>

            <section className="profile-modal-section">
              <h4 className="profile-modal-section-title">2段階認証 (2FA)</h4>
              <TotpSection />
            </section>
          </>
        )}

        <div className="layout-modal-actions profile-modal-footer">
          <button type="button" className="secondary" onClick={onClose} disabled={photoUploading || savingProfile || photoClearing}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
