import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { auth as authApi, ApiError } from '../lib/api';
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

  // Mode: 'login' | 'forgot' | 'reset'
  const [viewMode, setViewMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [form, setForm]         = useState({ email: '', password: '' });
  const [resetForm, setResetForm] = useState({ email: '', code: '', new_password: '' });
  const [errors, setErrors]     = useState({});
  const [apiErr, setApiErr]     = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [loading, setLoading]   = useState(false);

  function change(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => { const copy = { ...e }; delete copy[name]; return copy; });
    setApiErr('');
    setApiSuccess('');
  }

  function changeReset(e) {
    const { name, value } = e.target;
    setResetForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => { const copy = { ...e }; delete copy[name]; return copy; });
    setApiErr('');
    setApiSuccess('');
  }

  async function submitLogin(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiErr('');
    try {
      await login(form.email.trim().toLowerCase(), form.password);
      navigate('/dashboard');
    } catch (err) {
      setApiErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function submitRequestCode(e) {
    e.preventDefault();
    if (!resetForm.email) {
      setErrors({ email: 'auth.email_required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetForm.email)) {
      setErrors({ email: 'auth.email_invalid' });
      return;
    }

    setLoading(true);
    setApiErr('');
    setApiSuccess('');
    try {
      const res = await authApi.forgotPassword({ email: resetForm.email.trim().toLowerCase() });
      setApiSuccess(res.message || t('auth.code_sent_info'));
      setViewMode('reset');
    } catch (err) {
      setApiErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function submitResetPassword(e) {
    e.preventDefault();
    const errs = {};
    if (!resetForm.code.trim()) errs.code = 'auth.code_required';
    if (!resetForm.new_password) errs.new_password = 'auth.password_required';
    else if (resetForm.new_password.length < 8) errs.new_password = 'auth.password_min';

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setApiErr('');
    setApiSuccess('');
    try {
      const res = await authApi.resetPassword({
        email: resetForm.email.trim().toLowerCase(),
        code: resetForm.code.trim(),
        new_password: resetForm.new_password,
      });
      setApiSuccess(res.message);
      // Pindah kembali ke login
      setTimeout(() => {
        setForm({ email: resetForm.email, password: '' });
        setViewMode('login');
      }, 1500);
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
          <h1 className="font-heading font-bold text-2xl text-navy">
            {viewMode === 'login' ? t('auth.login_title') : t('auth.forgot_password_title')}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {viewMode === 'login' ? t('auth.login_subtitle') : t('auth.forgot_password_subtitle')}
          </p>
        </div>

        <div className="card shadow-xl border border-gray-100">
          {apiErr && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {apiErr}
            </div>
          )}

          {apiSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              {apiSuccess}
            </div>
          )}

          {/* VIEW: LOGIN */}
          {viewMode === 'login' && (
            <form onSubmit={submitLogin} noValidate className="space-y-5">
              <Input
                id="email" name="email" type="email"
                label={t('auth.email')}
                value={form.email}
                onChange={change}
                placeholder="anda@email.com"
                autoComplete="email"
                error={errors.email ? t(errors.email) : ''}
              />
              <div>
                <Input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  label={t('auth.password')}
                  value={form.password}
                  onChange={change}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setResetForm((f) => ({ ...f, email: form.email }));
                      setApiErr('');
                      setApiSuccess('');
                      setViewMode('forgot');
                    }}
                    className="text-xs text-navy/70 hover:text-gold transition-colors font-medium"
                  >
                    {t('auth.forgot_password')}
                  </button>
                </div>
              </div>
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? (
                  <><Spinner size="sm" />{t('auth.logging_in')}</>
                ) : t('auth.login_btn')}
              </Button>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD (Kirim Kode) */}
          {viewMode === 'forgot' && (
            <form onSubmit={submitRequestCode} noValidate className="space-y-5">
              <Input
                id="reset_email" name="email" type="email"
                label={t('auth.email')}
                value={resetForm.email}
                onChange={changeReset}
                placeholder="anda@email.com"
                autoComplete="email"
                error={errors.email ? t(errors.email) : ''}
              />
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? (
                  <><Spinner size="sm" />{t('auth.sending_code')}</>
                ) : t('auth.send_code')}
              </Button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setApiErr('');
                    setApiSuccess('');
                    setViewMode('login');
                  }}
                  className="text-sm text-navy hover:text-gold font-medium transition-colors"
                >
                  &larr; {t('auth.back_to_login')}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: RESET PASSWORD (Masukkan Kode & Password Baru) */}
          {viewMode === 'reset' && (
            <form onSubmit={submitResetPassword} noValidate className="space-y-4">
              <Input
                id="reset_code" name="code" type="text"
                label={t('auth.code_label')}
                value={resetForm.code}
                onChange={changeReset}
                placeholder={t('auth.code_placeholder')}
                error={errors.code ? t(errors.code) : ''}
              />
              <Input
                id="new_password" name="new_password"
                type={showNewPassword ? 'text' : 'password'}
                label={t('auth.new_password')}
                value={resetForm.new_password}
                onChange={changeReset}
                placeholder="Min. 8 karakter"
                autoComplete="new-password"
                error={errors.new_password ? t(errors.new_password) : ''}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-gray-400 hover:text-navy transition-colors focus:outline-none p-1"
                    aria-label={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showNewPassword ? (
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
              <Button type="submit" variant="primary" className="w-full !mt-5" disabled={loading}>
                {loading ? (
                  <><Spinner size="sm" />{t('auth.resetting_password')}</>
                ) : t('auth.reset_password_btn')}
              </Button>
              <div className="flex justify-between items-center pt-2 text-xs">
                <button
                  type="button"
                  onClick={submitRequestCode}
                  disabled={loading}
                  className="text-navy/70 hover:text-gold font-medium transition-colors"
                >
                  {t('auth.send_code')} ulang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiErr('');
                    setApiSuccess('');
                    setViewMode('login');
                  }}
                  className="text-navy hover:text-gold font-medium transition-colors"
                >
                  &larr; {t('auth.back_to_login')}
                </button>
              </div>
            </form>
          )}

          {viewMode === 'login' && (
            <p className="text-center text-sm text-gray-500 mt-5">
              {t('auth.no_account')}{' '}
              <Link to="/daftar" className="text-navy font-semibold hover:text-gold transition-colors">
                {t('nav.register')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
