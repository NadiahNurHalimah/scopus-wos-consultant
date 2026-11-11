import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { services as servicesApi } from '../lib/api';
import i18n from '../lib/i18n';
import { SITE } from '../config/site';

const SECTION_MAP = [
  { key: 'home',     id: 'beranda' },
  { key: 'services', id: 'layanan' },
  { key: 'how',      id: 'cara-kerja' },
  { key: 'faq',      id: 'faq' },
  { key: 'contact',  id: 'kontak' },
];

export default function Navbar() {
  const { t }            = useTranslation();
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();

  const [open, setOpen]                 = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileSvcOpen, setMobileSvcOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [serviceList, setServiceList]   = useState([]);
  const [activeKey, setActiveKey]       = useState('home');

  const servicesRef = useRef(null);
  const userMenuRef = useRef(null);

  const lang = i18n.language?.slice(0, 2) || 'id';

  useEffect(() => {
    servicesApi.list()
      .then((d) => setServiceList(d.data || []))
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) {
        setServicesOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll spy for active menu on home page
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveKey('');
      return;
    }

    function onScroll() {
      const scrollPos = window.scrollY + 120;
      let current = 'home';
      for (const s of SECTION_MAP) {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= scrollPos) {
          current = s.key;
        }
      }
      setActiveKey(current);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  function toggleLang() {
    const next = lang === 'id' ? 'en' : 'id';
    i18n.changeLanguage(next);
  }

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    setOpen(false);
    navigate('/');
  }

  function goToSection(key, sectionId) {
    setActiveKey(key);
    setOpen(false);
    setServicesOpen(false);
    setMobileSvcOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (sectionId === 'beranda') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  const consultHref = user ? '/dashboard' : '/masuk';

  const navItemClass = (key) =>
    `inline-flex items-center gap-1 py-1 text-sm font-medium transition-colors border-b-2 ${
      activeKey === key
        ? 'text-gold border-gold'
        : 'text-white/80 hover:text-gold border-transparent'
    }`;

  const mobileNavItemClass = (key) =>
    `block px-3 py-2.5 text-sm font-medium transition-colors ${
      activeKey === key
        ? 'text-gold border-b-2 border-gold inline-block'
        : 'text-white/80 hover:text-gold'
    }`;

  return (
    <nav className="fixed top-0 inset-x-0 z-40 bg-navy/95 backdrop-blur-sm shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 min-h-[44px] shrink-0"
            onClick={() => goToSection('home', 'beranda')}
          >
            <img
              src="/logo.png"
              alt={SITE.name}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white p-1 object-contain shadow-sm"
            />
            <span className="font-heading font-bold text-white text-sm leading-tight hidden lg:block">
              Scientia<br />
              <span className="text-gold text-xs font-normal">Advantage</span>
            </span>
          </Link>

          {/* Desktop nav: Beranda, Layanan (dropdown), Cara Kerja, FAQ, Kontak */}
          <div className="hidden md:flex items-center gap-5 lg:gap-7">
            <a
              href="/#beranda"
              onClick={(e) => { e.preventDefault(); goToSection('home', 'beranda'); }}
              className={navItemClass('home')}
            >
              {t('nav.home')}
            </a>

            {/* Layanan with dropdown */}
            <div
              ref={servicesRef}
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <div className="flex items-center">
                <a
                  href="/#layanan"
                  onClick={(e) => {
                    e.preventDefault();
                    goToSection('services', 'layanan');
                  }}
                  className={navItemClass('services')}
                >
                  <span>{t('nav.services')}</span>
                  <svg
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setServicesOpen((v) => !v);
                    }}
                    className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              </div>

              {servicesOpen && (
                <div className="absolute left-0 top-full pt-2 w-64 z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden">
                    {serviceList.length > 0 ? (
                      serviceList.slice(0, 6).map((svc) => (
                        <a
                          key={svc.id}
                          href="/#layanan"
                          onClick={(e) => {
                            e.preventDefault();
                            goToSection('services', 'layanan');
                          }}
                          className="block px-4 py-2.5 text-xs sm:text-sm text-navy hover:bg-cream hover:text-gold transition-colors"
                        >
                          {lang === 'en' ? svc.name_en : svc.name_id}
                        </a>
                      ))
                    ) : (
                      <a
                        href="/#layanan"
                        onClick={(e) => {
                          e.preventDefault();
                          goToSection('services', 'layanan');
                        }}
                        className="block px-4 py-2.5 text-sm text-navy hover:bg-cream hover:text-gold transition-colors"
                      >
                        {t('nav.all_services')}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <a
              href="/#cara-kerja"
              onClick={(e) => { e.preventDefault(); goToSection('how', 'cara-kerja'); }}
              className={navItemClass('how')}
            >
              {t('nav.how')}
            </a>

            <a
              href="/#faq"
              onClick={(e) => { e.preventDefault(); goToSection('faq', 'faq'); }}
              className={navItemClass('faq')}
            >
              {t('nav.faq')}
            </a>

            <a
              href="/#kontak"
              onClick={(e) => { e.preventDefault(); goToSection('contact', 'kontak'); }}
              className={navItemClass('contact')}
            >
              {t('nav.contact')}
            </a>
          </div>

          {/* Right actions: Language switcher, Masuk / User Dropdown, Konsultasi Sekarang, Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language switcher ID/EN */}
            <button
              onClick={toggleLang}
              className="text-white/80 hover:text-gold text-xs font-semibold border border-white/20
                         rounded px-2 py-1 min-h-[36px] transition-colors shrink-0"
              aria-label={t('nav.lang_aria')}
            >
              <span className={lang === 'id' ? 'text-gold font-bold' : 'text-white/60'}>ID</span>
              <span className="mx-0.5 text-white/40">/</span>
              <span className={lang === 'en' ? 'text-gold font-bold' : 'text-white/60'}>EN</span>
            </button>

            {/* Masuk or User dropdown (desktop) */}
            {user ? (
              <div ref={userMenuRef} className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-white/90 hover:text-gold text-sm font-medium
                             px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors min-h-[40px]"
                >
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                    <Link
                      to="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-navy hover:bg-cream hover:text-gold transition-colors"
                    >
                      {t('nav.dashboard')}
                    </Link>
                    <Link
                      to="/profil"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-navy hover:bg-cream hover:text-gold transition-colors"
                    >
                      {t('nav.profile')}
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/masuk"
                className="hidden md:inline-flex items-center text-white/80 hover:text-gold text-sm font-medium min-h-[40px] px-2 transition-colors"
              >
                {t('nav.login')}
              </Link>
            )}

            {/* Primary CTA: Konsultasi Sekarang (always visible, including on mobile) */}
            <Link
              to={consultHref}
              className="btn-gold !py-2 !px-3 sm:!px-4 !text-xs !min-h-[38px] whitespace-nowrap shrink-0"
            >
              {t('nav.consult_now')}
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden text-white p-2 rounded-lg min-h-[40px] min-w-[40px] flex flex-col gap-1.5 items-center justify-center shrink-0"
              aria-label={t('nav.menu_aria')}
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
            <div>
              <a
                href="/#beranda"
                onClick={(e) => { e.preventDefault(); goToSection('home', 'beranda'); }}
                className={mobileNavItemClass('home')}
              >
                {t('nav.home')}
              </a>
            </div>

            {/* Mobile Layanan dropdown */}
            <div>
              <div className="flex items-center justify-between pr-3">
                <a
                  href="/#layanan"
                  onClick={(e) => { e.preventDefault(); goToSection('services', 'layanan'); }}
                  className={mobileNavItemClass('services')}
                >
                  {t('nav.services')}
                </a>
                <button
                  type="button"
                  onClick={() => setMobileSvcOpen((v) => !v)}
                  className="p-2 text-white/70 hover:text-gold"
                  aria-label={t('nav.services')}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${mobileSvcOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {mobileSvcOpen && serviceList.length > 0 && (
                <div className="pl-6 pr-3 py-1 space-y-1 border-l border-white/10 ml-3">
                  {serviceList.slice(0, 6).map((svc) => (
                    <a
                      key={svc.id}
                      href="/#layanan"
                      onClick={(e) => { e.preventDefault(); goToSection('services', 'layanan'); }}
                      className="block py-2 text-xs text-white/70 hover:text-gold transition-colors"
                    >
                      {lang === 'en' ? svc.name_en : svc.name_id}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <a
                href="/#cara-kerja"
                onClick={(e) => { e.preventDefault(); goToSection('how', 'cara-kerja'); }}
                className={mobileNavItemClass('how')}
              >
                {t('nav.how')}
              </a>
            </div>

            <div>
              <a
                href="/#faq"
                onClick={(e) => { e.preventDefault(); goToSection('faq', 'faq'); }}
                className={mobileNavItemClass('faq')}
              >
                {t('nav.faq')}
              </a>
            </div>

            <div>
              <a
                href="/#kontak"
                onClick={(e) => { e.preventDefault(); goToSection('contact', 'kontak'); }}
                className={mobileNavItemClass('contact')}
              >
                {t('nav.contact')}
              </a>
            </div>

            <div className="border-t border-white/10 pt-3 mt-3 px-3 space-y-2">
              {user ? (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gold uppercase tracking-wider pb-1">
                    {user.name}
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="block py-2 text-white/80 hover:text-gold text-sm font-medium"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Link
                    to="/dashboard#profil"
                    onClick={() => setOpen(false)}
                    className="block py-2 text-white/80 hover:text-gold text-sm font-medium"
                  >
                    {t('nav.profile')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left py-2 text-red-400 hover:text-red-300 text-sm font-medium"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <Link
                  to="/masuk"
                  onClick={() => setOpen(false)}
                  className="btn-secondary w-full !text-white !border-white/30 !text-center"
                >
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
