import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import i18n from '../lib/i18n';
import { SITE } from '../config/site';

export default function Navbar() {
  const { t }          = useTranslation();
  const { user, logout } = useAuth();
  const navigate       = useNavigate();
  const [open, setOpen] = useState(false);

  const lang = i18n.language?.slice(0, 2) || 'id';

  function toggleLang() {
    const next = lang === 'id' ? 'en' : 'id';
    i18n.changeLanguage(next);
  }

  function handleLogout() {
    logout();
    setOpen(false);
  }

  const navLinks = [
    { href: '/#layanan',   label: t('nav.services') },
    { href: '/#cara-kerja', label: t('nav.how') },
    { href: '/#faq',       label: t('nav.faq') },
    { href: '/#kontak',    label: t('nav.contact') },
  ];

  return (
    <nav className="fixed top-0 inset-x-0 z-40 bg-navy/95 backdrop-blur-sm shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 min-h-[44px]" onClick={() => setOpen(false)}>
            <img src="/logo.png" alt={SITE.name} className="h-10 w-10 rounded-lg bg-white p-1 object-contain shadow-sm" />
            <span className="font-heading font-bold text-white text-sm leading-tight hidden sm:block">
              Scientia<br />
              <span className="text-gold text-xs font-normal">Advantage</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}
                className="text-white/80 hover:text-gold text-sm font-medium transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <button
              onClick={toggleLang}
              className="text-white/70 hover:text-gold text-xs font-semibold border border-white/20
                         rounded px-2 py-1 min-h-[36px] min-w-[44px] transition-colors"
              aria-label="Ganti bahasa"
            >
              {lang === 'id' ? 'EN' : 'ID'}
            </button>

            {user ? (
              <>
                <Link to="/dashboard"
                  className="hidden sm:inline-flex text-white/80 hover:text-gold text-sm font-medium transition-colors min-h-[44px] items-center">
                  {t('nav.dashboard')}
                </Link>
                <button onClick={handleLogout}
                  className="btn-primary !py-2 !px-4 !text-xs hidden sm:inline-flex">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/masuk" className="text-white/80 hover:text-gold text-sm font-medium min-h-[44px] items-center hidden sm:flex transition-colors">
                  {t('nav.login')}
                </Link>
                <Link to="/daftar" className="btn-gold !py-2 !px-4 !text-xs hidden sm:inline-flex">
                  {t('nav.register')}
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden text-white p-2 rounded-lg min-h-[44px] min-w-[44px] flex flex-col gap-1.5 items-center justify-center"
              aria-label="Menu"
            >
              <span className={`block h-0.5 w-5 bg-white transition-all ${open ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-5 bg-white transition-all ${open ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-5 bg-white transition-all ${open ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-white/10 py-4 space-y-1 animate-fade-in">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="block px-3 py-3 text-white/80 hover:text-gold hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                {l.label}
              </a>
            ))}
            <div className="border-t border-white/10 pt-3 mt-3 flex flex-col gap-2 px-3">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)}
                    className="block py-3 text-white/80 hover:text-gold text-sm font-medium">
                    {t('nav.dashboard')}
                  </Link>
                  <button onClick={handleLogout} className="btn-primary w-full">{t('nav.logout')}</button>
                </>
              ) : (
                <>
                  <Link to="/masuk" onClick={() => setOpen(false)} className="btn-secondary w-full !text-white !border-white/30 !text-center">
                    {t('nav.login')}
                  </Link>
                  <Link to="/daftar" onClick={() => setOpen(false)} className="btn-gold w-full !text-center">
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
