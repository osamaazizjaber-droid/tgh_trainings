import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';

const USER_KEY = 'tms_user_id';
const checkExpiry = (t) => t?.qr_expires_at && new Date(t.qr_expires_at) > new Date();

const StarRating = ({ value, onChange, label, showComment, commentValue, onCommentChange }) => {
  const { t } = useLanguage();
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 12, fontWeight: 600 }}>{label}</label>
      <div className="star-rating" style={{ justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            className={`star ${n <= value ? 'filled' : ''}`}
            onClick={() => onChange(n)}
            role="button"
            aria-label={`${n} ${t('stars')}`}
          >★</span>
        ))}
      </div>
      {showComment && (
        <div className="animate-fade" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
          <label style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t('reason_improvement')}
          </label>
          <textarea
            value={commentValue}
            onChange={e => onCommentChange(e.target.value)}
            placeholder="..."
            rows={2}
            className="w-full"
            style={{ borderColor: 'var(--danger)', marginTop: 4 }}
            required
          />
        </div>
      )}
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
  
  const [content, setContent] = useState(0);
  const [trainer, setTrainer] = useState(0);
  const [logistics, setLogistics] = useState(0);
  const [materials, setMaterials] = useState(0);
  const [overall, setOverall] = useState(0);
  
  const [categoryComments, setCategoryComments] = useState({
    content: '', trainer: '', logistics: '', materials: '', overall: ''
  });
  const [comments, setComments] = useState('');
  
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');

  const needsReason = (val) => val > 0 && val <= 3;

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

  const submitEvaluation = async () => {
    setError('');
    if (!content || !trainer || !logistics || !materials || !overall) {
      setError(t('fill_required_fields')); return;
    }
    
    const missingComments = [
      { v: content, k: 'content' },
      { v: trainer, k: 'trainer' },
      { v: logistics, k: 'logistics' },
      { v: materials, k: 'materials' },
      { v: overall, k: 'overall' }
    ].filter(x => needsReason(x.v) && !categoryComments[x.k].trim());

    if (missingComments.length) {
      setError(t('explain_low_rating')); return;
    }
    
    setSubmitting(true);
    
    const dbPayload = { 
      user_id: userId, 
      training_id: trainingId, 
      content_rating: content,
      content_comment: categoryComments.content,
      trainer_rating: trainer,
      trainer_comment: categoryComments.trainer,
      logistics_rating: logistics,
      logistics_comment: categoryComments.logistics,
      materials_rating: materials,
      materials_comment: categoryComments.materials,
      overall_rating: overall,
      overall_comment: categoryComments.overall,
      comments 
    };

    await supabase.from('evaluations').insert(dbPayload);
    setPhase('done');
    setSubmitting(false);
  };

  return (
    <div className="attendee-page">
      <div className="attendee-card">
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
            <h2 style={{ marginBottom: 24, textAlign: 'center' }}>{t('evaluation_form')}</h2>
            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            <StarRating 
              label={t('content_quality')} value={content} onChange={setContent} 
              showComment={needsReason(content)} commentValue={categoryComments.content} onCommentChange={v => setCategoryComments(p => ({...p, content: v}))}
            />
            <StarRating 
              label={t('trainer_performance')} value={trainer} onChange={setTrainer} 
              showComment={needsReason(trainer)} commentValue={categoryComments.trainer} onCommentChange={v => setCategoryComments(p => ({...p, trainer: v}))}
            />
            <StarRating 
              label={t('logistics')} value={logistics} onChange={setLogistics} 
              showComment={needsReason(logistics)} commentValue={categoryComments.logistics} onCommentChange={v => setCategoryComments(p => ({...p, logistics: v}))}
            />
            <StarRating 
              label={t('materials')} value={materials} onChange={setMaterials} 
              showComment={needsReason(materials)} commentValue={categoryComments.materials} onCommentChange={v => setCategoryComments(p => ({...p, materials: v}))}
            />
            <StarRating 
              label={t('overall_rating')} value={overall} onChange={setOverall} 
              showComment={needsReason(overall)} commentValue={categoryComments.overall} onCommentChange={v => setCategoryComments(p => ({...p, overall: v}))}
            />

            <div className="form-group" style={{ marginBottom: 32 }}>
              <label>{t('additional_comments')}</label>
              <textarea
                rows={4}
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="..."
              />
            </div>

            <button className="btn btn-primary btn-lg w-full" onClick={submitEvaluation} disabled={submitting}>
              {submitting ? <><span className="spinner spinner-sm" /> {t('loading')}</> : t('submit_evaluation')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
