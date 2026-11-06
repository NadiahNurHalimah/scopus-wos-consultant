import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SITE } from '../config/site';

export default function Footer() {
  const { t } = useTranslation();
  const year  = new Date().getFullYear();

  const links = [
    { href: '/#layanan',    label: t('nav.services') },
    { href: '/#cara-kerja', label: t('nav.how') },
    { href: '/#faq',        label: t('nav.faq') },
    { href: '/#kontak',     label: t('nav.contact') },
  ];

  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt={SITE.name} className="h-11 w-11 rounded-lg bg-white p-1 object-contain shadow-sm" />
              <div>
                <p className="font-heading font-bold text-white">Scientia Advantage</p>
                <p className="text-gold text-xs">Publication Consultancy</p>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{t('footer.tagline')}</p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-heading font-semibold text-gold mb-4 text-sm uppercase tracking-wider">
              {t('footer.links')}
            </h3>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-white/60 hover:text-gold text-sm transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-semibold text-gold mb-4 text-sm uppercase tracking-wider">
              {t('contact.title')}
            </h3>
            <ul className="space-y-3 text-sm text-white/60">
              <li className="flex gap-2">
                <span>📍</span>
                <span>{SITE.address.street}, {SITE.address.city}</span>
              </li>
              <li className="flex gap-2">
                <span>📱</span>
                <a href={SITE.whatsappLink} className="hover:text-gold transition-colors">{SITE.phone}</a>
              </li>
              <li className="flex gap-2">
                <span>✉️</span>
                <a href={`mailto:${SITE.email}`} className="hover:text-gold transition-colors">{SITE.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center">
          <p className="text-white/40 text-xs">
            {t('footer.copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
