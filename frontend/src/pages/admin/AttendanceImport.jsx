import React, { useState } from 'react'
import api from '../../api/api'

function AttendanceImport() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!file) {
      setError('업로드할 엑셀 파일을 선택하세요.')
      return
    }
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/attendance/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
    } catch (err) {
      const msg = err.response?.data?.error || '엑셀 업로드에 실패했습니다.'
      setError(typeof msg === 'string' ? msg : '엑셀 업로드에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <h2 className="page-title">근태 Excel Import</h2>
      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
            <button type="submit" className="primary" disabled={loading}>
              {loading ? '처리 중…' : '가져오기'}
            </button>
          </div>
          <p style={{ marginTop: 10, fontSize: 13, color: '#666' }}>
            컬럼(가정): 社員ID, 勤務日, 開始時刻, 終了時刻, 休憩(分) — 1행은 헤더로 취급합니다.
          </p>
        </form>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>결과</h3>
          <p><strong>성공:</strong> {result.successCount}건 / <strong>실패:</strong> {result.errorCount}건</p>
          {result.errors?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0 }}>에러 행</h4>
              <ul>
                {result.errors.map((e, idx) => (
                  <li key={idx}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AttendanceImport

