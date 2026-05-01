import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const USER_KEY = 'tms_user_id';

const checkExpiry = (t) => t?.qr_expires_at && new Date(t.qr_expires_at) > new Date();

// Shared test page factory used by both PreTest and PostTest
export function TestPage({ testType }) {
  const [params] = useSearchParams();
  const trainingId = params.get('trainingId');

  const [training, setTraining] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState('loading');
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [score, setScore] = useState(null);
  const [maxScore, setMaxScore] = useState(null);

  const isPreTest = testType === 'pre';
  const label = isPreTest ? 'القبلي' : 'البعدي';

  useEffect(() => {
    if (!trainingId) { setPhase('error'); return; }
    init();
  }, [trainingId]);

  const init = async () => {
    const { data: t } = await supabase.from('trainings').select('*').eq('id', trainingId).single();
    setTraining(t);

    if (!t || !checkExpiry(t)) { setPhase('expired'); return; }

    const uid = localStorage.getItem(USER_KEY);
    if (!uid) { setPhase('nouser'); return; }
    setUserId(uid);

    // Check if already submitted
    const { data: qs } = await supabase.from('questions').select('id').eq('training_id', trainingId).eq('type', testType);
    if (!qs?.length) { setPhase('noquestions'); return; }

    const { data: existing } = await supabase.from('answers')
      .select('id').eq('user_id', uid).eq('question_id', qs[0].id).maybeSingle();
    if (existing) { setPhase('already'); return; }

    // Load full questions + choices
    const { data: fullQs } = await supabase.from('questions')
      .select('*, choices(*)')
      .eq('training_id', trainingId)
      .eq('type', testType)
      .order('order_num');

    setQuestions(fullQs || []);
    setPhase('test');
  };

  const handleSelect = (qId, choiceId) => {
    setAnswers(prev => ({ ...prev, [qId]: { choiceId } }));
  };

  const handleText = (qId, text) => {
    setAnswers(prev => ({ ...prev, [qId]: { text } }));
  };

  const handleSubmit = async () => {
    // Validate all MCQ answered
    const unanswered = questions.filter(q => q.question_type === 'mcq' && !answers[q.id]?.choiceId);
    if (unanswered.length) {
      alert(`يرجى الإجابة على جميع أسئلة الاختيار من متعدد (${unanswered.length} سؤال متبقٍ)`);
      return;
    }

    setSubmitting(true);
    const rows = questions.map(q => ({
      user_id: userId,
      question_id: q.id,
      choice_id: answers[q.id]?.choiceId || null,
      answer_text: answers[q.id]?.text || null,
    }));

    await supabase.from('answers').insert(rows);

    // Calculate score
    let earned = 0, total = 0;
    questions.forEach(q => {
      if (q.question_type === 'mcq') {
        total += q.points;
        const chosen = q.choices?.find(c => c.id === answers[q.id]?.choiceId);
        if (chosen?.is_correct) earned += q.points;
      }
    });

    setScore(earned);
    setMaxScore(total);
    setPhase('done');
    setSubmitting(false);
  };

  return (
    <div className="attendee-page">
      <div className="attendee-card">
        <div className="attendee-logo">
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{isPreTest ? '📝' : '📊'}</div>
          <h1>{training?.title || 'الاختبار'}</h1>
          <p>الاختبار {label}</p>
        </div>

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        )}

        {phase === 'expired' && (
          <div className="alert alert-error" style={{ flexDirection: 'column', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
            <strong>رمز QR منتهي الصلاحية</strong>
            <p style={{ marginTop: 8, opacity: 0.8 }}>تواصل مع المنظمين لتجديد الرمز.</p>
          </div>
        )}

        {phase === 'nouser' && (
          <div className="alert alert-warning" style={{ flexDirection: 'column', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>👤</div>
            <strong>يرجى تسجيل الحضور أولاً</strong>
            <p style={{ marginTop: 8, opacity: 0.8 }}>امسح رمز الحضور قبل الاختبار.</p>
          </div>
        )}

        {phase === 'noquestions' && (
          <div className="alert alert-info" style={{ flexDirection: 'column', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
            <strong>لا توجد أسئلة بعد</strong>
            <p style={{ marginTop: 8, opacity: 0.8 }}>سيتم إضافة الأسئلة قريباً.</p>
          </div>
        )}

        {phase === 'already' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: 'var(--success)' }}>تم تقديم الاختبار مسبقاً</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>لا يمكن تقديم الاختبار {label} أكثر من مرة.</p>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>تم تقديم الاختبار!</h2>
            {maxScore > 0 && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '20px 32px', display: 'inline-block', marginTop: 16 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-light)' }}>{score}/{maxScore}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                  {Math.round((score / maxScore) * 100)}%
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'test' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20, textAlign: 'center' }}>
              {questions.length} سؤال — إجمالي النقاط: {questions.reduce((s, q) => s + q.points, 0)}
            </p>
            {questions.map((q, i) => (
              <div key={q.id} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <p style={{ fontWeight: 600, lineHeight: 1.5, flex: 1 }}>
                    {i + 1}. {q.question_text}
                  </p>
                  <span className="badge badge-purple" style={{ marginRight: 8, flexShrink: 0 }}>{q.points} نقطة</span>
                </div>

                {q.question_type === 'mcq' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.choices?.map(c => {
                      const selected = answers[q.id]?.choiceId === c.id;
                      return (
                        <label key={c.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                          background: selected ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                          border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s',
                        }}>
                          <input type="radio" name={`q_${q.id}`} checked={selected}
                            onChange={() => handleSelect(q.id, c.id)}
                            style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                          />
                          <span style={{ fontSize: '0.9rem' }}>{c.choice_text}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    placeholder="اكتب إجابتك هنا..."
                    value={answers[q.id]?.text || ''}
                    onChange={e => handleText(q.id, e.target.value)}
                    rows={3}
                  />
                )}
              </div>
            ))}

            <button
              className="btn btn-primary w-full btn-lg"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ marginTop: 8 }}
            >
              {submitting ? <><span className="spinner spinner-sm" /> جاري الإرسال...</> : '✓ تقديم الاختبار'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
