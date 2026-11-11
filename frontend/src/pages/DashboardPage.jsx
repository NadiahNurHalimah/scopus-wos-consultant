import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  consultations as consultApi,
  services as servicesApi,
  payments as paymentApi,
  settings as settingsApi,
  admin as adminApi,
  ApiError,
} from '../lib/api';
import {
  Spinner,
  EmptyState,
  ErrorBox,
  StatusBadge,
  PaymentStatusBadge,
  Button,
  Select,
  Input,
  Textarea,
  Modal,
} from '../components/ui';

// ─── Status label helper ───────────────────────────────────────────────────────
function useStatusLabel() {
  const { t } = useTranslation();
  return (status) => t(`status.${status}`, { defaultValue: status });
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(num) {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
}

// ─── New Consultation Modal (Client) ──────────────────────────────────────────
function NewConsultationModal({ open, onClose, onCreated }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.language?.slice(0, 2) || 'id';

  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    service_id: '',
    manuscript_title: '',
    field: '',
    target_index: '',
    target_quartile: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [apiErr, setApiErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      servicesApi
        .list()
        .then((d) => setServices(d.data || []))
        .catch(() => {});

      // Auto pre-fill dari profil pengguna
      if (user) {
        setForm((f) => ({
          ...f,
          field: f.field || user.research_field || '',
        }));
      }
    }
  }, [open, user]);

  function change(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => {
      const c = { ...er };
      delete c[name];
      return c;
    });
    setApiErr('');
  }

  function validate() {
    const errs = {};
    if (!form.service_id) errs.service_id = t('consultation.service_required');
    if (!form.manuscript_title.trim()) errs.manuscript_title = t('consultation.title_required');
    else if (form.manuscript_title.trim().length < 5)
      errs.manuscript_title = t('consultation.title_min');
    return errs;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

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
      setForm({
        service_id: '',
        manuscript_title: '',
        field: '',
        target_index: '',
        target_quartile: '',
        notes: '',
      });
    } catch (err) {
      setApiErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  const selectedService = services.find((s) => s.id === Number(form.service_id));

  return (
    <Modal open={open} title={t('consultation.title')} onClose={onClose} maxWidth="max-w-lg">
      {apiErr && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {apiErr}
        </div>
      )}

      {/* Profile info preview */}
      {user && (
        <div className="bg-cream/60 border border-gray-200 rounded-xl p-3 text-xs text-navy space-y-1 mb-4">
          <p className="font-semibold text-navy flex items-center gap-1.5">
            <span>👤</span> Data Pengusul (Profil Anda):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-gray-600 pt-1">
            <p><span className="text-gray-400">Nama:</span> <span className="font-medium text-navy">{user.name}</span></p>
            <p><span className="text-gray-400">WhatsApp:</span> <span className="font-medium text-navy">{user.whatsapp || '-'}</span></p>
            <p className="sm:col-span-2"><span className="text-gray-400">Institusi:</span> <span className="font-medium text-navy">{user.institution || '-'}</span></p>
          </div>
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Select
          id="service_id"
          name="service_id"
          label={t('consultation.service')}
          value={form.service_id}
          onChange={change}
          error={errors.service_id}
          required
        >
          <option value="">{t('consultation.service_placeholder')}</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {lang === 'en' ? s.name_en : s.name_id}
            </option>
          ))}
        </Select>

        {/* Selected Service Price & Summary */}
        {selectedService && (
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-3.5 space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="font-heading font-semibold text-navy text-sm">
                {lang === 'en' ? selectedService.name_en : selectedService.name_id}
              </p>
              <p className="font-extrabold text-teal text-base">
                {formatCurrency(selectedService.price)}
              </p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {lang === 'en' ? selectedService.description_en : selectedService.description_id}
            </p>
            <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gold/20">
              ℹ️ {t('consultation.payment_note')}
            </p>
          </div>
        )}

        <Input
          id="manuscript_title"
          name="manuscript_title"
          type="text"
          label={t('consultation.manuscript_title')}
          value={form.manuscript_title}
          onChange={change}
          placeholder={t('consultation.manuscript_title_placeholder')}
          error={errors.manuscript_title}
          required
        />

        <Input
          id="field"
          name="field"
          type="text"
          label={`${t('consultation.field')} (opsional)`}
          value={form.field}
          onChange={change}
          placeholder={t('consultation.field_placeholder')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            id="target_index"
            name="target_index"
            label={t('consultation.target_index')}
            value={form.target_index}
            onChange={change}
          >
            <option value="">{t('consultation.target_index_placeholder')}</option>
            <option value="Scopus">Scopus</option>
            <option value="WoS">Web of Science</option>
            <option value="Scopus & WoS">Scopus & WoS</option>
          </Select>

          <Select
            id="target_quartile"
            name="target_quartile"
            label={t('consultation.target_quartile')}
            value={form.target_quartile}
            onChange={change}
          >
            <option value="">{t('consultation.target_quartile_placeholder')}</option>
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </Select>
        </div>

        <Textarea
          id="notes"
          name="notes"
          label={`${t('consultation.notes')} (opsional)`}
          value={form.notes}
          onChange={change}
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
function ConsultationCard({ c, currentUserRole }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'id';
  const statusLabel = useStatusLabel();
  const svcName = lang === 'en' ? c.service_name_en : c.service_name_id;

  return (
    <Link
      to={`/dashboard/konsultasi/${c.id}`}
      className="block card hover:border-navy/20 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-heading font-bold text-navy text-sm truncate">{c.manuscript_title}</p>
            {Number(c.unread_count) > 0 && (
              <span className="bg-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                💬 {c.unread_count} baru
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-0.5">{c.code}</p>
        </div>
        <StatusBadge status={c.status} label={statusLabel(c.status)} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>📋 {svcName}</span>
        {currentUserRole !== 'client' && c.client_name && (
          <span>👤 {t('dashboard.client')}: {c.client_name}</span>
        )}
        {c.consultant_name && <span>🎓 {c.consultant_name}</span>}
        {c.field && <span>🔬 {c.field}</span>}
        {c.target_index && <span>🎯 {c.target_index}</span>}
        <span className="ml-auto">{formatDate(c.created_at)}</span>
      </div>
    </Link>
  );
}

// ─── TAB: Admin Payments Verification ─────────────────────────────────────────
function AdminPaymentsTab() {
  const { t } = useTranslation();
  const [paymentsList, setPaymentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const loadPayments = useCallback(() => {
    setLoading(true);
    paymentApi
      .list({ status: statusFilter, q: searchQuery })
      .then((res) => {
        setPaymentsList(res.data || []);
        setError('');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [statusFilter, searchQuery, t]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  async function downloadProof(pId, code) {
    setDownloadingId(pId);
    try {
      const blob = await paymentApi.downloadProof(pId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bukti_transfer_${code || pId}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleApprove() {
    if (!approveTarget) return;
    setActionLoading(true);
    setActionErr('');
    try {
      await paymentApi.update(approveTarget.id, { status: 'paid' });
      setApproveTarget(null);
      loadPayments();
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    if (!rejectTarget || !rejectNote.trim()) return;
    setActionLoading(true);
    setActionErr('');
    try {
      await paymentApi.update(rejectTarget.id, { status: 'rejected', reject_note: rejectNote.trim() });
      setRejectTarget(null);
      setRejectNote('');
      loadPayments();
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {['', 'pending', 'paid', 'rejected'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === '' ? t('dashboard.filter_all') : t(`payment.status_${st}`)}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            id="p_search"
            type="text"
            placeholder={t('dashboard.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="!py-1.5 text-xs"
          />
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={loadPayments} />}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : paymentsList.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 text-sm">
          {t('payment.no_payments')}
        </div>
      ) : (
        <div className="space-y-3">
          {paymentsList.map((p) => (
            <div key={p.id} className="card hover:border-gray-300 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <span className="font-mono text-xs text-navy font-bold">{p.code}</span>
                  <h3 className="font-semibold text-navy text-sm mt-0.5">{p.manuscript_title}</h3>
                  <p className="text-xs text-gray-500">
                    {p.client_name} ({p.client_email})
                  </p>
                </div>
                <PaymentStatusBadge status={p.status} label={t(`payment.status_${p.status}`)} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400">{t('payment.total_amount')}: </span>
                  <span className="font-extrabold text-navy text-sm">{formatCurrency(p.amount)}</span>
                  {p.unique_code > 0 && <span className="text-gold ml-1 text-xs">({p.unique_code})</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {p.proof_path && (
                    <button
                      type="button"
                      onClick={() => downloadProof(p.id, p.code)}
                      disabled={downloadingId === p.id}
                      className="btn-secondary !py-1 !px-2.5 !text-xs"
                    >
                      {downloadingId === p.id ? <Spinner size="sm" /> : `⬇ ${t('payment.download_proof')}`}
                    </button>
                  )}

                  {p.status === 'pending' && (
                    <>
                      <Button
                        variant="primary"
                        className="!py-1 !px-2.5 !text-xs"
                        onClick={() => setApproveTarget(p)}
                      >
                        ✓ {t('payment.approve_btn')}
                      </Button>
                      <Button
                        variant="danger"
                        className="!py-1 !px-2.5 !text-xs"
                        onClick={() => { setRejectTarget(p); setRejectNote(''); }}
                      >
                        ✕ {t('payment.reject_btn')}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {p.reject_note && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                  {t('payment.reject_reason')} {p.reject_note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Confirm Approve */}
      <Modal
        open={Boolean(approveTarget)}
        title={t('payment.verify_title')}
        onClose={() => setApproveTarget(null)}
      >
        <p className="text-gray-600 text-sm mb-4">{t('payment.confirm_approve')}</p>
        {actionErr && <p className="text-red-600 text-xs mb-3">{actionErr}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setApproveTarget(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleApprove} disabled={actionLoading}>
            {actionLoading ? <Spinner size="sm" /> : t('payment.approve_btn')}
          </Button>
        </div>
      </Modal>

      {/* Modal Reject Prompt */}
      <Modal
        open={Boolean(rejectTarget)}
        title={t('payment.reject_btn')}
        onClose={() => setRejectTarget(null)}
      >
        <form onSubmit={handleReject} className="space-y-4">
          <p className="text-gray-600 text-sm">{t('payment.confirm_reject')}</p>
          <Textarea
            id="reject_note"
            label={t('payment.reject_note_label')}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder={t('payment.reject_note_placeholder')}
            required
          />
          {actionErr && <p className="text-red-600 text-xs">{actionErr}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setRejectTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="danger" className="flex-1" disabled={!rejectNote.trim() || actionLoading}>
              {actionLoading ? <Spinner size="sm" /> : t('payment.reject_btn')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── TAB: Admin Settings (Rekening Transfer) ───────────────────────────────────
function AdminSettingsTab() {
  const { t } = useTranslation();
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    settingsApi
      .adminGet()
      .then((res) => {
        const s = res.settings || {};
        setBank(s.payment_bank || '');
        setAccountNumber(s.payment_account_number || '');
        setAccountName(s.payment_account_name || '');
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      await settingsApi.adminUpdate({
        payment_bank: bank.trim(),
        payment_account_number: accountNumber.trim(),
        payment_account_name: accountName.trim(),
      });
      setMsg(t('admin.settings_saved'));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-12 text-center"><Spinner size="lg" /></div>;

  return (
    <div className="card max-w-xl mx-auto space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-navy text-lg">{t('admin.settings_title')}</h2>
        <p className="text-gray-500 text-xs mt-0.5">{t('admin.settings_desc')}</p>
      </div>

      {msg && <p className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-lg font-medium">{msg}</p>}
      {err && <p className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{err}</p>}

      <form onSubmit={handleSave} className="space-y-4">
        <Input
          id="p_bank"
          label={t('admin.bank_name')}
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          placeholder={t('admin.bank_placeholder')}
          required
        />
        <Input
          id="p_acc_no"
          label={t('admin.account_number')}
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder={t('admin.account_number_placeholder')}
          required
        />
        <Input
          id="p_acc_name"
          label={t('admin.account_name')}
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder={t('admin.account_name_placeholder')}
          required
        />
        <Button type="submit" variant="primary" disabled={saving} className="w-full !py-2.5">
          {saving ? <><Spinner size="sm" />{t('common.loading')}</> : t('admin.save_settings')}
        </Button>
      </form>
    </div>
  );
}

// ─── TAB: Admin Manage Services ───────────────────────────────────────────────
function AdminServicesTab() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'id';

  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({
    name_id: '',
    name_en: '',
    description_id: '',
    description_en: '',
    price: '',
    is_active: 1,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formErr, setFormErr] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadServices = useCallback(() => {
    setLoading(true);
    adminApi.services
      .list()
      .then((res) => {
        setServicesList(res.data || []);
        setError('');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  function openCreate() {
    setEditingService(null);
    setForm({
      name_id: '',
      name_en: '',
      description_id: '',
      description_en: '',
      price: '',
      is_active: 1,
    });
    setFormErr('');
    setEditModalOpen(true);
  }

  function openEdit(s) {
    setEditingService(s);
    setForm({
      name_id: s.name_id || '',
      name_en: s.name_en || '',
      description_id: s.description_id || '',
      description_en: s.description_en || '',
      price: s.price || '',
      is_active: s.is_active !== undefined ? s.is_active : 1,
    });
    setFormErr('');
    setEditModalOpen(true);
  }

  async function handleSaveService(e) {
    e.preventDefault();
    setFormLoading(true);
    setFormErr('');

    try {
      const payload = {
        name_id: form.name_id.trim(),
        name_en: form.name_en.trim(),
        description_id: form.description_id.trim(),
        description_en: form.description_en.trim(),
        price: Number(form.price),
        is_active: Number(form.is_active),
      };

      if (editingService) {
        await adminApi.services.update(editingService.id, payload);
      } else {
        await adminApi.services.create(payload);
      }
      setEditModalOpen(false);
      loadServices();
    } catch (e) {
      setFormErr(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminApi.services.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadServices();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="font-heading font-semibold text-navy text-base">{t('admin.services_title')}</h2>
          <p className="text-gray-500 text-xs mt-0.5">{t('admin.services_desc')}</p>
        </div>
        <Button variant="gold" onClick={openCreate} className="!py-1.5 !px-3 !text-xs">
          {t('admin.add_service')}
        </Button>
      </div>

      {error && <ErrorBox message={error} onRetry={loadServices} />}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {servicesList.map((s) => (
            <div key={s.id} className="card flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-navy text-sm">
                    {lang === 'en' ? s.name_en : s.name_id}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s.is_active ? t('admin.service_active') : t('admin.service_inactive')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-3 mb-3">
                  {lang === 'en' ? s.description_en : s.description_id}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                <span className="font-extrabold text-navy text-sm">{formatCurrency(s.price)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="text-xs text-navy font-semibold hover:text-gold"
                  >
                    ✏️ {t('admin.edit_service')}
                  </button>
                  {s.is_active === 1 && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(s)}
                      className="text-xs text-red-600 font-semibold hover:text-red-800"
                    >
                      🗑️ {t('admin.delete_service')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Service */}
      <Modal
        open={editModalOpen}
        title={editingService ? t('admin.edit_service') : t('admin.add_service')}
        onClose={() => setEditModalOpen(false)}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveService} className="space-y-3">
          <Input
            id="s_name_id"
            label={t('admin.service_name_id')}
            value={form.name_id}
            onChange={(e) => setForm({ ...form, name_id: e.target.value })}
            required
          />
          <Input
            id="s_name_en"
            label={t('admin.service_name_en')}
            value={form.name_en}
            onChange={(e) => setForm({ ...form, name_en: e.target.value })}
            required
          />
          <Textarea
            id="s_desc_id"
            label={t('admin.service_desc_id')}
            value={form.description_id}
            onChange={(e) => setForm({ ...form, description_id: e.target.value })}
            required
          />
          <Textarea
            id="s_desc_en"
            label={t('admin.service_desc_en')}
            value={form.description_en}
            onChange={(e) => setForm({ ...form, description_en: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="s_price"
              type="number"
              min="0"
              label={t('admin.service_price')}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <Select
              id="s_active"
              label={t('admin.service_status')}
              value={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
            >
              <option value="1">{t('admin.service_active')}</option>
              <option value="0">{t('admin.service_inactive')}</option>
            </Select>
          </div>

          {formErr && <p className="text-red-600 text-xs">{formErr}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={formLoading}>
              {formLoading ? <Spinner size="sm" /> : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirm Delete */}
      <Modal
        open={Boolean(deleteTarget)}
        title={t('admin.delete_service')}
        onClose={() => setDeleteTarget(null)}
      >
        <p className="text-gray-600 text-sm mb-4">{t('admin.confirm_delete_service')}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? <Spinner size="sm" /> : t('admin.delete_service')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Dashboard Main Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = user?.role || 'client';

  // Admin active top tab
  const [activeAdminTab, setActiveAdminTab] = useState('consultations');

  // Consultations state
  const [allConsultations, setAllConsultations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusTab, setStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const loadConsultations = useCallback(() => {
    setLoading(true);
    Promise.all([
      consultApi.list({ q: searchQuery }),
      consultApi.summary().catch(() => ({ data: null })),
    ])
      .then(([listRes, sumRes]) => {
        setAllConsultations(listRes.data || []);
        if (sumRes.data) setSummary(sumRes.data);
        setError('');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [searchQuery, t]);

  useEffect(() => {
    if (activeAdminTab === 'consultations') {
      loadConsultations();
    }
  }, [activeAdminTab, loadConsultations]);

  // Tab definitions: Semua, Menunggu pembayaran, Berjalan, Selesai, Dibatalkan
  const STATUS_TABS = useMemo(() => {
    const totalCount = summary?.total || allConsultations.length;
    const waitingPaymentCount =
      (summary?.awaiting_payment || 0) + (summary?.submitted || 0);
    const inProgressCount =
      (summary?.in_progress || 0) +
      (summary?.in_review || 0) +
      (summary?.revision || 0);
    const completedCount = summary?.completed || 0;
    const cancelledCount = summary?.cancelled || 0;

    return [
      { key: 'all', label: t('dashboard.filter_all'), count: totalCount },
      { key: 'waiting_payment', label: t('dashboard.tab_waiting_payment'), count: waitingPaymentCount },
      { key: 'in_progress', label: t('dashboard.tab_in_progress'), count: inProgressCount },
      { key: 'completed', label: t('dashboard.tab_completed'), count: completedCount },
      { key: 'cancelled', label: t('dashboard.tab_cancelled'), count: cancelledCount },
    ];
  }, [summary, allConsultations.length, t]);

  // Filtered consultations based on active statusTab
  const filteredConsultations = useMemo(() => {
    return allConsultations.filter((c) => {
      if (statusTab === 'all') return true;
      if (statusTab === 'waiting_payment') {
        return c.status === 'awaiting_payment' || c.status === 'submitted';
      }
      if (statusTab === 'in_progress') {
        return (
          c.status === 'in_progress' ||
          c.status === 'in_review' ||
          c.status === 'revision'
        );
      }
      if (statusTab === 'completed') return c.status === 'completed';
      if (statusTab === 'cancelled') return c.status === 'cancelled';
      return true;
    });
  }, [allConsultations, statusTab]);

  // 4 Kartu Ringkasan Dashboard Klien (Target K)
  const clientMetrics = useMemo(() => {
    const activeCount = allConsultations.filter(
      (c) => c.status !== 'completed' && c.status !== 'cancelled'
    ).length;

    const unreadMessagesCount = allConsultations.reduce(
      (acc, curr) => acc + Number(curr.unread_count || 0),
      0
    );

    const pendingBillsCount = allConsultations.filter(
      (c) => c.status === 'awaiting_payment' || c.status === 'submitted'
    ).length;

    const latestConsultation =
      allConsultations.length > 0 ? allConsultations[0] : null;

    return {
      activeCount,
      unreadMessagesCount,
      pendingBillsCount,
      latestConsultation,
    };
  }, [allConsultations]);

  return (
    <div className="min-h-screen bg-cream pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-navy">
              {t('dashboard.welcome', { name: user?.name?.split(' ')[0] || '' })}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {role === 'admin'
                ? 'Portal Manajemen Admin Scientia Advantage'
                : role === 'consultant'
                ? 'Portal Konsultan Akademik'
                : t('dashboard.my_consultations')}
            </p>
          </div>

          {role === 'client' && (
            <Button variant="gold" onClick={() => setShowNewModal(true)}>
              + {t('dashboard.new_consultation')}
            </Button>
          )}
        </div>

        {/* 4 Kartu Ringkasan (Target K) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {/* Card 1: Konsultasi Aktif */}
          <div className="card !p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl flex-shrink-0">
              📋
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-[11px] uppercase font-semibold truncate">
                {t('dashboard.card_active_consultations')}
              </p>
              <p className="text-navy font-heading font-extrabold text-xl mt-0.5">
                {clientMetrics.activeCount}
              </p>
            </div>
          </div>

          {/* Card 2: Pesan Baru */}
          <div className="card !p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center text-xl flex-shrink-0">
              💬
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-[11px] uppercase font-semibold truncate">
                {t('dashboard.card_new_messages')}
              </p>
              <p className="text-navy font-heading font-extrabold text-xl mt-0.5">
                {clientMetrics.unreadMessagesCount}
              </p>
            </div>
          </div>

          {/* Card 3: Tagihan Menunggu */}
          <div className="card !p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center text-xl flex-shrink-0">
              💳
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-[11px] uppercase font-semibold truncate">
                {t('dashboard.card_pending_bills')}
              </p>
              <p className="text-navy font-heading font-extrabold text-xl mt-0.5">
                {clientMetrics.pendingBillsCount}
              </p>
            </div>
          </div>

          {/* Card 4: Status Terakhir */}
          <div className="card !p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center text-xl flex-shrink-0">
              ⏱️
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-[11px] uppercase font-semibold truncate">
                {t('dashboard.card_latest_status')}
              </p>
              {clientMetrics.latestConsultation ? (
                <div className="mt-1 flex items-center gap-1.5 truncate">
                  <StatusBadge
                    status={clientMetrics.latestConsultation.status}
                    label={t(`status.${clientMetrics.latestConsultation.status}`)}
                  />
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1 italic">-</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Tabs for Admin */}
        {role === 'admin' && (
          <div className="flex border-b border-gray-200 mb-6 gap-2 sm:gap-4 overflow-x-auto">
            {[
              { id: 'consultations', label: t('dashboard.tab_consultations'), icon: '📋' },
              { id: 'payments', label: t('dashboard.tab_payments'), icon: '💳' },
              { id: 'settings', label: t('dashboard.tab_settings'), icon: '🏦' },
              { id: 'services', label: t('dashboard.tab_services'), icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveAdminTab(tab.id)}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeAdminTab === tab.id
                    ? 'border-navy text-navy font-bold'
                    : 'border-transparent text-gray-400 hover:text-navy hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* TAB: Consultations (All roles) */}
        {activeAdminTab === 'consultations' && (
          <div className="space-y-4">
            {/* Status Filter Tabs (Target G) & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusTab(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      statusTab === tab.key
                        ? 'bg-navy text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        statusTab === tab.key
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-64 flex-shrink-0">
                <Input
                  id="c_search"
                  type="text"
                  placeholder={t('dashboard.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="!py-1.5 text-xs"
                />
              </div>
            </div>

            {/* List Consultations */}
            {loading && (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            )}

            {error && !loading && (
              <ErrorBox message={error} onRetry={loadConsultations} />
            )}

            {!loading && !error && filteredConsultations.length === 0 && (
              <EmptyState
                icon="📋"
                title={statusTab !== 'all' || searchQuery ? t('dashboard.no_results') : t('dashboard.no_consultations')}
                description={statusTab === 'all' && !searchQuery ? t('dashboard.no_consultations_desc') : ''}
                action={
                  role === 'client' && statusTab === 'all' && !searchQuery ? (
                    <Button variant="primary" onClick={() => setShowNewModal(true)}>
                      {t('dashboard.start_now')}
                    </Button>
                  ) : null
                }
              />
            )}

            {!loading && !error && filteredConsultations.length > 0 && (
              <div className="space-y-3">
                {filteredConsultations.map((c) => (
                  <ConsultationCard key={c.id} c={c} currentUserRole={role} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Payments Verification (Admin only) */}
        {role === 'admin' && activeAdminTab === 'payments' && <AdminPaymentsTab />}

        {/* TAB: Transfer Settings (Admin only) */}
        {role === 'admin' && activeAdminTab === 'settings' && <AdminSettingsTab />}

        {/* TAB: Manage Services (Admin only) */}
        {role === 'admin' && activeAdminTab === 'services' && <AdminServicesTab />}
      </div>

      {/* New Consultation Modal for Client */}
      <NewConsultationModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => loadConsultations()}
      />
    </div>
  );
}
