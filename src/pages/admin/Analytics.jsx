import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const [trainings, setTrainings] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('trainings').select('id, title, days_count, activities(name)').then(({ data }) => {
      setTrainings(data || []);
      if (data?.length) setSelectedId(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchData(selectedId);
  }, [selectedId]);

  const fetchData = async (tid) => {
    const [{ data: att }, { data: tr }, { data: ev }] = await Promise.all([
      supabase.from('attendance').select('day_number').eq('training_id', tid),
      supabase.from('test_score_comparison').select('*').eq('training_id', tid),
      supabase.from('evaluations').select('content_rating, trainer_rating, logistics_rating, materials_rating, overall_rating').eq('training_id', tid),
    ]);
    setAttendance(att || []);
    setTestResults(tr || []);
    setEvaluations(ev || []);
  };

  // Build attendance chart data
  const attByDay = [1, 2, 3].map(d => ({
    day: `Day ${d}`,
    count: attendance.filter(a => a.day_number === d).length,
  })).filter(d => d.count > 0 || d.day !== 'Day 3');

  // Build pre/post chart
  const testChartData = testResults.map(r => ({
    name: r.user_name?.split(' ')[0] || 'User',
    pre: r.pre_max > 0 ? Math.round((r.pre_score / r.pre_max) * 100) : 0,
    post: r.post_max > 0 ? Math.round((r.post_score / r.post_max) * 100) : 0,
  }));

  // Build eval radar data
  const evalCategories = [
    { label: t('content_quality'), key: 'content_rating' },
    { label: t('trainer_performance'), key: 'trainer_rating' },
    { label: t('logistics'), key: 'logistics_rating' },
    { label: t('materials'), key: 'materials_rating' },
    { label: t('overall_rating'), key: 'overall_rating' },
  ];
  const evalChartData = evalCategories.map(({ label, key }) => {
    const vals = evaluations.map(e => e[key]).filter(Boolean);
    return { subject: label, avg: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0, fullMark: 5 };
  });

  const tooltipStyle = {
    contentStyle: { background: '#1c1c26', border: '1px solid #2a2a3a', borderRadius: 8, color: '#f0f0f8' },
    labelStyle: { color: '#8b8ba8' },
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('analytics')}</h1>
          <p className="text-muted" style={{ marginTop: 4 }}>{t('training_performance_insights')}</p>
        </div>
        <div className="form-group" style={{ minWidth: 260 }}>
          <label>{t('select_training')}</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {trainings.map(tr => (
              <option key={tr.id} value={tr.id}>{tr.activities?.name} — {tr.title}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedId ? (
        <div className="empty-state card"><h3>{t('select_training_above')}</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Attendance Chart */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 20 }}>
              {t('attendance_per_day')} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>({attendance.length} {t('total_records')})</span>
            </h3>
            {attByDay.every(d => d.count === 0) ? (
              <div className="empty-state"><div className="empty-state-icon">📊</div><h3>{t('no_attendance_data')}</h3></div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={attByDay} {...tooltipStyle}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                  <XAxis dataKey="day" stroke="#8b8ba8" fontSize={12} />
                  <YAxis stroke="#8b8ba8" fontSize={12} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" name={t('attendees')} fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pre vs Post Chart */}
          {testChartData.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 20 }}>
                {t('pre_vs_post_scores')}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={testChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                  <XAxis dataKey="name" stroke="#8b8ba8" fontSize={12} />
                  <YAxis stroke="#8b8ba8" fontSize={12} domain={[0, 100]} />
                  <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="pre" name={`${t('pre_test')} %`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="post" name={`${t('post_test')} %`} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Evaluation Radar */}
          {evaluations.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 20 }}>
                {t('evaluation_averages')} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>({evaluations.length} {t('responses')})</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={evalChartData}>
                    <PolarGrid stroke="#2a2a3a" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b8ba8', fontSize: 12 }} />
                    <Radar name="Average" dataKey="avg" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                    <Tooltip {...tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {evalChartData.map(d => (
                    <div key={d.subject} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 80, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{d.subject}</span>
                      <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${(d.avg / 5) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-light)', width: 36 }}>{d.avg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
