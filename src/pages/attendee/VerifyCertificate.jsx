import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

export default function VerifyCertificate() {
  const [params] = useSearchParams();
  const code = params.get('code');
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) {
      setError('No certificate code provided.');
      setLoading(false);
      return;
    }
    verifyCode(code);
  }, [code]);

  const verifyCode = async (certCode) => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id, certificate_code, issued_at,
          users (first_name, second_name, third_name, fourth_name),
          trainings (title, days_count, activities(name, projects(name)))
        `)
        .eq('certificate_code', certCode)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError('Certificate not found or invalid.');
      } else {
        setCertificate(data);
      }
    } catch (err) {
      setError('An error occurred while verifying the certificate.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, background: 'var(--bg-primary)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: '100%', maxWidth: 500, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: certificate ? 'var(--success)' : 'var(--danger)', color: 'white', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            {certificate ? (
              <div style={{ width: 64, height: 64, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            ) : (
              <div style={{ width: 64, height: 64, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            )}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            {certificate ? 'Certificate Verified' : 'Verification Failed'}
          </h1>
          <p style={{ marginTop: 8, opacity: 0.9 }}>
            {certificate ? 'This is a valid certificate issued by our platform.' : error}
          </p>
        </div>

        {/* Content */}
        {certificate && (
          <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Participant Name
                </label>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                  {[certificate.users?.first_name, certificate.users?.second_name, certificate.users?.third_name, certificate.users?.fourth_name].filter(Boolean).join(' ')}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Training Title
                </label>
                <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: 4 }}>
                  {certificate.trainings?.title}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Project / Activity
                </label>
                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {certificate.trainings?.activities?.projects?.name} - {certificate.trainings?.activities?.name}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Certificate ID
                  </label>
                  <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: 4 }}>
                    {certificate.certificate_code}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Issued On
                  </label>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 4 }}>
                    {format(new Date(certificate.issued_at), 'dd MMM yyyy')}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        <div style={{ padding: '20px 32px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <img src="/logo.png" alt="TGH Logo" style={{ height: 40, opacity: 0.8 }} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
            TGH Trainings Platform
          </div>
        </div>
      </div>
    </div>
  );
}
