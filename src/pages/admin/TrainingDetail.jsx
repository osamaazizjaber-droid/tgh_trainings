import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { format, addDays } from 'date-fns';
import { useLanguage } from '../../lib/LanguageContext';
import { exportAttendance, exportTestResults, exportEvaluations, exportAll } from '../../lib/export';
import { exportStudentTestPdf } from '../../lib/pdfExport';
import { generateCertificatesPdf } from '../../lib/certificateExport';

const BASE_URL = window.location.origin;

const QRPanel = ({ trainingId, type, label, color }) => {
  const url = `${BASE_URL}/${type}?trainingId=${trainingId}`;
  const ref = useRef(null);

  const download = () => {
    const canvas = ref.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr_${type}_${trainingId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{label}</div>
      <div ref={ref} style={{ display: 'inline-block', background: 'white', padding: 12, borderRadius: 8 }}>
        <QRCodeCanvas value={url} size={140} />
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="btn btn-secondary btn-sm" onClick={download}>⬇ Download</button>
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}>
          🔗 Link
        </a>
      </div>
    </div>
  );
};

export default function AdminTrainingDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [training, setTraining] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [expiryInput, setExpiryInput] = useState('');
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [issuingCerts, setIssuingCerts] = useState(false);
  const [minDaysRequired, setMinDaysRequired] = useState(1);

  // Question form state
  const [showQForm, setShowQForm] = useState(false);
  const [qType, setQType] = useState('pre');
  const [qText, setQText] = useState('');
  const [qKind, setQKind] = useState('mcq');
  const [qPoints, setQPoints] = useState(1);
  const [choices, setChoices] = useState([{ text: '', correct: false }, { text: '', correct: false }]);
  const [savingQ, setSavingQ] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: t }, { data: att }, { data: q }, { data: ev }, { data: tr }, { data: certs }] = await Promise.all([
      supabase.from('trainings').select('*, activities(name, projects(name))').eq('id', id).single(),
      supabase.from('attendance').select('*, users(first_name, second_name, third_name, fourth_name, phone, gender, dob, age, governorate, district, subdistrict, village, representation, job_function)').eq('training_id', id).order('day_number'),
      supabase.from('questions').select('*, choices(*)').eq('training_id', id).order('order_num'),
      supabase.from('evaluations').select('*, users(first_name, second_name, third_name, fourth_name, phone, representation, job_function)').eq('training_id', id),
      supabase.from('test_score_comparison').select('*').eq('training_id', id),
      supabase.from('certificates').select('*').eq('training_id', id),
    ]);

    const trainerId = localStorage.getItem('trainer_id');
    if (trainerId && t && t.trainer_id !== trainerId) {
      window.location.href = '/admin';
      return;
    }

    setTraining(t);
    setAttendance(att || []);
    setQuestions(q || []);
    setEvaluations(ev || []);
    setTestResults(tr || []);
    setCertificates(certs || []);
    if (t) setMinDaysRequired(t.days_count);
    if (t?.qr_expires_at) setExpiryInput(format(new Date(t.qr_expires_at), "yyyy-MM-dd'T'HH:mm"));
    setLoading(false);
  };

  const saveExpiry = async () => {
    setSavingExpiry(true);
    await supabase.from('trainings').update({ qr_expires_at: new Date(expiryInput).toISOString() }).eq('id', id);
    setSavingExpiry(false);
    fetchAll();
  };

  const extendExpiry = async (days) => {
    const base = training?.qr_expires_at && new Date(training.qr_expires_at) > new Date()
      ? new Date(training.qr_expires_at)
      : new Date();
    const newExp = addDays(base, days);
    setSavingExpiry(true);
    await supabase.from('trainings').update({ qr_expires_at: newExp.toISOString() }).eq('id', id);
    setSavingExpiry(false);
    fetchAll();
  };

  const handleDownloadPdf = async (student) => {
    setDownloadingPdf(student.user_id);
    const { data: answers } = await supabase.from('answers')
      .select('*, choices(choice_text, is_correct)')
      .eq('user_id', student.user_id);
    
    const qIds = new Set(questions.map(q => q.id));
    const relevantAnswers = (answers || []).filter(a => qIds.has(a.question_id));

    exportStudentTestPdf(student, training, questions, relevantAnswers, t);
    setDownloadingPdf(false);
  };

  const saveQuestion = async () => {
    if (!qText.trim()) return;
    setSavingQ(true);
    const { data: newQ } = await supabase.from('questions').insert({
      training_id: id, type: qType, question_text: qText,
      question_type: qKind, points: qPoints,
      order_num: questions.filter(q => q.type === qType).length,
    }).select().single();

    if (qKind === 'mcq' && newQ) {
      const validChoices = choices.filter(c => c.text.trim());
      if (validChoices.length) {
        await supabase.from('choices').insert(validChoices.map(c => ({
          question_id: newQ.id, choice_text: c.text, is_correct: c.correct,
        })));
      }
    }
    setSavingQ(false);
    setShowQForm(false);
    setQText(''); setChoices([{ text: '', correct: false }, { text: '', correct: false }]);
    fetchAll();
  };

  const deleteQuestion = async (qId) => {
    await supabase.from('questions').delete().eq('id', qId);
    fetchAll();
  };

  const attendanceByUser = attendance.reduce((acc, a) => {
    if (!acc[a.user_id]) acc[a.user_id] = { user: a.users, count: 0, user_id: a.user_id };
    acc[a.user_id].count += 1;
    return acc;
  }, {});

  const issueCertificates = async () => {
    setIssuingCerts(true);
    
    const eligibleUserIds = Object.values(attendanceByUser)
      .filter(x => x.count >= minDaysRequired)
      .map(x => x.user_id)
      .filter(uid => !certificates.some(c => c.user_id === uid));

    if (eligibleUserIds.length === 0) {
      alert('No new eligible participants found based on the selected criteria.');
      setIssuingCerts(false);
      return;
    }

    const projectCode = training.activities?.projects?.name || 'GEN';
    const prefix = `TGH-${projectCode}-`;
    
    // Get highest current sequence for this project
    const { data: projectCerts } = await supabase
      .from('certificates')
      .select('certificate_code')
      .like('certificate_code', `${prefix}%`);
      
    let maxSeq = 0;
    if (projectCerts) {
      projectCerts.forEach(c => {
        const parts = c.certificate_code.split('-');
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      });
    }

    const newCerts = eligibleUserIds.map((uid, index) => {
      const nextSeq = maxSeq + index + 1;
      const code = `${prefix}${nextSeq.toString().padStart(3, '0')}`;
      return {
        training_id: id,
        user_id: uid,
        certificate_code: code
      };
    });

    const { error } = await supabase.from('certificates').insert(newCerts);
    if (error) {
      alert('Error issuing certificates: ' + error.message);
    } else {
      fetchAll();
    }
    setIssuingCerts(false);
  };

  const isExpired = training?.qr_expires_at ? new Date(training.qr_expires_at) < new Date() : true;

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!training) return <div className="page-container"><p>{t('error')}</p></div>;

  const tabs = [
    { key: 'overview', label: t('features') },
    { key: 'attendance', label: `${t('attendance')} (${attendance.length})` },
    training.has_pre_test || training.has_post_test ? { key: 'tests', label: `${t('test')} (${testResults.length})` } : null,
    training.has_evaluation ? { key: 'evaluations', label: `${t('evaluation')} (${evaluations.length})` } : null,
    training.has_pre_test || training.has_post_test ? { key: 'questions', label: `${t('questions')} (${questions.length})` } : null,
    { key: 'certificates', label: `🎓 Certificates (${certificates.length})` },
  ].filter(Boolean);

  const preQs = questions.filter(q => q.type === 'pre');
  const postQs = questions.filter(q => q.type === 'post');

  const avgEval = (qId) => {
    const vals = evaluations.map(e => e.responses?.ratings?.[qId]).filter(Boolean);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  const uniqueAttendees = [];
  const seenPhones = new Set();
  attendance.forEach(a => {
    if (a.users && !seenPhones.has(a.users.phone)) {
      seenPhones.add(a.users.phone);
      uniqueAttendees.push(a.users);
    }
  });
  const maleCount = uniqueAttendees.filter(u => u.gender?.toLowerCase() === 'male').length;
  const femaleCount = uniqueAttendees.filter(u => u.gender?.toLowerCase() === 'female').length;

  return (
    <div className="page-container animate-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Link to="/admin/projects" className="btn btn-ghost btn-sm">← Back</Link>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {training.activities?.projects?.name} / {training.activities?.name}
            </span>
          </div>
          <h1 className="page-title">{training.title}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-purple">{training.days_count} Days</span>
            {training.has_pre_test && <span className="badge badge-info">Pre-Test</span>}
            {training.has_post_test && <span className="badge badge-info">Post-Test</span>}
            {training.has_evaluation && <span className="badge badge-success">Evaluation</span>}
            <span className={`badge ${isExpired ? 'badge-danger' : 'badge-success'}`}>
              QR {isExpired ? 'Expired' : 'Active'}
            </span>
            <div style={{ flex: 1 }}></div>
            <span className="badge badge-gray" style={{ fontSize: '0.85rem' }}>
              👥 {uniqueAttendees.length} Total (♂ {maleCount} | ♀ {femaleCount})
            </span>
          </div>
        </div>
        <button
          className="btn btn-success"
          onClick={() => exportAll({ attendance, testResults, evaluations }, training.title, t)}
        >
          ⬇ Export All
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        {tabs.map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              color: tab === tabItem.key ? 'var(--primary-light)' : 'var(--text-secondary)',
              fontWeight: tab === tabItem.key ? 700 : 500, fontSize: '0.9rem',
              borderBottom: tab === tabItem.key ? '2px solid var(--primary)' : '2px solid transparent',
              whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: 'inherit',
            }}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW & QR TAB ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* QR Expiry Control */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>QR Code Expiry</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                <label>Set Expiry Date & Time</label>
                <input type="datetime-local" value={expiryInput} onChange={e => setExpiryInput(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={saveExpiry} disabled={savingExpiry || !expiryInput}>
                {savingExpiry ? <span className="spinner spinner-sm" /> : 'Set Expiry'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Quick extend:</span>
              {[1, 3, 7, 30].map(d => (
                <button key={d} className="btn btn-secondary btn-sm" onClick={() => extendExpiry(d)} disabled={savingExpiry}>
                  +{d}d
                </button>
              ))}
            </div>
            {training.qr_expires_at && (
              <p style={{ marginTop: 10, fontSize: '0.85rem', color: isExpired ? 'var(--danger)' : 'var(--success)' }}>
                {isExpired ? '⚠ Expired' : '✓ Active'} until {format(new Date(training.qr_expires_at), 'dd MMM yyyy, HH:mm')}
              </p>
            )}
          </div>

          {/* QR Codes */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>QR Codes</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <QRPanel trainingId={id} type="attendance" label={t('attendance')} color="var(--primary-light)" />
              {training.has_pre_test && <QRPanel trainingId={id} type="pretest" label={t('pre_test')} color="var(--info)" />}
              {training.has_post_test && <QRPanel trainingId={id} type="posttest" label={t('post_test')} color="var(--warning)" />}
              {training.has_evaluation && <QRPanel trainingId={id} type="evaluation" label={t('evaluation')} color="var(--success)" />}
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {tab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Attendance Records</h3>
            <button className="btn btn-success btn-sm" onClick={() => exportAttendance(attendance, training.title, t)}>
              ⬇ Export Excel
            </button>
          </div>
          {attendance.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No attendance records yet</h3></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Full Name</th><th>Phone</th><th>Gender</th><th>Age</th><th>DoB</th>
                    <th>Governorate</th><th>District</th><th>Subdistrict</th><th>Village</th>
                    <th>Representation</th><th>Function</th><th>Day</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(a => {
                    const u = a.users;
                    const name = [u?.first_name, u?.second_name, u?.third_name, u?.fourth_name].filter(Boolean).join(' ');
                    return (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td className="text-muted">{u?.phone}</td>
                      <td>{u?.gender?.toLowerCase() === 'male' ? '♂ Male' : '♀ Female'}</td>
                      <td>{u?.age}</td>
                      <td className="text-muted" style={{ fontSize: '0.82rem' }}>{u?.dob || '—'}</td>
                      <td>{u?.governorate}</td>
                      <td className="text-muted" style={{ fontSize: '0.82rem' }}>{u?.district || '—'}</td>
                      <td className="text-muted" style={{ fontSize: '0.82rem' }}>{u?.subdistrict || '—'}</td>
                      <td className="text-muted" style={{ fontSize: '0.82rem' }}>{u?.village || '—'}</td>
                      <td className="text-muted" style={{ fontSize: '0.82rem' }}>{u?.representation || '—'}</td>
                      <td className="text-muted" style={{ fontSize: '0.82rem' }}>{u?.job_function || '—'}</td>
                      <td><span className="badge badge-purple">Day {a.day_number}</span></td>
                      <td className="text-muted">{a.date}</td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TESTS TAB ── */}
      {tab === 'tests' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pre vs Post Test Results</h3>
            <button className="btn btn-success btn-sm" onClick={() => exportTestResults(testResults, training.title, t)}>
              ⬇ Export Excel
            </button>
          </div>
          {testResults.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📝</div><h3>No test results yet</h3></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Phone</th>
                    <th>Pre Score</th><th>Pre %</th>
                    <th>Post Score</th><th>Post %</th>
                    <th>Improvement</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map(r => {
                    const prePct = r.pre_max > 0 ? Math.round((r.pre_score / r.pre_max) * 100) : 0;
                    const postPct = r.post_max > 0 ? Math.round((r.post_score / r.post_max) * 100) : 0;
                    const diff = postPct - prePct;
                    return (
                      <tr key={r.user_id}>
                        <td style={{ fontWeight: 600 }}>{r.user_name}</td>
                        <td className="text-muted">{r.phone}</td>
                        <td>{r.pre_score}/{r.pre_max}</td>
                        <td><span className={`badge ${prePct >= 60 ? 'badge-success' : 'badge-warning'}`}>{prePct}%</span></td>
                        <td>{r.post_score}/{r.post_max}</td>
                        <td><span className={`badge ${postPct >= 60 ? 'badge-success' : 'badge-warning'}`}>{postPct}%</span></td>
                        <td>
                          <span className={`badge ${diff > 0 ? 'badge-success' : diff < 0 ? 'badge-danger' : 'badge-gray'}`}>
                            {diff > 0 ? '+' : ''}{diff}%
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => handleDownloadPdf(r)}
                            disabled={downloadingPdf === r.user_id}
                          >
                            {downloadingPdf === r.user_id ? '...' : '📄 PDF'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EVALUATIONS TAB ── */}
      {tab === 'evaluations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Averages */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Average Scores (Out of 4)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i => (
                <div key={i} style={{ textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '12px 8px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-light)' }}>{avgEval(`q${i}`)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Q{i}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">All Evaluations</h3>
              <button className="btn btn-success btn-sm" onClick={() => exportEvaluations(evaluations, training.title, t)}>⬇ Export</button>
            </div>
            {evaluations.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">⭐</div><h3>No evaluations yet</h3></div>
            ) : (
              <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th>{t('participant_code') || 'Participant Code'}</th>
                      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i => <th key={i}>Q{i}</th>)}
                      <th>{t('eval_o1') || 'Open 1'}</th>
                      <th>{t('eval_o2') || 'Open 2'}</th>
                      <th>{t('eval_o3') || 'Open 3'}</th>
                      <th>{t('eval_o4') || 'Open 4'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluations.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600 }}>{e.user_id ? e.user_id.split('-')[0].toUpperCase() : '—'}</td>
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i => (
                          <td key={i}>{e.responses?.ratings?.[`q${i}`] || '—'}</td>
                        ))}
                        <td className="text-muted" style={{ maxWidth: 150, fontSize: '0.8rem' }}>{e.responses?.open?.o1 || '—'}</td>
                        <td className="text-muted" style={{ maxWidth: 150, fontSize: '0.8rem' }}>{e.responses?.open?.o2 || '—'}</td>
                        <td className="text-muted" style={{ maxWidth: 150, fontSize: '0.8rem' }}>{e.responses?.open?.o3 || '—'}</td>
                        <td className="text-muted" style={{ maxWidth: 150, fontSize: '0.8rem' }}>{e.responses?.open?.o4 || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── QUESTIONS TAB ── */}
      {tab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => setShowQForm(true)}>+ Add Question</button>
          </div>

          {['pre', 'post'].map(type => (
            (type === 'pre' && training.has_pre_test) || (type === 'post' && training.has_post_test)
          ) && (
            <div key={type} className="card">
              <h3 className="card-title" style={{ marginBottom: 16, textTransform: 'capitalize' }}>
                {type === 'pre' ? 'Pre-Test' : 'Post-Test'} Questions
                <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  (Total: {questions.filter(q=>q.type===type).reduce((s,q)=>s+q.points,0)} pts)
                </span>
              </h3>
              {questions.filter(q => q.type === type).length === 0 ? (
                <p className="text-muted">No questions yet.</p>
              ) : (
                questions.filter(q => q.type === type).map((q, i) => (
                  <div key={q.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>Q{i + 1}. {q.question_text}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="badge badge-purple">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                        <span className="badge badge-gray">{q.question_type.toUpperCase()}</span>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteQuestion(q.id)}>✕</button>
                      </div>
                    </div>
                    {q.choices?.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.85rem' }}>
                        <span style={{ color: c.is_correct ? 'var(--success)' : 'var(--text-muted)' }}>
                          {c.is_correct ? '✓' : '○'}
                        </span>
                        <span style={{ color: c.is_correct ? 'var(--success)' : 'var(--text-secondary)' }}>{c.choice_text}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CERTIFICATES TAB ── */}
      {tab === 'certificates' && (
        <div className="card">
          <div className="card-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h3 className="card-title">Issue Certificates</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Certificates generated for participants meeting the minimum attendance requirement.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Min. Days Attended</label>
                <select 
                  value={minDaysRequired} 
                  onChange={e => setMinDaysRequired(parseInt(e.target.value))}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  {Array.from({ length: training.days_count }).map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1} Day{i > 0 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={issueCertificates}
                disabled={issuingCerts}
              >
                {issuingCerts ? <span className="spinner spinner-sm" /> : '+ Issue Certificates'}
              </button>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => generateCertificatesPdf(certificates, attendanceByUser, training, BASE_URL)}
                disabled={certificates.length === 0}
              >
                ⬇ Download PDFs
              </button>
            </div>
          </div>
          
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Days Attended</th>
                  <th>Status</th>
                  <th>Certificate Code</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(attendanceByUser).map(record => {
                  const cert = certificates.find(c => c.user_id === record.user_id);
                  const name = [record.user?.first_name, record.user?.second_name, record.user?.third_name, record.user?.fourth_name].filter(Boolean).join(' ');
                  const isEligible = record.count >= minDaysRequired;
                  
                  return (
                    <tr key={record.user_id}>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td>
                        <span className={`badge ${isEligible ? 'badge-success' : 'badge-gray'}`}>
                          {record.count} / {training.days_count}
                        </span>
                      </td>
                      <td>
                        {cert ? (
                          <span className="badge badge-success">Issued</span>
                        ) : isEligible ? (
                          <span className="badge badge-warning">Pending</span>
                        ) : (
                          <span className="badge badge-danger">Ineligible</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>
                        {cert ? cert.certificate_code : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Question Modal ── */}
      {showQForm && (
        <div className="modal-overlay" onClick={() => setShowQForm(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Question</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowQForm(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12 }}>
                <div className="form-group">
                  <label>Test Type</label>
                  <select value={qType} onChange={e => setQType(e.target.value)}>
                    {training.has_pre_test && <option value="pre">Pre-Test</option>}
                    {training.has_post_test && <option value="post">Post-Test</option>}
                  </select>
                </div>
                <div className="form-group">
                  <label>Question Type</label>
                  <select value={qKind} onChange={e => setQKind(e.target.value)}>
                    <option value="mcq">Multiple Choice</option>
                    <option value="text">Open-Ended</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Points</label>
                  <input type="number" min={1} max={10} value={qPoints} onChange={e => setQPoints(parseInt(e.target.value))} />
                </div>
              </div>
              <div className="form-group">
                <label>Question Text *</label>
                <textarea value={qText} onChange={e => setQText(e.target.value)} placeholder="Enter your question..." rows={3} />
              </div>
              {qKind === 'mcq' && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Choices (mark correct with ✓)
                  </label>
                  {choices.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <input
                        type="checkbox"
                        checked={c.correct}
                        onChange={() => setChoices(choices.map((x, j) => j === i ? { ...x, correct: !x.correct } : x))}
                        style={{ width: 18, height: 18, accentColor: 'var(--success)', flexShrink: 0 }}
                        title="Mark as correct"
                      />
                      <input
                        value={c.text}
                        onChange={e => setChoices(choices.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                        placeholder={`Choice ${i + 1}`}
                        style={{ flex: 1 }}
                      />
                      {choices.length > 2 && (
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => setChoices(choices.filter((_, j) => j !== i))}>✕</button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
                    onClick={() => setChoices([...choices, { text: '', correct: false }])}>
                    + Add Choice
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowQForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveQuestion} disabled={savingQ || !qText.trim()}>
                {savingQ ? <span className="spinner spinner-sm" /> : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
