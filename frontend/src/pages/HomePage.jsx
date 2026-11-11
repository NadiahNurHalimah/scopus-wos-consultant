import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { services as servicesApi } from '../lib/api';
import { Spinner } from '../components/ui';
import { SITE } from '../config/site';

function formatIDR(amount) {
  if (!amount || Number(amount) === 0) return null;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(amount));
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const { t }    = useTranslation();
  const { user } = useAuth();
  const consultHref = user ? '/dashboard' : '/masuk';

  return (
    <section id="beranda" className="relative bg-navy min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-[length:600px] opacity-[0.03]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Title, single explanatory sentence, two buttons */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-1.5 mb-6">
              <span className="text-gold text-xs font-semibold tracking-wide">✦ {t('hero.badge')}</span>
            </div>

            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
              {t('hero.desc')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to={consultHref} className="btn-gold text-base px-7 py-3.5">
                {t('hero.cta')}
              </Link>
              <a href="#layanan" className="btn-secondary !text-white !border-white/30 text-base px-7 py-3.5 hover:!bg-white/10">
                {t('hero.cta2')}
              </a>
            </div>
          </div>

          {/* Right: Dedicated image placeholder (no human photos or external images) */}
          <div className="w-full">
            <div
              role="img"
              aria-label={t('hero.image_placeholder')}
              className="relative rounded-2xl border-2 border-dashed border-gold/30 bg-white/5 backdrop-blur-sm p-8 sm:p-12
                         flex flex-col items-center justify-center text-center min-h-[280px] sm:min-h-[360px]"
            >
              <div className="w-20 h-20 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center mb-5">
                <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <p className="font-heading font-semibold text-white text-base sm:text-lg mb-1">
                {t('hero.image_placeholder')}
              </p>
              <p className="text-white/50 text-xs sm:text-sm max-w-xs">
                {t('hero.image_sub')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1200 80" preserveAspectRatio="none" className="w-full h-10 text-cream" fill="currentColor">
          <path d="M0,80 C300,0 900,80 1200,0 L1200,80 Z" />
        </svg>
      </div>
    </section>
  );
}

// ─── Why Choose Us (4 short points) ───────────────────────────────────────────
function WhyChooseUs() {
  const { t } = useTranslation();
  const points = [
    { key: 'p1', icon: '🎯' },
    { key: 'p2', icon: '🎓' },
    { key: 'p3', icon: '📋' },
    { key: 'p4', icon: '🔒' },
  ];

  return (
    <section id="kenapa-kami" className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-title mb-3">{t('why.title')}</h2>
          <p className="section-subtitle mx-auto">{t('why.subtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {points.map((p) => (
            <div
              key={p.key}
              className="bg-white rounded-2xl p-6 border border-cream-dark shadow-sm hover:border-gold/30 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-navy/5 flex items-center justify-center text-2xl mb-4">
                {p.icon}
              </div>
              <h3 className="font-heading font-bold text-navy text-base mb-2">
                {t(`why.${p.key}_title`)}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t(`why.${p.key}_desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────
function Services() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'id';
  const [svcs, setSvcs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    servicesApi.list()
      .then((d) => setSvcs(d.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const icons = ['📚', '✍️', '🔍', '🎯', '📝', '💬'];

  return (
    <section id="layanan" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block bg-gold/10 text-gold-dark text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {t('nav.services')}
          </div>
          <h2 className="section-title mb-3">{t('services.title')}</h2>
          <p className="section-subtitle mx-auto">{t('services.subtitle')}</p>
        </div>

        {loading && (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        )}
        {error && (
          <p className="text-center text-red-500 py-8">{t('common.error')}</p>
        )}
        {!loading && !error && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {svcs.map((svc, i) => {
                const name = lang === 'en' ? svc.name_en : svc.name_id;
                const desc = lang === 'en' ? svc.description_en : svc.description_id;
                const price = formatIDR(svc.price);
                return (
                  <div key={svc.id}
                    className="group relative bg-cream rounded-2xl p-6 border border-cream-dark hover:border-gold/30
                               hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="text-3xl mb-4">{icons[i] || '📄'}</div>
                    <h3 className="font-heading font-bold text-navy text-base mb-2">{name}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3">{desc}</p>
                    {price && (
                      <div className="text-gold font-semibold text-sm">
                        {t('services.price_prefix')} {price}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-gold to-teal
                                    rounded-b-2xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                  </div>
                );
              })}
            </div>
            {svcs.some((s) => formatIDR(s.price)) && (
              <p className="text-center text-gray-400 text-xs mt-6">{t('services.price_note')}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { n: 1, key: 'step1', icon: '👤' },
    { n: 2, key: 'step2', icon: '📤' },
    { n: 3, key: 'step3', icon: '🤝' },
    { n: 4, key: 'step4', icon: '🚀' },
  ];
  return (
    <section id="cara-kerja" className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-title mb-3">{t('how.title')}</h2>
          <p className="section-subtitle mx-auto">{t('how.subtitle')}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.n} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-gold/20" />
              )}
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy text-3xl mb-4 mx-auto shadow-lg">
                {s.icon}
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-gold rounded-full text-white text-xs font-bold flex items-center justify-center">
                  {s.n}
                </span>
              </div>
              <h3 className="font-heading font-bold text-navy text-base mb-2">
                {t(`how.${s.key}_title`)}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t(`how.${s.key}_desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(null);
  const items = [1, 2, 3, 4, 5, 6].map((n) => ({
    q: t(`faq.q${n}`),
    a: t(`faq.a${n}`),
  }));

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-title mb-3">{t('faq.title')}</h2>
          <p className="section-subtitle mx-auto">{t('faq.subtitle')}</p>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-navy font-medium text-sm
                           hover:bg-cream transition-colors min-h-[44px]"
                aria-expanded={open === i}
              >
                <span>{item.q}</span>
                <span className={`text-gold text-xl ml-3 transition-transform duration-200 ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed animate-fade-in border-t border-gray-100">
                  <p className="pt-3">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────
function Contact() {
  const { t } = useTranslation();
  return (
    <section id="kontak" className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-title mb-3">{t('contact.title')}</h2>
          <p className="section-subtitle mx-auto">{t('contact.subtitle')}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {[
            {
              icon: '📍',
              title: t('contact.address'),
              value: `${SITE.address.street}, ${SITE.address.city}`,
              href: null,
            },
            {
              icon: '📱',
              title: t('contact.phone'),
              value: SITE.phone,
              href: SITE.whatsappLink,
            },
            {
              icon: '✉️',
              title: t('contact.email'),
              value: SITE.email,
              href: `mailto:${SITE.email}`,
            },
          ].map((c) => (
            <div key={c.title} className="text-center bg-white rounded-2xl p-6 border border-cream-dark shadow-sm">
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="font-heading font-semibold text-gold-dark text-sm mb-1">{c.title}</h3>
              {c.href ? (
                <a href={c.href} className="text-gray-600 text-sm hover:text-gold transition-colors break-all">
                  {c.value}
                </a>
              ) : (
                <p className="text-gray-600 text-sm">{c.value}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <a href={SITE.whatsappLink} target="_blank" rel="noopener noreferrer"
            className="btn-gold px-8 py-4">
            {t('contact.whatsapp_cta')}
          </a>
          <a href={`mailto:${SITE.email}`} className="btn-secondary px-8 py-4">
            {t('contact.email_cta')}
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Bottom Call to Action (before Footer) ───────────────────────────────────
function BottomCTA() {
  const { t }    = useTranslation();
  const { user } = useAuth();
  const consultHref = user ? '/dashboard' : '/masuk';

  return (
    <section className="py-16 bg-navy border-b border-white/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-4">
          {t('cta_bottom.title')}
        </h2>
        <p className="text-white/70 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
          {t('cta_bottom.desc')}
        </p>
        <Link to={consultHref} className="btn-gold text-base px-8 py-4">
          {t('cta_bottom.btn')}
        </Link>
      </div>
    </section>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <Hero />
      <WhyChooseUs />
      <Services />
      <HowItWorks />
      <FAQ />
      <Contact />
      <BottomCTA />
    </>
  );
}
