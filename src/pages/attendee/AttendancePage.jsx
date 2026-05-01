import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getGovernorates, getDistricts, getSubdistricts } from '../../lib/iraqiLocations';

const USER_KEY = 'tms_user_id';

// Helper: check QR expiry
const checkExpiry = (training) => {
  if (!training?.qr_expires_at) return false;
  return new Date(training.qr_expires_at) > new Date();
};

export default function AttendancePage() {
  const [params] = useSearchParams();
  const trainingId = params.get('trainingId');

  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('loading'); // loading | expired | register | checkin | success | already
  const [existingUser, setExistingUser] = useState(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Registration form
  const [form, setForm] = useState({ name: '', phone: '', gender: '', age: '', governorate: '', district: '', subdistrict: '' });

  // Phone lookup for returning users without localStorage
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

    // Check localStorage
    const uid = localStorage.getItem(USER_KEY);
    if (uid) {
      const { data: user } = await supabase.from('users').select('*').eq('id', uid).single();
      if (user) {
        setExistingUser(user);
        await determineDay(uid, t.id, t.days_count);
        return;
      }
    }
    setPhase('register');
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

    const { name, phone, gender, age, governorate, district, subdistrict } = form;
    if (!name || !phone || !gender || !age || !governorate) {
      setError('يرجى ملء جميع الحقول المطلوبة'); setSubmitting(false); return;
    }

    // Check if phone exists
    const { data: existing } = await supabase.from('users').select('id').eq('phone', phone).single();
    if (existing) {
      setError('رقم الهاتف مسجل مسبقاً. يرجى استخدام رقم آخر أو تسجيل الحضور برقم هاتفك.');
      setSubmitting(false); return;
    }

    // Insert user
    const { data: newUser, error: userErr } = await supabase.from('users')
      .insert({ name, phone, gender, age: parseInt(age), governorate, district, subdistrict })
      .select().single();

    if (userErr) { setError('حدث خطأ أثناء التسجيل. يرجى المحاولة مجدداً.'); setSubmitting(false); return; }

    localStorage.setItem(USER_KEY, newUser.id);

    // Record attendance Day 1
    await supabase.from('attendance').insert({ user_id: newUser.id, training_id: trainingId, day_number: 1 });
    setPhase('success');
    setDayNumber(1);
    setExistingUser(newUser);
    setSubmitting(false);
  };

  const handleCheckIn = async () => {
    setSubmitting(true);
    const uid = existingUser?.id;
    const { error: err } = await supabase.from('attendance').insert({ user_id: uid, training_id: trainingId, day_number: dayNumber });
    if (err?.code === '23505') { setPhase('already'); } else { setPhase('success'); }
    setSubmitting(false);
  };

  const handlePhoneLookup = async () => {
    if (!phoneLookup.trim()) return;
    setLookingUp(true); setError('');
    const { data: user } = await supabase.from('users').select('*').eq('phone', phoneLookup.trim()).single();
    if (!user) {
      setError('لم يتم العثور على هذا الرقم. يرجى التسجيل كمستخدم جديد.');
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

  return (
    <div className="attendee-page">
      <div className="attendee-card">
        {/* Logo */}
        <div className="attendee-logo">
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎓</div>
          <h1>{training?.title || 'منصة التدريب'}</h1>
          {training && <p>تسجيل الحضور</p>}
        </div>

        {/* Loading */}
        {(loading || phase === 'loading') && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</p>
          </div>
        )}

        {/* Expired QR */}
        {phase === 'expired' && (
          <div className="alert alert-error" style={{ textAlign: 'center', flexDirection: 'column', padding: 32 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
            <strong style={{ fontSize: '1.1rem' }}>رمز QR منتهي الصلاحية</strong>
            <p style={{ marginTop: 8, color: 'var(--danger)', opacity: 0.8 }}>
              يرجى التواصل مع منظمي التدريب لتجديد الرمز.
            </p>
          </div>
        )}

        {/* Already done */}
        {phase === 'already' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>تم تسجيل حضورك</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              لقد سجلت حضورك لجميع أيام هذا التدريب. شكراً لمشاركتك!
            </p>
          </div>
        )}

        {/* Success */}
        {phase === 'success' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>تم تسجيل الحضور!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
              مرحباً <strong style={{ color: 'var(--text-primary)' }}>{existingUser?.name}</strong>
            </p>
            <span className="badge badge-purple" style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
              اليوم {dayNumber}
            </span>
          </div>
        )}

        {/* Register Form */}
        {phase === 'register' && (
          <form onSubmit={handleRegister} className="attendee-form">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20, textAlign: 'center' }}>
              مرحباً! يرجى ملء بياناتك للتسجيل
            </p>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* Phone lookup for returning users */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>إذا كنت مسجلاً مسبقاً، أدخل رقم هاتفك:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="07xxxxxxxx" value={phoneLookup} onChange={e => setPhoneLookup(e.target.value)} style={{ direction: 'ltr', flex: 1 }} />
                <button type="button" className="btn btn-secondary" onClick={handlePhoneLookup} disabled={lookingUp} style={{ whiteSpace: 'nowrap' }}>
                  {lookingUp ? <span className="spinner spinner-sm" /> : 'بحث'}
                </button>
              </div>
            </div>

            <div className="divider" style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                أو سجل كمستخدم جديد
              </span>
            </div>

            <div className="form-group">
              <label>الاسم الكامل *</label>
              <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="الاسم الثلاثي" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>الجنس *</label>
                <select value={form.gender} onChange={e => f('gender', e.target.value)} required>
                  <option value="">اختر</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <div className="form-group">
                <label>العمر *</label>
                <input type="number" min={10} max={100} value={form.age} onChange={e => f('age', e.target.value)} placeholder="العمر" required />
              </div>
            </div>

            <div className="form-group">
              <label>رقم الهاتف *</label>
              <input type="tel" value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="07xxxxxxxxx" required style={{ direction: 'ltr' }} />
            </div>

            <div className="form-group">
              <label>المحافظة *</label>
              <select value={form.governorate} onChange={e => f('governorate', e.target.value)} required>
                <option value="">اختر المحافظة</option>
                {getGovernorates().map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>القضاء</label>
              <select value={form.district} onChange={e => f('district', e.target.value)} disabled={!form.governorate}>
                <option value="">اختر القضاء</option>
                {getDistricts(form.governorate).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>الناحية</label>
              <select value={form.subdistrict} onChange={e => f('subdistrict', e.target.value)} disabled={!form.district}>
                <option value="">اختر الناحية</option>
                {getSubdistricts(form.governorate, form.district).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" style={{ marginTop: 8 }} disabled={submitting}>
              {submitting ? <><span className="spinner spinner-sm" /> جاري التسجيل...</> : '✓ تسجيل الحضور'}
            </button>
          </form>
        )}

        {/* Check-in for returning user */}
        {phase === 'checkin' && existingUser && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👋</div>
            <h2 style={{ marginBottom: 6 }}>أهلاً، {existingUser.name.split(' ')[0]}!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              هل تريد تسجيل حضورك لـ <strong>اليوم {dayNumber}</strong>؟
            </p>
            <span className="badge badge-purple" style={{ fontSize: '1rem', padding: '8px 24px', marginBottom: 24, display: 'inline-block' }}>
              اليوم {dayNumber} من {training?.days_count}
            </span>
            <br />
            <button className="btn btn-primary btn-lg w-full" onClick={handleCheckIn} disabled={submitting}>
              {submitting ? <><span className="spinner spinner-sm" /> جاري التسجيل...</> : '✓ تسجيل الحضور الآن'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
