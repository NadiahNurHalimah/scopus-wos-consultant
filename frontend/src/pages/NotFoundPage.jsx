import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 pt-16">
      <div className="text-center max-w-md">
        <div className="font-heading font-extrabold text-8xl text-navy/10 mb-4">404</div>
        <h1 className="font-heading font-bold text-2xl text-navy mb-3">{t('common.not_found')}</h1>
        <p className="text-gray-500 text-sm mb-8">{t('common.not_found_desc')}</p>
        <Link to="/" className="btn-primary px-8 py-3">{t('common.back_home')}</Link>
      </div>
    </div>
  );
}
