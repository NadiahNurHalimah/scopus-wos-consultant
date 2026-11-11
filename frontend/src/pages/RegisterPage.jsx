import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Input, Button, Spinner } from '../components/ui';

function validate(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = 'auth.name_required';
  if (!form.email) errs.email = 'auth.email_required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'auth.email_invalid';
  if (!form.password) errs.password = 'auth.password_required';
  else if (form.password.length < 8) errs.password = 'auth.password_min';
  return errs;
}

export default function RegisterPage() {
  const { t }        = useTranslation();
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', whatsapp: '', institution: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiErr, setApiErr] = useState('');
  const [loading, setLoading] = useState(false);

  function change(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => { const copy = { ...e }; delete copy[name]; return copy; });
    setApiErr('');
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        whatsapp: form.whatsapp || undefined,
        institution: form.institution || undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      setApiErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png" alt="Scientia Advantage" className="h-24 w-auto object-contain mx-auto mb-4" />
          </Link>
          <h1 className="font-heading font-bold text-2xl text-navy">{t('auth.register_title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('auth.register_subtitle')}</p>
        </div>

        <div className="card shadow-xl">
          {apiErr && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {apiErr}
            </div>
          )}

          <form onSubmit={submit} noValidate className="space-y-4">
            <Input
              id="name" name="name" type="text"
              label={t('auth.name')}
              value={form.name} onChange={change}
              placeholder="Nama lengkap Anda"
              autoComplete="name"
              error={errors.name ? t(errors.name) : ''}
            />
            <Input
              id="email" name="email" type="email"
              label={t('auth.email')}
              value={form.email} onChange={change}
              placeholder="anda@email.com"
              autoComplete="email"
              error={errors.email ? t(errors.email) : ''}
            />
            <Input
              id="password" name="password"
              type={showPassword ? 'text' : 'password'}
              label={t('auth.password')}
              value={form.password} onChange={change}
              placeholder="Min. 8 karakter"
              autoComplete="new-password"
              error={errors.password ? t(errors.password) : ''}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-navy transition-colors focus:outline-none p-1"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              }
            />
            <Input
              id="whatsapp" name="whatsapp" type="tel"
              label={`${t('auth.whatsapp')} (opsional)`}
              value={form.whatsapp} onChange={change}
              placeholder="+62812..."
              autoComplete="tel"
            />
            <Input
              id="institution" name="institution" type="text"
              label={`${t('auth.institution')} (opsional)`}
              value={form.institution} onChange={change}
              placeholder="Universitas / Lembaga Anda"
            />
            <Button type="submit" variant="primary" className="w-full !mt-6" disabled={loading}>
              {loading ? (
                <><Spinner size="sm" />{t('auth.registering')}</>
              ) : t('auth.register_btn')}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {t('auth.have_account')}{' '}
            <Link to="/masuk" className="text-navy font-semibold hover:text-gold transition-colors">
              {t('nav.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
