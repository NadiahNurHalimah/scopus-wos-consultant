import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  consultations as consultApi,
  manuscripts as msApi,
  settings as settingsApi,
  payments as paymentApi,
  messages as messageApi,
  ApiError,
} from '../lib/api';
import {
  Spinner,
  PageSpinner,
  ErrorBox,
  StatusBadge,
  PaymentStatusBadge,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
} from '../components/ui';

const MAX_MS_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_MSG_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

const NO_CANCEL = ['in_progress', 'revision', 'completed', 'cancelled'];

const TRANSITIONS = {
  submitted: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['in_review', 'cancelled'],
  in_review: ['in_progress', 'cancelled'],
  in_progress: ['revision', 'completed'],
  revision: ['in_progress', 'completed'],
  completed: [],
  cancelled: [],
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(b) {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatCurrency(num) {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
}

// ─── Status Timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ currentStatus }) {
  const { t } = useTranslation();
  const mainFlow = ['submitted', 'awaiting_payment', 'in_review', 'in_progress', 'completed'];
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 overflow-x-auto py-2">
      {mainFlow.map((s, i) => {
        const idx = mainFlow.indexOf(currentStatus);
        const isDone = !isCancelled && mainFlow.indexOf(s) <= idx;
        const isCurrent = s === currentStatus;
        return (
          <div key={s} className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  isCurrent
                    ? 'bg-navy border-navy text-white'
                    : isDone
                    ? 'bg-teal border-teal text-white'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
                }`}
              >
                {isDone && !isCurrent ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs mt-1 text-center w-20 leading-tight ${
                  isCurrent ? 'text-navy font-semibold' : isDone ? 'text-teal' : 'text-gray-400'
                }`}
              >
                {t(`status.${s}`)}
              </span>
            </div>
            {i < mainFlow.length - 1 && (
              <div
                className={`hidden sm:block h-0.5 w-8 flex-shrink-0 ${
                  isDone && !isCurrent ? 'bg-teal' : 'bg-gray-200'
                }`}
              />
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

// ─── Payment Section ──────────────────────────────────────────────────────────
function PaymentSection({ consultation, onPaymentUpdated }) {
  const { t } = useTranslation();
  const [bankInfo, setBankInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [downloadingProof, setDownloadingProof] = useState(false);
  const proofRef = useRef(null);

  const payment = consultation.latest_payment;

  useEffect(() => {
    settingsApi
      .payment()
      .then((res) => setBankInfo(res.data))
      .catch(() => {});
  }, []);

  function handleCopy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function pickProof(f) {
    setUploadErr('');
    setUploadSuccess('');
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)) {
      setUploadErr(t('payment.proof_desc'));
      return;
    }
    if (f.size > MAX_PROOF_BYTES) {
      setUploadErr(t('payment.proof_desc'));
      return;
    }
    setProofFile(f);
  }

  async function submitProof(e) {
    e.preventDefault();
    if (!proofFile) return;

    setUploading(true);
    setUploadErr('');
    setUploadSuccess('');

    try {
      const fd = new FormData();
      fd.append('file', proofFile);
      await paymentApi.uploadProof(consultation.id, fd);
      setUploadSuccess(t('payment.proof_success'));
      setProofFile(null);
      if (proofRef.current) proofRef.current.value = '';
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (err) {
      setUploadErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setUploading(false);
    }
  }

  async function downloadProof() {
    if (!payment?.id) return;
    setDownloadingProof(true);
    try {
      const blob = await paymentApi.downloadProof(payment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bukti_transfer_${consultation.code || consultation.id}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setDownloadingProof(false);
    }
  }

  const pStatus = payment?.status || 'pending';
  const showUpload = pStatus === 'pending' || pStatus === 'rejected';

  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h2 className="font-heading font-semibold text-navy text-lg">{t('payment.title')}</h2>
          <p className="text-gray-500 text-xs mt-0.5">{t('payment.subtitle')}</p>
        </div>
        <PaymentStatusBadge status={pStatus} label={t(`payment.status_${pStatus}`)} />
      </div>

      {/* Invoice Breakdown */}
      {payment && (
        <div className="bg-cream rounded-xl p-4 grid sm:grid-cols-3 gap-3 text-center sm:text-left">
          <div>
            <p className="text-gray-400 text-xs uppercase font-medium">{t('payment.base_amount')}</p>
            <p className="text-navy font-semibold text-sm mt-0.5">
              {formatCurrency(payment.base_amount)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-medium">{t('payment.unique_code')}</p>
            <p className="text-gold font-bold text-sm mt-0.5">+{payment.unique_code}</p>
          </div>
          <div className="sm:border-l sm:border-gray-200 sm:pl-4">
            <p className="text-gray-400 text-xs uppercase font-medium">{t('payment.total_amount')}</p>
            <p className="text-navy font-extrabold text-base mt-0.5 text-teal">
              {formatCurrency(payment.amount)}
            </p>
          </div>
        </div>
      )}

      {/* Bank Account Details */}
      {bankInfo && bankInfo.account_number && (
        <div className="border border-gold/30 bg-gold/5 rounded-xl p-4">
          <p className="text-navy text-xs font-semibold mb-2">{t('payment.instruction')}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-3">
            <div>
              <p className="text-xs text-gray-400">{bankInfo.bank}</p>
              <p className="text-navy font-bold font-mono text-base">{bankInfo.account_number}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('payment.account_name')}: {bankInfo.account_name}</p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(bankInfo.account_number)}
              className="btn-secondary !py-1.5 !px-3 !text-xs"
            >
              {copied ? `✓ ${t('payment.copied')}` : `📋 ${t('payment.copy')}`}
            </button>
          </div>
        </div>
      )}

      {/* Rejection Alert */}
      {pStatus === 'rejected' && payment?.reject_note && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <p className="font-semibold">{t('payment.reject_reason')}</p>
          <p className="mt-1">{payment.reject_note}</p>
        </div>
      )}

      {/* Action: View Proof if available */}
      {payment?.proof_path && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
          <span className="text-xs text-gray-500">📎 {t('payment.view_proof')}</span>
          <button
            type="button"
            onClick={downloadProof}
            disabled={downloadingProof}
            className="text-xs text-navy font-semibold hover:text-gold transition-colors"
          >
            {downloadingProof ? <Spinner size="sm" /> : `⬇ ${t('payment.download_proof')}`}
          </button>
        </div>
      )}

      {/* Form Upload Bukti Transfer */}
      {showUpload && (
        <form onSubmit={submitProof} className="space-y-3 pt-2 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-navy">
            {pStatus === 'rejected' ? t('payment.reupload_proof_title') : t('payment.upload_proof_title')}
          </h3>
          <p className="text-xs text-gray-400">{t('payment.proof_desc')}</p>

          <input
            ref={proofRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => pickProof(e.target.files[0])}
            className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy file:text-white hover:file:bg-navy/90 cursor-pointer"
          />

          {uploadErr && <p className="text-xs text-red-600">{uploadErr}</p>}
          {uploadSuccess && <p className="text-xs text-green-600 font-medium">{uploadSuccess}</p>}

          <Button
            type="submit"
            variant="gold"
            disabled={!proofFile || uploading}
            className="w-full sm:w-auto !py-2 !text-xs"
          >
            {uploading ? <><Spinner size="sm" />{t('payment.uploading')}</> : t('payment.upload_btn')}
          </Button>
        </form>
      )}
    </div>
  );
}

// ─── Manuscript Upload & Version History ───────────────────────────────────────
function ManuscriptSection({ manuscripts, consultationId, onUploaded }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);

  function pickFile(f) {
    setErr('');
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!['.pdf', '.docx'].includes(ext)) {
      setErr(t('manuscript.type_error'));
      return;
    }
    if (f.size > MAX_MS_BYTES) {
      setErr(t('manuscript.size_error'));
      return;
    }
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

  async function download(ms) {
    setDownloading(ms.id);
    try {
      const blob = await msApi.download(ms.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
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

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-navy text-lg">{t('manuscript.title')}</h2>
        <p className="text-gray-500 text-xs mt-0.5">{t('manuscript.accept')}</p>
      </div>

      {/* Drop area */}
      <label
        htmlFor="ms-file-input"
        className="flex flex-col items-center justify-center py-6 cursor-pointer rounded-xl bg-cream hover:bg-cream-dark border-2 border-dashed border-gray-200 hover:border-navy/30 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pickFile(e.dataTransfer.files[0]);
        }}
      >
        <span className="text-3xl mb-1">📄</span>
        <span className="text-sm text-gray-600 font-medium">{t('manuscript.drop')}</span>
        <input
          id="ms-file-input"
          ref={fileRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => pickFile(e.target.files[0])}
        />
      </label>

      {file && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <span className="text-blue-500">📎</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-navy font-medium truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
          </div>
          <button
            onClick={() => {
              setFile(null);
              if (fileRef.current) fileRef.current.value = '';
            }}
            className="text-gray-400 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}

      {file && (
        <Button variant="primary" className="w-full !py-2.5" onClick={upload} disabled={loading}>
          {loading ? <><Spinner size="sm" />{t('manuscript.uploading')}</> : t('manuscript.upload_btn')}
        </Button>
      )}

      {/* Version History */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="font-heading font-semibold text-navy text-sm mb-3">
          {t('manuscript.versions')} ({manuscripts?.length || 0})
        </h3>

        {!manuscripts || manuscripts.length === 0 ? (
          <p className="text-gray-400 text-xs italic">{t('manuscript.no_manuscripts')}</p>
        ) : (
          <div className="space-y-2">
            {manuscripts.map((ms) => (
              <div
                key={ms.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-cream hover:bg-cream-dark transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy text-sm truncate">{ms.original_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('manuscript.version', { v: ms.version })} · {formatBytes(ms.size_bytes)} · {formatDate(ms.created_at)}
                    {ms.uploader_name && ` · ${ms.uploader_name} (${ms.uploader_role})`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => download(ms)}
                  disabled={downloading === ms.id}
                  className="btn-secondary !py-1.5 !px-3 !text-xs flex-shrink-0"
                >
                  {downloading === ms.id ? <Spinner size="sm" /> : `⬇ ${t('manuscript.download')}`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Messages & Discussion ────────────────────────────────────────────────────
function MessagesSection({ consultationId, currentUser }) {
  const { t } = useTranslation();
  const [messagesList, setMessagesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [downloadingAtt, setDownloadingAtt] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initial load dan polling 15s dengan after_id (berhenti saat tab tidak aktif)
  useEffect(() => {
    let isMounted = true;

    // Muat semua pesan awal & tandai terbaca saat dibuka
    messageApi
      .list(consultationId)
      .then((res) => {
        if (isMounted) {
          setMessagesList(res.data || []);
          messageApi.markRead(consultationId).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Polling bertahap dengan after_id
    function pollNewMessages() {
      if (document.hidden) return; // Berhenti polling saat tab tidak aktif

      setMessagesList((currentList) => {
        const lastId = currentList.length > 0 ? currentList[currentList.length - 1].id : 0;
        messageApi
          .list(consultationId, lastId)
          .then((res) => {
            if (isMounted && res.data && res.data.length > 0) {
              setMessagesList((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const brandNew = res.data.filter((m) => !existingIds.has(m.id));
                if (brandNew.length > 0) {
                  messageApi.markRead(consultationId).catch(() => {});
                  return [...prev, ...brandNew];
                }
                return prev;
              });
            }
          })
          .catch(() => {});
        return currentList;
      });
    }

    const interval = setInterval(pollNewMessages, 15000); // Polling tiap 15 detik

    const handleVisibility = () => {
      if (!document.hidden) {
        pollNewMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [consultationId]);

  const loadAllMessages = useCallback(async () => {
    try {
      const res = await messageApi.list(consultationId);
      setMessagesList(res.data || []);
      messageApi.markRead(consultationId).catch(() => {});
    } catch {
      // ignore
    }
  }, [consultationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesList]);

  function pickAttachment(f) {
    setSendErr('');
    if (!f) return;
    if (f.size > MAX_MSG_ATTACHMENT_BYTES) {
      setSendErr(t('messages.file_size_error'));
      return;
    }
    setAttachment(f);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() && !attachment) return;

    setSending(true);
    setSendErr('');

    try {
      const fd = new FormData();
      if (text.trim()) fd.append('body', text.trim());
      if (attachment) fd.append('attachment', attachment);

      await messageApi.send(consultationId, fd);
      setText('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadAllMessages();
    } catch (err) {
      setSendErr(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSending(false);
    }
  }

  async function downloadAttachment(msgId, filename) {
    setDownloadingAtt(msgId);
    try {
      const blob = await messageApi.downloadAttachment(msgId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `lampiran_pesan_${msgId}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setDownloadingAtt(null);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h2 className="font-heading font-semibold text-navy text-lg">{t('messages.title')}</h2>
          <p className="text-gray-500 text-xs mt-0.5">{t('messages.desc')}</p>
        </div>
        <button
          type="button"
          onClick={loadAllMessages}
          className="text-xs text-navy hover:text-gold font-medium transition-colors"
        >
          🔄 {t('messages.refresh')}
        </button>
      </div>

      {/* Messages Stream */}
      <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
        {loading ? (
          <div className="py-8 text-center"><Spinner size="md" /></div>
        ) : messagesList.length === 0 ? (
          <p className="text-gray-400 text-xs text-center py-8 italic">{t('messages.no_messages')}</p>
        ) : (
          messagesList.map((m) => {
            const isMe = m.sender_id === currentUser?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-gray-400">
                  <span className="font-medium text-navy">{m.sender_name}</span>
                  <span className="bg-gray-100 px-1.5 py-0.2 rounded text-[10px] text-gray-600">
                    {m.sender_role}
                  </span>
                  <span>· {formatDate(m.created_at)}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe
                      ? 'bg-navy text-white rounded-br-none'
                      : 'bg-cream text-navy rounded-bl-none border border-gray-200'
                  }`}
                >
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}

                  {m.attachment_path && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <button
                        type="button"
                        onClick={() => downloadAttachment(m.id, m.attachment_path.split('/').pop())}
                        disabled={downloadingAtt === m.id}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold underline ${
                          isMe ? 'text-gold hover:text-white' : 'text-navy hover:text-gold'
                        }`}
                      >
                        {downloadingAtt === m.id ? <Spinner size="sm" /> : `📎 ${t('messages.download_attachment')}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Input */}
      <form onSubmit={handleSend} className="space-y-2 pt-3 border-t border-gray-100">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          placeholder={t('messages.placeholder')}
          className="!min-h-[70px] text-sm"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              className="hidden"
              id="msg-att-input"
              onChange={(e) => pickAttachment(e.target.files[0])}
            />
            <label
              htmlFor="msg-att-input"
              className="btn-secondary !py-1 !px-2.5 !text-xs cursor-pointer flex items-center gap-1"
            >
              📎 {t('messages.attach_btn')}
            </label>

            {attachment && (
              <span className="text-xs text-navy font-medium flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                <span className="truncate max-w-[150px]">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400">
              {t('messages.char_count', { count: text.length })}
            </span>
            <Button
              type="submit"
              variant="primary"
              disabled={(!text.trim() && !attachment) || sending}
              className="!py-1.5 !px-4 !text-xs"
            >
              {sending ? <><Spinner size="sm" />{t('messages.sending')}</> : t('messages.send_btn')}
            </Button>
          </div>
        </div>

        {sendErr && <p className="text-xs text-red-600">{sendErr}</p>}
      </form>
    </div>
  );
}

// ─── Status History Logs ──────────────────────────────────────────────────────
function StatusLogsSection({ logs }) {
  const { t } = useTranslation();

  return (
    <div className="card space-y-4">
      <h2 className="font-heading font-semibold text-navy text-lg">{t('consultation.history')}</h2>

      {!logs || logs.length === 0 ? (
        <p className="text-gray-400 text-xs italic">{t('consultation.history_empty')}</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 text-xs border-l-2 border-teal pl-3 py-1"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy">{t(`status.${log.new_status}`)}</span>
                  {log.old_status && (
                    <span className="text-gray-400">
                      (dari {t(`status.${log.old_status}`)})
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  {log.changer_name
                    ? `${t('consultation.changed_by')} ${log.changer_name} (${log.changer_role})`
                    : t('consultation.initial_status')}
                  {' · '}
                  {formatDate(log.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail Page Main ─────────────────────────────────────────────────────────
export default function ConsultationDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.language?.slice(0, 2) || 'id';

  const [consultation, setConsultation] = useState(null);
  const [manuscripts, setManuscripts] = useState([]);
  const [statusLogs, setStatusLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal actions
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr] = useState('');

  const [showAssign, setShowAssign] = useState(false);
  const [consultantIdInput, setConsultantIdInput] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignErr, setAssignErr] = useState('');

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusErr, setStatusErr] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    consultApi
      .get(id)
      .then((d) => {
        setConsultation(d.data);
        setManuscripts(d.data.manuscripts || []);
        setStatusLogs(d.data.status_logs || []);
        setError('');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canCancel =
    consultation && user?.role === 'client' && !NO_CANCEL.includes(consultation.status);

  async function doCancel() {
    setCancelling(true);
    setCancelErr('');
    try {
      await consultApi.updateStatus(id, { status: 'cancelled' });
      setShowCancel(false);
      loadData();
    } catch (e) {
      setCancelErr(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setCancelling(false);
    }
  }

  async function doAssign(e) {
    e.preventDefault();
    if (!consultantIdInput.trim()) return;

    setAssigning(true);
    setAssignErr('');
    try {
      await consultApi.assign(id, Number(consultantIdInput.trim()));
      setShowAssign(false);
      setConsultantIdInput('');
      loadData();
    } catch (e) {
      setAssignErr(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setAssigning(false);
    }
  }

  async function doUpdateStatus(e) {
    e.preventDefault();
    if (!newStatus) return;

    setUpdatingStatus(true);
    setStatusErr('');
    try {
      await consultApi.updateStatus(id, { status: newStatus, notes: statusNotes || undefined });
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNotes('');
      loadData();
    } catch (e) {
      setStatusErr(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setUpdatingStatus(false);
    }
  }

  const allowedTransitions = consultation ? TRANSITIONS[consultation.status] || [] : [];

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-cream pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-navy hover:text-gold text-sm font-medium mb-6 transition-colors min-h-[44px]"
        >
          ← {t('consultation.back')}
        </Link>

        {error && <ErrorBox message={error} onRetry={loadData} />}

        {!error && consultation && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Status Card */}
            <div className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-heading font-bold text-2xl text-navy">
                    {consultation.manuscript_title}
                  </h1>
                  <p className="text-gray-400 text-sm mt-0.5">{consultation.code}</p>
                </div>
                <StatusBadge
                  status={consultation.status}
                  label={t(`status.${consultation.status}`)}
                />
              </div>

              {/* Timeline */}
              <StatusTimeline currentStatus={consultation.status} />

              {/* Action Buttons for Consultant & Admin */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                {user?.role === 'admin' && (
                  <Button
                    variant="secondary"
                    className="!py-1.5 !px-3 !text-xs"
                    onClick={() => setShowAssign(true)}
                  >
                    👤 {t('consultation.assign_btn')}
                  </Button>
                )}

                {(user?.role === 'admin' || user?.role === 'consultant') &&
                  allowedTransitions.length > 0 && (
                    <Button
                      variant="gold"
                      className="!py-1.5 !px-3 !text-xs"
                      onClick={() => setShowStatusModal(true)}
                    >
                      ⚡ {t('consultation.update_status_btn')}
                    </Button>
                  )}

                {canCancel && (
                  <Button
                    variant="danger"
                    className="!py-1.5 !px-3 !text-xs"
                    onClick={() => setShowCancel(true)}
                  >
                    {t('consultation.cancel_btn')}
                  </Button>
                )}
              </div>
            </div>

            {/* Consultation Details */}
            <div className="card">
              <h2 className="font-heading font-semibold text-navy mb-4">
                {t('consultation.detail_title')}
              </h2>
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  {
                    label: t('consultation.service_name'),
                    value:
                      lang === 'en'
                        ? consultation.service_name_en
                        : consultation.service_name_id,
                  },
                  {
                    label: t('consultation.consultant'),
                    value: consultation.consultant_name || t('consultation.not_assigned'),
                  },
                  { label: 'Klien', value: consultation.client_name || '-' },
                  { label: 'Bidang Ilmu', value: consultation.field || '-' },
                  { label: 'Target Indeks', value: consultation.target_index || '-' },
                  { label: 'Target Kuartil', value: consultation.target_quartile || '-' },
                  { label: t('consultation.created_at'), value: formatDate(consultation.created_at) },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                      {item.label}
                    </dt>
                    <dd className="text-navy font-medium mt-0.5">{item.value}</dd>
                  </div>
                ))}
                {consultation.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                      Catatan
                    </dt>
                    <dd className="text-navy mt-0.5 bg-cream rounded-lg px-3 py-2 text-sm">
                      {consultation.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Payment Section (Manual Transfer) */}
            <PaymentSection
              consultation={consultation}
              onPaymentUpdated={loadData}
            />

            {/* Manuscripts Section */}
            <ManuscriptSection
              manuscripts={manuscripts}
              consultationId={id}
              onUploaded={(newMs) => setManuscripts((prev) => [newMs, ...prev])}
            />

            {/* Messages & Review Notes */}
            <MessagesSection
              consultationId={id}
              currentUser={user}
            />

            {/* Status History Logs */}
            <StatusLogsSection logs={statusLogs} />
          </div>
        )}
      </div>

      {/* Modal Cancel Confirmation */}
      <Modal
        open={showCancel}
        title={t('consultation.cancel_btn')}
        onClose={() => setShowCancel(false)}
      >
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

      {/* Modal Assign Consultant (Admin) */}
      <Modal
        open={showAssign}
        title={t('consultation.assign_modal_title')}
        onClose={() => setShowAssign(false)}
      >
        <form onSubmit={doAssign} className="space-y-4">
          <Input
            id="consultant_id"
            label={t('consultation.consultant_id_label')}
            type="number"
            min="1"
            value={consultantIdInput}
            onChange={(e) => setConsultantIdInput(e.target.value)}
            placeholder={t('consultation.consultant_id_placeholder')}
            required
          />
          {assignErr && <p className="text-red-600 text-xs">{assignErr}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowAssign(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={assigning}>
              {assigning ? <Spinner size="sm" /> : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Update Status (Consultant / Admin) */}
      <Modal
        open={showStatusModal}
        title={t('consultation.status_modal_title')}
        onClose={() => setShowStatusModal(false)}
      >
        <form onSubmit={doUpdateStatus} className="space-y-4">
          <Select
            id="new_status"
            label={t('consultation.new_status_label')}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            required
          >
            <option value="">-- {t('consultation.new_status_label')} --</option>
            {allowedTransitions.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </Select>

          <Textarea
            id="status_notes"
            label={t('consultation.status_notes_label')}
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            placeholder="Catatan transisi..."
          />

          {statusErr && <p className="text-red-600 text-xs">{statusErr}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowStatusModal(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={!newStatus || updatingStatus}
            >
              {updatingStatus ? <Spinner size="sm" /> : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
