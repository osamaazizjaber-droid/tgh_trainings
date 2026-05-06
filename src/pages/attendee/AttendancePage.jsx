import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getGovernorates, getDistricts, getSubdistricts } from '../../lib/iraqiLocations';
import { useLanguage } from '../../lib/LanguageContext';

const USER_KEY = 'tms_user_id';

const checkExpiry = (training) => {
  if (!training?.qr_expires_at) return false;
  return new Date(training.qr_expires_at) > new Date();
};

const emptyForm = {
  first_name: '', second_name: '', third_name: '', fourth_name: '',
  phone: '', gender: '', dob: '', age: '',
  governorate: '', district: '', subdistrict: '', village: '',
  representation: '', job_function: '',
};

export default function AttendancePage() {
  const { t, language, toggleLanguage } = useLanguage();
  const [params] = useSearchParams();
  const trainingId = params.get('trainingId');

  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('loading');
  const [existingUser, setExistingUser] = useState(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [phoneLookup, setPhoneLookup] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    if (!trainingId) { setPhase('error'); setLoading(false); return; }
    init();
  }, [trainingId]);

  const init = async () => {
    const { data: t } = await supabase.from('trainings').select('*').eq('id', trainingId).single();
    setTraining(t);
    if (!t || !checkExpiry(t)) { setPhase('expired'); setLoading(false); return; }

    const uid = localStorage.getItem(USER_KEY);
    if (uid) {
      const { data: user } = await supabase.from('users').select('*').eq('id', uid).single();
      if (user) { setExistingUser(user); await determineDay(uid, t.id, t.days_count); return; }
    }
    setPhase('new');
    setLoading(false);
  };

  const determineDay = async (userId, tId, daysCount) => {
    const { data: records } = await supabase.from('attendance')
      .select('day_number').eq('user_id', userId).eq('training_id', tId);
    const attended = records?.map(r => r.day_number) || [];
    const nextDay = Math.max(...([0, ...attended])) + 1;
    if (nextDay > daysCount) { setPhase('already'); setLoading(false); return; }
    setDayNumber(nextDay);
    setPhase('checkin');
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');

    if (!form.first_name || !form.second_name || !form.phone || !form.gender || !form.dob || !form.governorate) {
      setError(t('fill_required_fields'));
      setSubmitting(false); return;
    }

    const { data: existing } = await supabase.from('users').select('id').eq('phone', form.phone).maybeSingle();
    if (existing) {
      setError(t('phone_exists'));
      setSubmitting(false); return;
    }

    const { data: newUser, error: userErr } = await supabase.from('users').insert({
      first_name: form.first_name.trim(),
      second_name: form.second_name.trim(),
      third_name: form.third_name.trim() || null,
      fourth_name: form.fourth_name.trim() || null,
      phone: form.phone.trim(),
      gender: form.gender,
      dob: form.dob || null,
      age: parseInt(form.age) || null,
      governorate: form.governorate,
      district: form.district || null,
      subdistrict: form.subdistrict || null,
      village: form.village.trim() || null,
      representation: form.representation.trim() || null,
      job_function: form.job_function.trim() || null,
    }).select().single();

    if (userErr) { setError(t('reg_error')); setSubmitting(false); return; }

    localStorage.setItem(USER_KEY, newUser.id);
    await supabase.from('attendance').insert({ user_id: newUser.id, training_id: trainingId, day_number: 1 });
    setDayNumber(1);
    setExistingUser(newUser);
    setPhase('success');
    setSubmitting(false);
  };

  const handleCheckIn = async () => {
    setSubmitting(true);
    const uid = existingUser?.id;
    const { error: err } = await supabase.from('attendance')
      .insert({ user_id: uid, training_id: trainingId, day_number: dayNumber });
    if (err?.code === '23505') { setPhase('already'); } else { setPhase('success'); }
    setSubmitting(false);
  };

  const handleEditInfo = () => {
    setForm({
      first_name: existingUser.first_name || '',
      second_name: existingUser.second_name || '',
      third_name: existingUser.third_name || '',
      fourth_name: existingUser.fourth_name || '',
      phone: existingUser.phone || '',
      gender: existingUser.gender || '',
      dob: existingUser.dob || '',
      age: existingUser.age || '',
      governorate: existingUser.governorate || '',
      district: existingUser.district || '',
      subdistrict: existingUser.subdistrict || '',
      village: existingUser.village || '',
      representation: existingUser.representation || '',
      job_function: existingUser.job_function || '',
    });
    setPhase('edit');
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');

    if (!form.first_name || !form.second_name || !form.phone || !form.gender || !form.dob || !form.governorate) {
      setError(t('fill_required_fields'));
      setSubmitting(false); return;
    }

    if (form.phone !== existingUser.phone) {
      const { data: existing } = await supabase.from('users').select('id').eq('phone', form.phone).maybeSingle();
      if (existing) {
        setError(t('phone_exists'));
        setSubmitting(false); return;
      }
    }

    const { error: updateErr } = await supabase.from('users').update({
      first_name: form.first_name.trim(),
      second_name: form.second_name.trim(),
      third_name: form.third_name.trim() || null,
      fourth_name: form.fourth_name.trim() || null,
      phone: form.phone.trim(),
      gender: form.gender,
      dob: form.dob || null,
      age: parseInt(form.age) || null,
      governorate: form.governorate,
      district: form.district || null,
      subdistrict: form.subdistrict || null,
      village: form.village.trim() || null,
      representation: form.representation.trim() || null,
      job_function: form.job_function.trim() || null,
    }).eq('id', existingUser.id);

    if (updateErr) { setError(t('reg_error')); setSubmitting(false); return; }

    const { data: updatedUser } = await supabase.from('users').select('*').eq('id', existingUser.id).single();
    setExistingUser(updatedUser);
    setPhase('checkin');
    setSubmitting(false);
  };

  const handlePhoneLookup = async () => {
    if (!phoneLookup.trim()) return;
    setLookingUp(true); setError('');
    const { data: user } = await supabase.from('users').select('*').eq('phone', phoneLookup.trim()).maybeSingle();
    if (!user) {
      setError(t('user_not_found'));
      setLookingUp(false); return;
    }
    localStorage.setItem(USER_KEY, user.id);
    setExistingUser(user);
    await determineDay(user.id, trainingId, training.days_count);
    setLookingUp(false);
  };

  const f = (key, val) => setForm(prev => {
    const next = { ...prev, [key]: val };
    if (key === 'governorate') { next.district = ''; next.subdistrict = ''; }
    if (key === 'district') { next.subdistrict = ''; }
    return next;
  });

  const fullName = (u) => [u?.first_name, u?.second_name, u?.third_name, u?.fourth_name].filter(Boolean).join(' ');

  return (
    <div className="attendee-page">
      <div className="attendee-card">
        {/* Logo */}
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
          <p>{training?.title || t('attendance_registration')}</p>
        </div>

        {/* Loading */}
        {(loading || phase === 'loading') && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>{t('loading')}</p>
          </div>
        )}

        {/* Expired QR */}
        {phase === 'expired' && (
          <div className="alert alert-error" style={{ textAlign: 'center', flexDirection: 'column', padding: 32 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
            <strong style={{ fontSize: '1.1rem' }}>{t('qr_expired')}</strong>
            <p style={{ marginTop: 8, opacity: 0.8 }}>{t('qr_expired_desc')}</p>
          </div>
        )}

        {/* Already completed all days */}
        {phase === 'already' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>{t('already_attended')}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{t('already_attended_desc')}</p>
          </div>
        )}

        {/* Success */}
        {phase === 'success' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>{t('check_in_success')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              {t('welcome')} <strong style={{ color: 'var(--text-primary)' }}>{fullName(existingUser)}</strong>
            </p>
            <span className="badge badge-purple" style={{ fontSize: '0.95rem', padding: '6px 20px' }}>
              {t('day')} {dayNumber}
            </span>
          </div>
        )}

        {/* Check-in for returning user */}
        {phase === 'checkin' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>{t('welcome_back')}</p>
            <h3 style={{ marginBottom: 16 }}>{fullName(existingUser)}</h3>
            <p style={{ marginBottom: 24 }}>{t('want_to_checkin')} <strong>{t('day')} {dayNumber}</strong>؟</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-primary" onClick={handleCheckIn} disabled={submitting} style={{ width: '100%', padding: 14 }}>
                {submitting ? <><span className="spinner spinner-sm" /> {t('loading')}</> : t('check_in_now')}
              </button>
              <button className="btn btn-secondary" onClick={handleEditInfo} disabled={submitting} style={{ width: '100%', padding: 14 }}>
                {t('edit_information') || 'Edit Information'}
              </button>
            </div>
          </div>
        )}

        {/* Edit Information Form */}
        {phase === 'edit' && (
          <div className="animate-fade">
            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
            
            <h3 style={{ marginBottom: 24, textAlign: 'center' }}>{t('edit_information') || 'Edit Information'}</h3>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>{t('full_name')} *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input placeholder={t('first_name')} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                <input placeholder={t('father_name')} value={form.second_name} onChange={(e) => setForm({ ...form, second_name: e.target.value })} />
                <input placeholder={t('grandfather_name')} value={form.third_name} onChange={(e) => setForm({ ...form, third_name: e.target.value })} />
                <input placeholder={t('family_name')} value={form.fourth_name} onChange={(e) => setForm({ ...form, fourth_name: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div className="form-group">
                <label>{t('gender')} *</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">{t('choose_option')}</option>
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('dob')} *</label>
                <input type="date" max={new Date().toISOString().split('T')[0]} value={form.dob} onChange={(e) => {
                  const newDob = e.target.value;
                  let newAge = form.age;
                  if (newDob) {
                    const diff = Date.now() - new Date(newDob).getTime();
                    newAge = Math.abs(new Date(diff).getUTCFullYear() - 1970);
                  }
                  setForm({ ...form, dob: newDob, age: newAge });
                }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 32 }}>
              <label>{t('phone_number')} *</label>
              <input type="tel" placeholder="07..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--text-secondary)' }}>{t('geo_location')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label>{t('governorate')} *</label>
                <select value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value, district: '', subdistrict: '' })}>
                  <option value="">{t('choose_option')}</option>
                  {getGovernorates().map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('district')}</label>
                <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value, subdistrict: '' })} disabled={!form.governorate}>
                  <option value="">{t('choose_option')}</option>
                  {getDistricts(form.governorate).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>الناحية</label>
                <select value={form.subdistrict} onChange={e => setForm({ ...form, subdistrict: e.target.value })} disabled={!form.district}>
                  <option value="">{t('choose_option')}</option>
                  {getSubdistricts(form.governorate, form.district).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('village_area')}</label>
                <input placeholder="" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
              </div>
            </div>

            <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--text-secondary)' }}>{t('professional_info')}</h3>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>{t('representation')}</label>
              <input placeholder="" value={form.representation} onChange={(e) => setForm({ ...form, representation: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 32 }}>
              <label>{t('job_function')}</label>
              <input placeholder="" value={form.job_function} onChange={(e) => setForm({ ...form, job_function: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => { setPhase('checkin'); setError(''); }} disabled={submitting} style={{ flex: 1, padding: 14 }}>
                {t('cancel') || 'Cancel'}
              </button>
              <button className="btn btn-primary" onClick={handleUpdateInfo} disabled={submitting} style={{ flex: 2, padding: 14 }}>
                {submitting ? <><span className="spinner spinner-sm" /> {t('loading')}</> : (t('save') || 'Save')}
              </button>
            </div>
          </div>
        )}

        {phase === 'new' && (
          <div className="animate-fade">
            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-lg)', marginBottom: 32 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {t('search_phone')}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="tel"
                  placeholder="07..."
                  value={phoneLookup}
                  onChange={(e) => setPhoneLookup(e.target.value)}
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && handlePhoneLookup()}
                />
                <button className="btn btn-secondary" onClick={handlePhoneLookup} disabled={lookingUp || !phoneLookup.trim()}>
                  {lookingUp ? <span className="spinner spinner-sm" /> : t('search')}
                </button>
              </div>
            </div>

            <div className="section-divider" style={{ margin: '32px 0' }}>
              <span>{t('or_register_new')}</span>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>{t('full_name')} *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input placeholder={t('first_name')} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                <input placeholder={t('father_name')} value={form.second_name} onChange={(e) => setForm({ ...form, second_name: e.target.value })} />
                <input placeholder={t('grandfather_name')} value={form.third_name} onChange={(e) => setForm({ ...form, third_name: e.target.value })} />
                <input placeholder={t('family_name')} value={form.fourth_name} onChange={(e) => setForm({ ...form, fourth_name: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div className="form-group">
                <label>{t('gender')} *</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">{t('choose_option')}</option>
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('dob')} *</label>
                <input type="date" max={new Date().toISOString().split('T')[0]} value={form.dob} onChange={(e) => {
                  const newDob = e.target.value;
                  let newAge = form.age;
                  if (newDob) {
                    const diff = Date.now() - new Date(newDob).getTime();
                    newAge = Math.abs(new Date(diff).getUTCFullYear() - 1970);
                  }
                  setForm({ ...form, dob: newDob, age: newAge });
                }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 32 }}>
              <label>{t('phone_number')} *</label>
              <input type="tel" placeholder="07..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--text-secondary)' }}>{t('geo_location')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label>{t('governorate')} *</label>
                <select value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value, district: '', subdistrict: '' })}>
                  <option value="">{t('choose_option')}</option>
                  {getGovernorates().map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('district')}</label>
                <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value, subdistrict: '' })} disabled={!form.governorate}>
                  <option value="">{t('choose_option')}</option>
                  {getDistricts(form.governorate).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>الناحية</label>
                <select value={form.subdistrict} onChange={e => setForm({ ...form, subdistrict: e.target.value })} disabled={!form.district}>
                  <option value="">{t('choose_option')}</option>
                  {getSubdistricts(form.governorate, form.district).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('village_area')}</label>
                <input placeholder="" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
              </div>
            </div>

            <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--text-secondary)' }}>{t('professional_info')}</h3>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>{t('representation')}</label>
              <input placeholder="" value={form.representation} onChange={(e) => setForm({ ...form, representation: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 32 }}>
              <label>{t('job_function')}</label>
              <input placeholder="" value={form.job_function} onChange={(e) => setForm({ ...form, job_function: e.target.value })} />
            </div>

            <button className="btn btn-primary" onClick={handleRegister} disabled={submitting} style={{ width: '100%', padding: 14 }}>
              {submitting ? <><span className="spinner spinner-sm" /> {t('loading')}</> : t('check_in_now')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
