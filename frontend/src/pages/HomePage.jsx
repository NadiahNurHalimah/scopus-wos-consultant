import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { services as servicesApi } from '../lib/api';
import { Spinner, StatusBadge } from '../components/ui';
import { SITE } from '../config/site';

function formatIDR(amount) {
  if (!amount || Number(amount) === 0) return null;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(amount));
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative bg-navy min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-[length:600px] opacity-[0.03]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-gold text-xs font-semibold tracking-wide">✦ Scopus & Web of Science</span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-6">
            {t('hero.title')}
          </h1>
          <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl">
            {t('hero.desc')}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/daftar" className="btn-gold text-base px-8 py-4">
              {t('hero.cta')}
            </Link>
            <a href="#layanan" className="btn-secondary !text-white !border-white/30 text-base px-8 py-4 hover:!bg-white/10">
              {t('hero.cta2')}
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap gap-8 mt-12">
            {[
              { n: '100+', label: 'Naskah Dibantu' },
              { n: '50+',  label: 'Jurnal Terindeks' },
              { n: '95%',  label: 'Tingkat Keberhasilan' },
            ].map((s) => (
              <div key={s.n}>
                <div className="font-heading font-extrabold text-2xl text-gold">{s.n}</div>
                <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
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

// ─── About ────────────────────────────────────────────────────────────────────
function About() {
  const { t } = useTranslation();
  return (
    <section id="tentang" className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block bg-teal/10 text-teal text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Tentang Kami
            </div>
            <h2 className="section-title mb-4">{t('about.title')}</h2>
            <p className="text-gray-600 leading-relaxed mb-8">{t('about.desc')}</p>
            <Link to="/daftar" className="btn-primary">{t('hero.cta')}</Link>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { n: t('about.stat1'), label: t('about.stat1label'), color: 'bg-navy' },
              { n: t('about.stat2'), label: t('about.stat2label'), color: 'bg-teal' },
              { n: t('about.stat3'), label: t('about.stat3label'), color: 'bg-gold' },
            ].map((s) => (
              <div key={s.n} className={`${s.color} rounded-2xl p-6 text-white text-center`}>
                <div className="font-heading font-extrabold text-3xl mb-1">{s.n}</div>
                <div className="text-white/70 text-xs leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────
function Services() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'id';
  const [svcs, setSvcs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

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
              {/* Connector line */}
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

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const { t } = useTranslation();
  return (
    <section id="testimoni" className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-title mb-3">{t('testimonials.title')}</h2>
          <p className="section-subtitle mx-auto">{t('testimonials.subtitle')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-gray-500 text-sm max-w-md">{t('testimonials.empty')}</p>
        </div>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────
function Contact() {
  const { t } = useTranslation();
  return (
    <section id="kontak" className="py-20 bg-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-heading font-bold text-3xl text-white mb-3">{t('contact.title')}</h2>
          <p className="text-white/60 text-sm">{t('contact.subtitle')}</p>
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
            <div key={c.title} className="text-center">
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="font-heading font-semibold text-gold text-sm mb-1">{c.title}</h3>
              {c.href ? (
                <a href={c.href} className="text-white/70 text-sm hover:text-gold transition-colors break-all">
                  {c.value}
                </a>
              ) : (
                <p className="text-white/70 text-sm">{c.value}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <a href={SITE.whatsappLink} target="_blank" rel="noopener noreferrer"
            className="btn-gold px-8 py-4">
            {t('contact.whatsapp_cta')}
          </a>
          <a href={`mailto:${SITE.email}`} className="btn-secondary !text-white !border-white/30 px-8 py-4 hover:!bg-white/10">
            {t('contact.email_cta')}
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Services />
      <HowItWorks />
      <FAQ />
      <Testimonials />
      <Contact />
    </>
  );
}
