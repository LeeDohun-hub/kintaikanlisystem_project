import React, { useState, useEffect } from 'react'
import api from '../../api/api'

function WorkInput() {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    workDate: today,
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
    workType: 'NORMAL',
    comment: '',
    projectId: ''
  })
  const [projects, setProjects] = useState([])
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/projects').then(res => setProjects(res.data)).catch(() => {})
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess('')
    setError('')
    try {
      await api.post('/attendance', {
        ...form,
        breakMinutes: parseInt(form.breakMinutes, 10) || 0,
        projectId: form.projectId ? parseInt(form.projectId, 10) : null
      })
      setSuccess('근무 정보가 저장되었습니다.')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const calcWorkHours = () => {
    if (!form.startTime || !form.endTime) return '0.0'
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh, em] = form.endTime.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm) - (parseInt(form.breakMinutes, 10) || 0)
    return Math.max(0, mins / 60).toFixed(1)
  }

  const workTypeLabels = { NORMAL: '일반 근무', OVERTIME: '야근', HOLIDAY: '휴일 근무' }

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
              <label>근무 구분</label>
              <select name="workType" value={form.workType} onChange={handleChange}>
                {Object.entries(workTypeLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>프로젝트</label>
              <select name="projectId" value={form.projectId} onChange={handleChange}>
                <option value="">선택 안함</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>시작 시간</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>종료 시간</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>휴식 시간 (분)</label>
              <input type="number" name="breakMinutes" value={form.breakMinutes} onChange={handleChange} min="0" max="480" />
            </div>
          </div>

          <div style={{ marginBottom: 16, padding: 12, background: '#ebf5fb', borderRadius: 6 }}>
            <strong>순 근무 시간(참고):</strong> {calcWorkHours()} 시간
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>코멘트</label>
            <input type="text" name="comment" value={form.comment} onChange={handleChange} placeholder="업무 내용 등" />
          </div>

          <button type="submit" className="primary">저장</button>
        </form>
      </div>
    </div>
  )
}

export default WorkInput
