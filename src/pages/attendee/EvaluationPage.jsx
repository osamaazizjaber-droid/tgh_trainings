import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const USER_KEY = 'tms_user_id';
const checkExpiry = (t) => t?.qr_expires_at && new Date(t.qr_expires_at) > new Date();

const CATEGORIES = [
  { key: 'content_rating',   label: 'جودة محتوى التدريب',    icon: '📚' },
  { key: 'trainer_rating',   label: 'أداء وكفاءة المدرب',     icon: '👨‍🏫' },
  { key: 'logistics_rating', label: 'التنظيم واللوجستيات',    icon: '🏛️' },
  { key: 'materials_rating', label: 'المواد والمستلزمات',      icon: '📋' },
  { key: 'overall_rating',   label: 'التقييم العام للتدريب',   icon: '⭐' },
];

const StarRating = ({ value, onChange }) => (
  <div className="star-rating" style={{ justifyContent: 'flex-end' }}>
    {[1, 2, 3, 4, 5].map(n => (
      <span
        key={n}
        className={`star ${n <= value ? 'filled' : ''}`}
        onClick={() => onChange(n)}
        role="button"
        aria-label={`${n} نجوم`}
      >★</span>
    ))}
  </div>
);

export default function EvaluationPage() {
  const [params] = useSearchParams();
  const trainingId = params.get('trainingId');

  const [training, setTraining] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState({
    content_rating: 0, trainer_rating: 0,
    logistics_rating: 0, materials_rating: 0, overall_rating: 0,
  });
  const [comments, setComments] = useState('');
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trainingId) { setPhase('error'); return; }
    init();
  }, [trainingId]);

  const init = async () => {
    const { data: t } = await supabase.from('trainings').select('*').eq('id', trainingId).single();
    setTraining(t);
    if (!t || !checkExpiry(t)) { setPhase('expired'); return; }
    if (!t.has_evaluation) { setPhase('disabled'); return; }

    const uid = localStorage.getItem(USER_KEY);
    if (!uid) { setPhase('nouser'); return; }
    setUserId(uid);

    const { data: existing } = await supabase.from('evaluations')
      .select('id').eq('user_id', uid).eq('training_id', trainingId).maybeSingle();
    if (existing) { setPhase('already'); return; }

    setPhase('form');
  };

  const handleSubmit = async () => {
    setError('');
    const unrated = CATEGORIES.filter(c => ratings[c.key] === 0);
    if (unrated.length) {
      setError('يرجى تقييم جميع الفئات قبل الإرسال');
      return;
    }
    setSubmitting(true);
    await supabase.from('evaluations').insert({ user_id: userId, training_id: trainingId, ...ratings, comments });
    setPhase('done');
    setSubmitting(false);
  };

  return (
    <div className="attendee-page">
      <div className="attendee-card">
        <div className="attendee-logo">
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📊</div>
          <h1>{training?.title || 'تقييم التدريب'}</h1>
          <p>استمارة التقييم</p>
        </div>

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        )}

        {phase === 'expired' && (
          <div className="alert alert-error" style={{ flexDirection: 'column', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
            <strong>رمز QR منتهي الصلاحية</strong>
          </div>
        )}

        {phase === 'nouser' && (
          <div className="alert alert-warning" style={{ flexDirection: 'column', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>👤</div>
            <strong>يرجى تسجيل الحضور أولاً</strong>
          </div>
        )}

        {phase === 'already' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: 'var(--success)' }}>تم إرسال تقييمك</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>شكراً لك على تقييمك!</p>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌟</div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>شكراً على تقييمك!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>ساعدنا تقييمك في تحسين جودة التدريبات.</p>
          </div>
        )}

        {phase === 'form' && (
          <div>
            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24, textAlign: 'center' }}>
              يرجى تقييم كل فئة من 1 إلى 5 نجوم
            </p>

            {CATEGORIES.map(cat => (
              <div key={cat.key} style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                padding: '14px 16px', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cat.label}</span>
                </div>
                <StarRating
                  value={ratings[cat.key]}
                  onChange={val => setRatings(prev => ({ ...prev, [cat.key]: val }))}
                />
              </div>
            ))}

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>تعليقات أو اقتراحات (اختياري)</label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="أضف أي تعليقات أو اقتراحات..."
                rows={4}
              />
            </div>

            <button
              className="btn btn-primary w-full btn-lg"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ marginTop: 16 }}
            >
              {submitting ? <><span className="spinner spinner-sm" /> جاري الإرسال...</> : '✓ إرسال التقييم'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
