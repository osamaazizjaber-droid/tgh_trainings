import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';

const USER_KEY = 'tms_user_id';
const checkExpiry = (t) => t?.qr_expires_at && new Date(t.qr_expires_at) > new Date();

const RatingRow = ({ question, value, onChange }) => {
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 16, fontWeight: 500 }}>{question}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              flex: '1 1 20%',
              padding: '10px 4px',
              border: `1px solid ${value === n ? 'var(--primary)' : 'var(--border)'}`,
              background: value === n ? 'var(--primary-light)' : 'var(--bg-primary)',
              color: value === n ? '#fff' : 'inherit',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: value === n ? 600 : 400,
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span style={{flex: 1, textAlign: 'center'}}>{1}</span>
        <span style={{flex: 1, textAlign: 'center'}}>{2}</span>
        <span style={{flex: 1, textAlign: 'center'}}>{3}</span>
        <span style={{flex: 1, textAlign: 'center'}}>{4}</span>
      </div>
    </div>
  );
};

export default function EvaluationPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const [params] = useSearchParams();
  const trainingId = params.get('trainingId');

  const [training, setTraining] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [submitting, setSubmitting] = useState(false);
  
  // 14 Rating Questions
  const [ratings, setRatings] = useState({});
  // 4 Open Questions
  const [openText, setOpenText] = useState({ o1: '', o2: '', o3: '', o4: '' });
  
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trainingId) { setPhase('error'); return; }
    init();
  }, [trainingId]);

  const init = async () => {
    const { data: tr } = await supabase.from('trainings').select('*').eq('id', trainingId).single();
    setTraining(tr);
    if (!tr || !checkExpiry(tr)) { setPhase('expired'); return; }
    if (!tr.has_evaluation) { setPhase('disabled'); return; }

    const uid = localStorage.getItem(USER_KEY);
    if (!uid) { setPhase('nouser'); return; }
    setUserId(uid);

    const { data: existing } = await supabase.from('evaluations')
      .select('id').eq('user_id', uid).eq('training_id', trainingId).maybeSingle();
    if (existing) { setPhase('already'); return; }

    setPhase('form');
  };

  const submitEvaluation = async () => {
    setError('');
    
    // Check if all 14 questions are answered
    for (let i = 1; i <= 14; i++) {
      if (!ratings[`q${i}`]) {
        setError(t('fill_required_fields'));
        return;
      }
    }
    
    setSubmitting(true);
    
    const responses = {
      ratings,
      open: openText
    };

    const dbPayload = { 
      user_id: userId, 
      training_id: trainingId, 
      responses
    };

    await supabase.from('evaluations').insert(dbPayload);
    setPhase('done');
    setSubmitting(false);
  };

  return (
    <div className="attendee-page">
      <div className="attendee-card" style={{ maxWidth: 700 }}>
        <div className="attendee-logo">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <img src="/logo.png" alt="TGH Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
          </div>
          <div style={{ position: 'absolute', top: 16, right: language === 'ar' ? 'auto' : 16, left: language === 'ar' ? 16 : 'auto' }}>
            <button onClick={toggleLanguage} className="btn btn-ghost btn-sm">
              {language === 'en' ? 'العربية' : 'English'}
            </button>
          </div>
          <h1>{t('tgh_trainings_center')}</h1>
          <p>{training?.title || t('evaluation')}</p>
        </div>

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        )}

        {phase === 'expired' && (
          <div className="alert alert-error" style={{ flexDirection: 'column', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
            <strong>{t('qr_expired')}</strong>
          </div>
        )}

        {phase === 'nouser' && (
          <div className="alert alert-warning" style={{ flexDirection: 'column', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>👤</div>
            <strong>{t('please_register_first')}</strong>
          </div>
        )}

        {phase === 'already' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: 'var(--success)' }}>{t('test_submitted_already')}</h2>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌟</div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>{t('eval_success')}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{t('eval_success_desc')}</p>
          </div>
        )}

        {phase === 'form' && (
          <div className="animate-fade">
            <h2 style={{ marginBottom: 16, textAlign: 'center' }}>{t('evaluation_form')}</h2>
            
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 24, fontSize: '0.9rem' }}>
              <strong style={{ display: 'block', marginBottom: 8 }}>Scale:</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--text-secondary)' }}>
                <span>1 - {t('eval_scale_1')}</span>
                <span>2 - {t('eval_scale_2')}</span>
                <span>3 - {t('eval_scale_3')}</span>
                <span>4 - {t('eval_scale_4')}</span>
              </div>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => (
              <RatingRow 
                key={i}
                question={`${i}. ${t(`eval_q${i}`)}`}
                value={ratings[`q${i}`]}
                onChange={v => setRatings(p => ({ ...p, [`q${i}`]: v }))}
              />
            ))}

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px solid var(--border)' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="form-group" style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t(`eval_o${i}`)}</label>
                  <textarea
                    rows={3}
                    value={openText[`o${i}`]}
                    onChange={e => setOpenText(p => ({ ...p, [`o${i}`]: e.target.value }))}
                    placeholder={t('write_your_answer_here')}
                    style={{ marginTop: 8 }}
                  />
                </div>
              ))}
            </div>

            <button className="btn btn-primary btn-lg w-full" onClick={submitEvaluation} disabled={submitting} style={{ marginTop: 16 }}>
              {submitting ? <><span className="spinner spinner-sm" /> {t('loading')}</> : t('submit_evaluation')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
