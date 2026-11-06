import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Input, Button, Spinner } from '../components/ui';

function validate(form) {
  const errs = {};
  if (!form.email) errs.email = 'auth.email_required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'auth.email_invalid';
  if (!form.password) errs.password = 'auth.password_required';
  else if (form.password.length < 8) errs.password = 'auth.password_min';
  return errs;
}

export default function LoginPage() {
  const { t }      = useTranslation();
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]     = useState({ email: '', password: '' });
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
      await login(form.email.trim().toLowerCase(), form.password);
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
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png" alt="Scientia Advantage" className="h-24 w-auto object-contain mx-auto mb-4" />
          </Link>
          <h1 className="font-heading font-bold text-2xl text-navy">{t('auth.login_title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('auth.login_subtitle')}</p>
        </div>

        <div className="card shadow-xl border border-gray-100">
          {apiErr && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {apiErr}
            </div>
          )}

          <form onSubmit={submit} noValidate className="space-y-5">
            <Input
              id="email" name="email" type="email"
              label={t('auth.email')}
              value={form.email}
              onChange={change}
              placeholder="anda@email.com"
              autoComplete="email"
              error={errors.email ? t(errors.email) : ''}
            />
            <Input
              id="password" name="password" type="password"
              label={t('auth.password')}
              value={form.password}
              onChange={change}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password ? t(errors.password) : ''}
            />
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? (
                <><Spinner size="sm" />{t('auth.logging_in')}</>
              ) : t('auth.login_btn')}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {t('auth.no_account')}{' '}
            <Link to="/daftar" className="text-navy font-semibold hover:text-gold transition-colors">
              {t('nav.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
