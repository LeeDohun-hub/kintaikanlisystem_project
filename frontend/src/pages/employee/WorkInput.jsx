import React, { useState } from 'react'
import api from '../../api/api'
import { useAuth } from '../../context/AuthContext'

function WorkInput() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    workDate: today,
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60
  })
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess('')
    setError('')
    try {
      await api.post('/worktime', {
        workDate: form.workDate,
        startTime: form.startTime,
        endTime: form.endTime,
        breakMinutes: parseInt(form.breakMinutes, 10) || 0
      })
      setSuccess('근무 정보가 저장되었습니다.')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleImport = async (e) => {
    e.preventDefault()
    setImportError('')
    setImportResult(null)
    if (!importFile) {
      setImportError('가져올 파일을 선택하세요.')
      return
    }
    setImportLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      const res = await api.post('/attendance/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImportResult(res.data)
    } catch (err) {
      const msg = err.response?.data?.error || '가져오기에 실패했습니다.'
      setImportError(typeof msg === 'string' ? msg : '가져오기에 실패했습니다.')
    } finally {
      setImportLoading(false)
    }
  }

  const calcWorkHours = () => {
    if (!form.startTime || !form.endTime) return '0.0'
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh, em] = form.endTime.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm) - (parseInt(form.breakMinutes, 10) || 0)
    return Math.max(0, mins / 60).toFixed(1)
  }

  return (
    <div className="page-container">
      <h2 className="page-title">근무 입력</h2>

      {success && <div className="success-msg">{success}</div>}
      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>근무일 *</label>
              <input type="date" name="workDate" value={form.workDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>시작 시간 *</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>종료 시간 *</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>휴식 시간 (분) *</label>
              <input type="number" name="breakMinutes" value={form.breakMinutes} onChange={handleChange} min="0" max="480" required />
            </div>
          </div>

          <div style={{ marginBottom: 16, padding: 12, background: '#ebf5fb', borderRadius: 6 }}>
            <strong>순 근무 시간(참고):</strong> {calcWorkHours()} 시간
          </div>

          <button type="submit" className="primary">저장</button>
        </form>
      </div>

      {user?.role === 'ADMIN' && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>CSV/Excel Import (관리자)</h3>
          {importError && <div className="error-msg">{importError}</div>}
          <form onSubmit={handleImport}>
            <div className="form-row">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                required
              />
              <button type="submit" className="primary" disabled={importLoading}>
                {importLoading ? '처리 중…' : '가져오기'}
              </button>
            </div>
            <p style={{ marginTop: 10, fontSize: 13, color: '#666' }}>
              CSV/XLSX 포맷: 社員ID, 勤務日, 開始時刻, 終了時刻, 休憩(分) (1행 헤더)
            </p>
          </form>
          {importResult && (
            <div style={{ marginTop: 12, fontSize: 13 }}>
              <div><strong>성공:</strong> {importResult.successCount} / <strong>실패:</strong> {importResult.errorCount}</div>
              {importResult.errors?.length > 0 && (
                <ul style={{ marginTop: 8 }}>
                  {importResult.errors.slice(0, 10).map((er, idx) => (
                    <li key={idx}>Row {er.row}: {er.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WorkInput
