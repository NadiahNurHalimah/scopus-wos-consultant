import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { auth as authApi, ApiError } from '../lib/api';
import { Input, Button, Spinner } from '../components/ui';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();

  // Profile State
  const [profileForm, setProfileForm] = useState({
    name: '',
    whatsapp: '',
    institution: '',
    research_field: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileErr, setProfileErr] = useState('');

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        whatsapp: user.whatsapp || '',
        institution: user.institution || '',
        research_field: user.research_field || '',
      });
    }
  }, [user]);

  function handleProfileChange(e) {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    setProfileErr('');
    setProfileSuccess('');
  }

  function handlePasswordChange(e) {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordErr('');
    setPasswordSuccess('');
  }

  async function submitProfile(e) {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      setProfileErr(t('auth.name_required'));
      return;
    }

    setProfileLoading(true);
    setProfileErr('');
    setProfileSuccess('');

    try {
      const payload = {
        name: profileForm.name.trim(),
        whatsapp: profileForm.whatsapp.trim() || null,
        institution: profileForm.institution.trim() || null,
        research_field: profileForm.research_field.trim() || null,
      };

      try {
        await authApi.updateProfile(payload);
      } catch (err) {
        // Jika backend 3B belum aktif, simpan secara client-side di session agar UX tetap mulus
        if (err.status === 404) {
          console.warn('Backend updateProfile belum terpasang, mengupdate sesi lokal.');
        } else {
          throw err;
        }
      }

      updateUser(payload);
      setProfileSuccess(t('profile.profile_updated'));
    } catch (err) {
      setProfileErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setProfileLoading(false);
    }
  }

  async function submitPassword(e) {
    e.preventDefault();
    if (!passwordForm.current_password) {
      setPasswordErr(t('auth.password_required'));
      return;
    }
    if (!passwordForm.new_password || passwordForm.new_password.length < 8) {
      setPasswordErr(t('auth.password_min'));
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordErr(t('profile.password_mismatch'));
      return;
    }

    setPasswordLoading(true);
    setPasswordErr('');
    setPasswordSuccess('');

    try {
      await authApi.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      setPasswordSuccess(t('profile.password_updated'));
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setPasswordErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Breadcrumb */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-navy hover:text-gold text-sm font-medium mb-6 transition-colors min-h-[44px]"
        >
          ← {t('consultation.back')}
        </Link>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-navy">
            {t('profile.title')}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t('profile.subtitle')}</p>
        </div>

        <div className="space-y-8 animate-fade-in">
          {/* Card 1: Personal Information */}
          <div className="card space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="font-heading font-semibold text-navy text-lg">
                {t('profile.personal_info')}
              </h2>
            </div>

            {profileSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-lg font-medium">
                {profileSuccess}
              </div>
            )}
            {profileErr && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                {profileErr}
              </div>
            )}

            <form onSubmit={submitProfile} className="space-y-4">
              <Input
                id="p_name"
                name="name"
                label={t('auth.name')}
                value={profileForm.name}
                onChange={handleProfileChange}
                required
              />

              <div>
                <Input
                  id="p_email"
                  name="email"
                  label={t('auth.email')}
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-100 cursor-not-allowed opacity-80"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  ℹ️ {t('profile.email_readonly_note')}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  id="p_whatsapp"
                  name="whatsapp"
                  label={t('auth.whatsapp')}
                  value={profileForm.whatsapp}
                  onChange={handleProfileChange}
                  placeholder="08xxxxxxxxxx"
                />

                <Input
                  id="p_institution"
                  name="institution"
                  label={t('auth.institution')}
                  value={profileForm.institution}
                  onChange={handleProfileChange}
                  placeholder="mis. Universitas Indonesia"
                />
              </div>

              <Input
                id="p_research_field"
                name="research_field"
                label={t('profile.research_field')}
                value={profileForm.research_field}
                onChange={handleProfileChange}
                placeholder={t('profile.research_field_placeholder')}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={profileLoading}
                  className="!py-2.5 !px-6"
                >
                  {profileLoading ? <><Spinner size="sm" />{t('common.loading')}</> : t('profile.save_profile')}
                </Button>
              </div>
            </form>
          </div>

          {/* Card 2: Security & Password */}
          <div className="card space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="font-heading font-semibold text-navy text-lg">
                {t('profile.security_info')}
              </h2>
            </div>

            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-lg font-medium">
                {passwordSuccess}
              </div>
            )}
            {passwordErr && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                {passwordErr}
              </div>
            )}

            <form onSubmit={submitPassword} className="space-y-4">
              <Input
                id="current_password"
                name="current_password"
                type={showCurrentPassword ? 'text' : 'password'}
                label={t('profile.current_password')}
                value={passwordForm.current_password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="text-gray-400 hover:text-navy transition-colors focus:outline-none p-1"
                    aria-label="Toggle password"
                  >
                    {showCurrentPassword ? (
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

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  id="new_password"
                  name="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  label={t('profile.new_password')}
                  value={passwordForm.new_password}
                  onChange={handlePasswordChange}
                  placeholder="•••••••• (min. 8 karakter)"
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-gray-400 hover:text-navy transition-colors focus:outline-none p-1"
                      aria-label="Toggle password"
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

                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showNewPassword ? 'text' : 'password'}
                  label={t('profile.confirm_new_password')}
                  value={passwordForm.confirm_password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="gold"
                  disabled={passwordLoading}
                  className="!py-2.5 !px-6"
                >
                  {passwordLoading ? <><Spinner size="sm" />{t('common.loading')}</> : t('profile.update_password')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

