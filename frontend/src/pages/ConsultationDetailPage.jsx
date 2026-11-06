import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { consultations as consultApi, manuscripts as msApi, ApiError } from '../lib/api';
import { Spinner, PageSpinner, ErrorBox, StatusBadge, Button, Modal } from '../components/ui';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT    = ['.pdf', '.docx'];

const STATUS_ORDER = ['submitted', 'awaiting_payment', 'in_review', 'in_progress', 'revision', 'completed', 'cancelled'];
const NO_CANCEL    = ['in_progress', 'revision', 'completed', 'cancelled'];

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Status Timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ currentStatus }) {
  const { t } = useTranslation();
  const mainFlow = ['submitted', 'awaiting_payment', 'in_review', 'in_progress', 'completed'];
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 overflow-x-auto py-2">
      {mainFlow.map((s, i) => {
        const idx     = mainFlow.indexOf(currentStatus);
        const isDone  = !isCancelled && mainFlow.indexOf(s) <= idx;
        const isCurrent = s === currentStatus;
        return (
          <div key={s} className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
                ${isCurrent ? 'bg-navy border-navy text-white' :
                  isDone    ? 'bg-teal border-teal text-white' :
                              'bg-gray-100 border-gray-200 text-gray-400'}`}>
                {isDone && !isCurrent ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 text-center w-20 leading-tight
                ${isCurrent ? 'text-navy font-semibold' : isDone ? 'text-teal' : 'text-gray-400'}`}>
                {t(`status.${s}`)}
              </span>
            </div>
            {i < mainFlow.length - 1 && (
              <div className={`hidden sm:block h-0.5 w-8 flex-shrink-0 ${isDone && !isCurrent ? 'bg-teal' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <div className="ml-auto">
          <StatusBadge status="cancelled" label={t('status.cancelled')} />
        </div>
      )}
    </div>
  );
}

// ─── Manuscript Upload ────────────────────────────────────────────────────────
function ManuscriptUpload({ consultationId, onUploaded }) {
  const { t }           = useTranslation();
  const fileRef         = useRef(null);
  const [file, setFile] = useState(null);
  const [err, setErr]   = useState('');
  const [loading, setLoading] = useState(false);

  function pickFile(f) {
    setErr('');
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) { setErr(t('manuscript.type_error')); return; }
    if (f.size > MAX_FILE_BYTES)    { setErr(t('manuscript.size_error')); return; }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await consultApi.uploadManuscript(consultationId, fd);
      onUploaded(data.data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card border-2 border-dashed border-gray-200 hover:border-navy/30 transition-colors">
      <h3 className="font-heading font-semibold text-navy mb-3">{t('manuscript.title')}</h3>

      <label
        htmlFor="ms-file"
        className="flex flex-col items-center justify-center py-8 cursor-pointer rounded-xl bg-cream hover:bg-cream-dark transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
      >
        <span className="text-3xl mb-2">📄</span>
        <span className="text-sm text-gray-500">{t('manuscript.drop')}</span>
        <span className="text-xs text-gray-400 mt-1">{t('manuscript.accept')}</span>
        <input
          id="ms-file" ref={fileRef} type="file"
          accept=".pdf,.docx" className="hidden"
          onChange={(e) => pickFile(e.target.files[0])}
        />
      </label>

      {file && (
        <div className="mt-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <span className="text-blue-500">📎</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-navy font-medium truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
          </div>
          <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
            className="text-gray-400 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            ✕
          </button>
        </div>
      )}

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      <Button variant="primary" className="w-full mt-3" onClick={upload} disabled={!file || loading}>
        {loading ? <><Spinner size="sm" />{t('manuscript.uploading')}</> : t('manuscript.upload_btn')}
      </Button>
    </div>
  );
}

// ─── Manuscript List ──────────────────────────────────────────────────────────
function ManuscriptList({ manuscripts, consultationId }) {
  const { t }   = useTranslation();
  const [downloading, setDownloading] = useState(null);

  async function download(ms) {
    setDownloading(ms.id);
    try {
      const blob = await msApi.download(ms.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = ms.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setDownloading(null);
    }
  }

  if (!manuscripts || manuscripts.length === 0) {
    return (
      <div className="card text-center py-8 text-gray-400 text-sm">
        <div className="text-3xl mb-2">📂</div>
        {t('manuscript.no_manuscripts')}
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-heading font-semibold text-navy mb-4">{t('manuscript.versions')}</h3>
      <div className="space-y-3">
        {manuscripts.map((ms) => (
          <div key={ms.id} className="flex items-center gap-3 p-3 rounded-xl bg-cream hover:bg-cream-dark transition-colors">
            <span className="text-2xl">📄</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-navy text-sm truncate">{ms.original_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t('manuscript.version', { v: ms.version })} · {formatBytes(ms.size_bytes)} · {formatDate(ms.created_at)}
              </p>
            </div>
            <button
              onClick={() => download(ms)}
              disabled={downloading === ms.id}
              className="btn-secondary !py-1.5 !px-3 !text-xs flex-shrink-0"
            >
              {downloading === ms.id ? <Spinner size="sm" /> : `⬇ ${t('manuscript.download')}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Detail Page ──────────────────────────────────────────────────────────────
export default function ConsultationDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { t, i18n } = useTranslation();
  const { user }     = useAuth();
  const lang         = i18n.language?.slice(0, 2) || 'id';

  const [consultation, setConsultation] = useState(null);
  const [manuscripts, setManuscripts]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr]   = useState('');

  function load() {
    setLoading(true);
    consultApi.get(id)
      .then((d) => { setConsultation(d.data); setError(''); })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  const canCancel = consultation && !NO_CANCEL.includes(consultation.status);

  async function doCancel() {
    setCancelling(true);
    setCancelErr('');
    try {
      await consultApi.updateStatus(id, { status: 'cancelled' });
      setConsultation((c) => ({ ...c, status: 'cancelled' }));
      setShowCancel(false);
    } catch (e) {
      setCancelErr(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setCancelling(false);
    }
  }

  function handleUploaded(ms) {
    setManuscripts((prev) => [ms, ...prev]);
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-cream pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-navy hover:text-gold text-sm font-medium mb-6 transition-colors min-h-[44px]">
          ← {t('consultation.back')}
        </Link>

        {error && <ErrorBox message={error} onRetry={load} />}

        {!error && consultation && (
          <div className="space-y-6 animate-fade-in">
            {/* Header card */}
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h1 className="font-heading font-bold text-xl text-navy">{consultation.manuscript_title}</h1>
                  <p className="text-gray-400 text-sm mt-0.5">{consultation.code}</p>
                </div>
                <StatusBadge status={consultation.status} label={t(`status.${consultation.status}`)} />
              </div>

              {/* Timeline */}
              <StatusTimeline currentStatus={consultation.status} />
            </div>

            {/* Detail info */}
            <div className="card">
              <h2 className="font-heading font-semibold text-navy mb-4">{t('consultation.detail_title')}</h2>
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  { label: t('consultation.service_name'), value: lang === 'en' ? consultation.service_name_en : consultation.service_name_id },
                  { label: t('consultation.consultant'), value: consultation.consultant_name || t('consultation.not_assigned') },
                  { label: 'Bidang Ilmu', value: consultation.field || '-' },
                  { label: 'Target Indeks', value: consultation.target_index || '-' },
                  { label: 'Target Kuartil', value: consultation.target_quartile || '-' },
                  { label: t('consultation.created_at'), value: formatDate(consultation.created_at) },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-gray-400 text-xs font-medium uppercase tracking-wider">{item.label}</dt>
                    <dd className="text-navy font-medium mt-0.5">{item.value}</dd>
                  </div>
                ))}
                {consultation.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-400 text-xs font-medium uppercase tracking-wider">Catatan</dt>
                    <dd className="text-navy mt-0.5 bg-cream rounded-lg px-3 py-2 text-sm">{consultation.notes}</dd>
                  </div>
                )}
              </dl>

              {/* Cancel button */}
              {canCancel && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <Button variant="danger" onClick={() => setShowCancel(true)}>
                    {t('consultation.cancel_btn')}
                  </Button>
                </div>
              )}
            </div>

            {/* Upload */}
            <ManuscriptUpload consultationId={id} onUploaded={handleUploaded} />

            {/* Manuscript list */}
            <ManuscriptList manuscripts={manuscripts} consultationId={id} />
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      <Modal open={showCancel} title={t('consultation.cancel_btn')} onClose={() => setShowCancel(false)}>
        <p className="text-gray-600 text-sm mb-4">{t('consultation.cancel_confirm')}</p>
        {cancelErr && <p className="text-red-600 text-sm mb-3">{cancelErr}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setShowCancel(false)}>
            {t('common.no')}
          </Button>
          <Button variant="danger" className="flex-1" onClick={doCancel} disabled={cancelling}>
            {cancelling ? <Spinner size="sm" /> : t('common.yes')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
