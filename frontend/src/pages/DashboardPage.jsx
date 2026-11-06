import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { consultations as consultApi, services as servicesApi, ApiError } from '../lib/api';
import { Spinner, EmptyState, ErrorBox, StatusBadge, Button, Select, Input, Textarea, Modal } from '../components/ui';

// ─── Status label helper ───────────────────────────────────────────────────────
function useStatusLabel() {
  const { t } = useTranslation();
  return (status) => t(`status.${status}`, { defaultValue: status });
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── New Consultation Form ────────────────────────────────────────────────────
function NewConsultationModal({ open, onClose, onCreated }) {
  const { t }      = useTranslation();
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    service_id: '', manuscript_title: '', field: '',
    target_index: '', target_quartile: '', notes: '',
  });
  const [errors, setErrors]   = useState({});
  const [apiErr, setApiErr]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      servicesApi.list().then((d) => setServices(d.data || [])).catch(() => {});
    }
  }, [open]);

  function change(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => { const c = { ...er }; delete c[name]; return c; });
    setApiErr('');
  }

  function validate() {
    const errs = {};
    if (!form.service_id) errs.service_id = t('consultation.service_required');
    if (!form.manuscript_title.trim()) errs.manuscript_title = t('consultation.title_required');
    else if (form.manuscript_title.trim().length < 5) errs.manuscript_title = t('consultation.title_min');
    return errs;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        service_id: Number(form.service_id),
        manuscript_title: form.manuscript_title.trim(),
        field: form.field || undefined,
        target_index: form.target_index || undefined,
        target_quartile: form.target_quartile || undefined,
        notes: form.notes || undefined,
      };
      const data = await consultApi.create(payload);
      onCreated(data.data);
      onClose();
      setForm({ service_id: '', manuscript_title: '', field: '', target_index: '', target_quartile: '', notes: '' });
    } catch (err) {
      setApiErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'id';

  return (
    <Modal open={open} title={t('consultation.title')} onClose={onClose}>
      {apiErr && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{apiErr}</div>
      )}
      <form onSubmit={submit} noValidate className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Select
          id="service_id" name="service_id"
          label={t('consultation.service')}
          value={form.service_id} onChange={change}
          error={errors.service_id}
        >
          <option value="">{t('consultation.service_placeholder')}</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {lang === 'en' ? s.name_en : s.name_id}
            </option>
          ))}
        </Select>

        <Input
          id="manuscript_title" name="manuscript_title" type="text"
          label={t('consultation.manuscript_title')}
          value={form.manuscript_title} onChange={change}
          placeholder={t('consultation.manuscript_title_placeholder')}
          error={errors.manuscript_title}
        />
        <Input
          id="field" name="field" type="text"
          label={`${t('consultation.field')} (opsional)`}
          value={form.field} onChange={change}
          placeholder={t('consultation.field_placeholder')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select id="target_index" name="target_index"
            label={t('consultation.target_index')}
            value={form.target_index} onChange={change}>
            <option value="">{t('consultation.target_index_placeholder')}</option>
            <option value="Scopus">Scopus</option>
            <option value="WoS">Web of Science</option>
            <option value="Scopus & WoS">Scopus & WoS</option>
          </Select>
          <Select id="target_quartile" name="target_quartile"
            label={t('consultation.target_quartile')}
            value={form.target_quartile} onChange={change}>
            <option value="">{t('consultation.target_quartile_placeholder')}</option>
            {['Q1','Q2','Q3','Q4'].map((q) => <option key={q} value={q}>{q}</option>)}
          </Select>
        </div>

        <Textarea
          id="notes" name="notes"
          label={`${t('consultation.notes')} (opsional)`}
          value={form.notes} onChange={change}
          placeholder={t('consultation.notes_placeholder')}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
            {loading ? <><Spinner size="sm" />{t('consultation.submitting')}</> : t('consultation.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Consultation Card ────────────────────────────────────────────────────────
function ConsultationCard({ c }) {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language?.slice(0, 2) || 'id';
  const statusLabel = useStatusLabel();
  const svcName = lang === 'en' ? c.service_name_en : c.service_name_id;

  return (
    <Link to={`/dashboard/konsultasi/${c.id}`}
      className="block card hover:border-navy/20 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-bold text-navy text-sm truncate">{c.manuscript_title}</p>
          <p className="text-gray-400 text-xs mt-0.5">{c.code}</p>
        </div>
        <StatusBadge status={c.status} label={statusLabel(c.status)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>📋 {svcName}</span>
        {c.field && <span>🔬 {c.field}</span>}
        {c.target_index && <span>🎯 {c.target_index}</span>}
        <span className="ml-auto">{formatDate(c.created_at)}</span>
      </div>
    </Link>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t }    = useTranslation();
  const { user } = useAuth();

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showModal, setShowModal] = useState(false);

  function load() {
    setLoading(true);
    consultApi.list()
      .then((d) => { setConsultations(d.data || []); setError(''); })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('common.error')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function handleCreated(newC) {
    setConsultations((prev) => [newC, ...prev]);
  }

  return (
    <div className="min-h-screen bg-cream pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl text-navy">
              {t('dashboard.welcome', { name: user?.name?.split(' ')[0] || '' })}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{t('dashboard.my_consultations')}</p>
          </div>
          <Button variant="gold" onClick={() => setShowModal(true)}>
            + {t('dashboard.new_consultation')}
          </Button>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        )}
        {error && !loading && (
          <ErrorBox message={error} onRetry={load} />
        )}
        {!loading && !error && consultations.length === 0 && (
          <EmptyState
            icon="📋"
            title={t('dashboard.no_consultations')}
            description={t('dashboard.no_consultations_desc')}
            action={
              <Button variant="primary" onClick={() => setShowModal(true)}>
                {t('dashboard.start_now')}
              </Button>
            }
          />
        )}
        {!loading && !error && consultations.length > 0 && (
          <div className="space-y-4">
            {consultations.map((c) => <ConsultationCard key={c.id} c={c} />)}
          </div>
        )}
      </div>

      <NewConsultationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
