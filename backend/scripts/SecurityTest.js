// Tes keamanan otomatis untuk API Scientia Advantage (tahap 2).
//
// Cara pakai (dari folder backend, server sudah berjalan):
//   node scripts/securityTest.js
//
// Syarat:
//   - .env berisi ADMIN_EMAIL dan ADMIN_PASSWORD, dan sudah menjalankan: npm run seed:admin
//   - Server berjalan di http://localhost:PORT (atau isi TEST_BASE_URL)
//
// Skrip membuat akun uji (sectest_*@test.local), menjalankan pemeriksaan,
// lalu menghapus akun dan data ujinya sendiri.

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

const BASE = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const TAG = Date.now().toString(36);
const PASSWORD = 'TesKeamanan123!';
const EMAIL = {
    A: `sectest_a_${TAG}@test.local`,
    B: `sectest_b_${TAG}@test.local`,
    C: `sectest_c_${TAG}@test.local`,
    E: `sectest_e_${TAG}@test.local`,
};

let pass = 0;
let fail = 0;
const failures = [];

const rejected = (s) => s >= 400 && s < 500;
const success = (s) => s >= 200 && s < 300;

function check(name, ok, detail = '') {
    if (ok) {
        pass += 1;
        console.log(`  LOLOS  ${name}`);
    } else {
        fail += 1;
        failures.push(`${name} ${detail}`);
        console.log(`  GAGAL  ${name} ${detail}`);
    }
}

function section(title) {
    console.log(`\n== ${title}`);
}

async function api(method, url, { token, json, form } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let body;
    if (json !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(json);
    }
    if (form) body = form;
    const res = await fetch(BASE + url, { method, headers, body });
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.status === 429) throw new Error('RATE_LIMIT');
    let data = null;
    try {
        data = JSON.parse(buf.toString('utf8'));
    } catch (e) {
        data = null;
    }
    return { status: res.status, data, buf };
}

function toArray(d) {
    if (Array.isArray(d)) return d;
    if (!d) return [];
    const inner = d.data || d.services || d.consultations || d.items;
    return Array.isArray(inner) ? inner : [];
}

function uploadForm(buf, filename, mime) {
    const form = new FormData();
    form.append('file', new Blob([buf], { type: mime }), filename);
    return form;
}

const REAL_PDF = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'
);

async function registerUser(label) {
    const r = await api('POST', '/api/auth/register', {
        json: { name: `Tes ${label}`, email: EMAIL[label], password: PASSWORD },
    });
    if (!success(r.status)) {
        throw new Error(`Gagal mendaftarkan akun uji ${label}: ${r.status} ${JSON.stringify(r.data)}`);
    }
    return r.data.token;
}

async function userId(email) {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    return rows[0].id;
}

async function cleanup() {
    try {
        const [users] = await pool.query("SELECT id FROM users WHERE email LIKE 'sectest%@test.local'");
        if (users.length === 0) return;
        const ids = users.map((u) => u.id);

        const [files] = await pool.query(
            'SELECT stored_path FROM manuscripts WHERE consultation_id IN (SELECT id FROM consultations WHERE client_id IN (?))',
            [ids]
        );
        for (const f of files) {
            const p = f.stored_path;
            const candidates = [
                p,
                path.resolve(__dirname, '..', p),
                path.resolve(__dirname, '..', 'uploads', 'manuscripts', path.basename(p)),
            ];
            for (const c of candidates) {
                if (fs.existsSync(c)) {
                    fs.unlinkSync(c);
                    break;
                }
            }
        }

        // Hapus file bukti pembayaran uji
        const [paymentFiles] = await pool.query(
            'SELECT proof_path FROM payments WHERE consultation_id IN (SELECT id FROM consultations WHERE client_id IN (?))',
            [ids]
        );
        for (const pf of paymentFiles) {
            if (pf.proof_path) {
                const candidates = [
                    pf.proof_path,
                    path.resolve(__dirname, '..', pf.proof_path),
                    path.resolve(__dirname, '..', 'uploads', 'payments', path.basename(pf.proof_path)),
                ];
                for (const c of candidates) {
                    if (fs.existsSync(c)) {
                        fs.unlinkSync(c);
                        break;
                    }
                }
            }
        }

        // Hapus file lampiran pesan uji
        const [msgFiles] = await pool.query(
            'SELECT attachment_path FROM messages WHERE consultation_id IN (SELECT id FROM consultations WHERE client_id IN (?))',
            [ids]
        );
        for (const mf of msgFiles) {
            if (mf.attachment_path) {
                const candidates = [
                    mf.attachment_path,
                    path.resolve(__dirname, '..', mf.attachment_path),
                    path.resolve(__dirname, '..', 'uploads', 'messages', path.basename(mf.attachment_path)),
                ];
                for (const c of candidates) {
                    if (fs.existsSync(c)) {
                        fs.unlinkSync(c);
                        break;
                    }
                }
            }
        }

        await pool.query('DELETE FROM payments WHERE consultation_id IN (SELECT id FROM consultations WHERE client_id IN (?))', [ids]);
        await pool.query('DELETE FROM messages WHERE consultation_id IN (SELECT id FROM consultations WHERE client_id IN (?))', [ids]);
        await pool.query('DELETE FROM consultations WHERE client_id IN (?)', [ids]);
        await pool.query('DELETE FROM users WHERE id IN (?)', [ids]);
        console.log('\nData uji sudah dibersihkan.');
    } catch (err) {
        console.log(`\nPembersihan otomatis gagal (${err.message}).`);
        console.log("Bersihkan manual: DELETE FROM consultations WHERE client_id IN (SELECT id FROM users WHERE email LIKE 'sectest%@test.local'); lalu hapus user-nya.");
    }
}

async function run() {
    console.log(`Menguji ${BASE}`);

    const health = await api('GET', '/api/health');
    if (health.status !== 200 || !health.data || health.data.db !== 'connected') {
        throw new Error('Server atau database tidak siap. Cek /api/health dulu.');
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const adminLogin = await api('POST', '/api/auth/login', {
        json: { email: adminEmail, password: process.env.ADMIN_PASSWORD },
    });
    if (adminLogin.status !== 200) {
        throw new Error('Login admin gagal. Isi ADMIN_EMAIL dan ADMIN_PASSWORD di .env, lalu jalankan: npm run seed:admin');
    }
    const admin = adminLogin.data.token;

    const tokenA = await registerUser('A');
    const tokenB = await registerUser('B');
    await registerUser('C');
    await pool.query("UPDATE users SET role = 'consultant' WHERE email = ?", [EMAIL.C]);
    const loginC = await api('POST', '/api/auth/login', { json: { email: EMAIL.C, password: PASSWORD } });
    const tokenC = loginC.data.token;
    const consultantId = await userId(EMAIL.C);
    const idA = await userId(EMAIL.A);

    const services = toArray((await api('GET', '/api/services')).data);

    section('1. Layanan dan akses publik');
    const svc = await api('GET', '/api/services');
    check('Daftar layanan bisa dibuka tanpa login', svc.status === 200 && services.length >= 1, `(status ${svc.status})`);
    check('Daftar layanan berisi id', services.length > 0 && services[0].id !== undefined);
    const serviceId = services[0] && services[0].id;

    section('2. Akses tanpa login dan token palsu');
    const noAuthCreate = await api('POST', '/api/consultations', { json: { service_id: serviceId } });
    check('Ajukan konsultasi tanpa login ditolak', noAuthCreate.status === 401, `(status ${noAuthCreate.status})`);
    const fakeToken = await api('GET', '/api/consultations', { token: 'abc.def.ghi' });
    check('Token palsu ditolak', fakeToken.status === 401, `(status ${fakeToken.status})`);
    const noAuthAdmin = await api('GET', '/api/admin/services');
    check('Endpoint admin tanpa login ditolak', noAuthAdmin.status === 401, `(status ${noAuthAdmin.status})`);
    const clientAdmin = await api('GET', '/api/admin/services', { token: tokenA });
    check('Endpoint admin oleh klien ditolak', clientAdmin.status === 403, `(status ${clientAdmin.status})`);

    section('3. Pendaftaran dan login');
    const escalate = await api('POST', '/api/auth/register', {
        json: { name: 'Tes E', email: EMAIL.E, password: PASSWORD, role: 'admin' },
    });
    const escRole = escalate.data && escalate.data.user && escalate.data.user.role;
    check('Mendaftar dengan role=admin tetap menjadi klien', success(escalate.status) && escRole === 'client', `(role: ${escRole})`);
    const inject = await api('POST', '/api/auth/login', {
        json: { email: "' OR '1'='1' -- ", password: 'x' },
    });
    check('Login dengan teks injeksi SQL ditolak', rejected(inject.status), `(status ${inject.status})`);

    section('4. Konsultasi');
    const created = await api('POST', '/api/consultations', {
        token: tokenA,
        json: {
            service_id: serviceId,
            manuscript_title: 'Tes keamanan otomatis',
            field: 'Uji',
            target_index: 'Scopus',
            target_quartile: 'Q2',
            notes: 'dibuat oleh skrip tes',
        },
    });
    check('Klien A bisa mengajukan konsultasi', success(created.status), `(status ${created.status} ${JSON.stringify(created.data)})`);
    const [cRows] = await pool.query(
        'SELECT id, status FROM consultations WHERE client_id = ? ORDER BY id DESC LIMIT 1',
        [idA]
    );
    if (cRows.length === 0) throw new Error('Konsultasi uji tidak terbentuk, tes tidak bisa dilanjutkan.');
    const consId = cRows[0].id;
    const initialStatus = cRows[0].status;

    const ownA = await api('GET', `/api/consultations/${consId}`, { token: tokenA });
    check('Klien A bisa membuka konsultasinya sendiri', ownA.status === 200, `(status ${ownA.status})`);
    const otherB = await api('GET', `/api/consultations/${consId}`, { token: tokenB });
    check('Klien B TIDAK bisa membuka konsultasi klien A', otherB.status === 403 || otherB.status === 404, `(status ${otherB.status})`);
    const listB = await api('GET', '/api/consultations', { token: tokenB });
    const leaked = toArray(listB.data).some((c) => c.id === consId);
    check('Daftar konsultasi klien B tidak memuat milik klien A', listB.status === 200 && !leaked);
    const unassigned = await api('GET', `/api/consultations/${consId}`, { token: tokenC });
    check('Konsultan yang belum ditugaskan TIDAK bisa membuka', unassigned.status === 403 || unassigned.status === 404, `(status ${unassigned.status})`);

    section('5. Perubahan status');
    const clientComplete = await api('PATCH', `/api/consultations/${consId}/status`, {
        token: tokenA,
        json: { status: 'completed' },
    });
    check('Klien tidak bisa menandai konsultasi selesai', rejected(clientComplete.status), `(status ${clientComplete.status})`);
    const clientB_status = await api('PATCH', `/api/consultations/${consId}/status`, {
        token: tokenB,
        json: { status: 'cancelled' },
    });
    check('Klien B tidak bisa membatalkan konsultasi klien A', rejected(clientB_status.status), `(status ${clientB_status.status})`);
    const unassignedStatus = await api('PATCH', `/api/consultations/${consId}/status`, {
        token: tokenC,
        json: { status: 'awaiting_payment' },
    });
    check('Konsultan yang belum ditugaskan tidak bisa ubah status', rejected(unassignedStatus.status), `(status ${unassignedStatus.status})`);
    if (initialStatus === 'submitted') {
        const jump = await api('PATCH', `/api/consultations/${consId}/status`, {
            token: admin,
            json: { status: 'completed' },
        });
        check('Admin tidak bisa loncat status (submitted ke completed)', rejected(jump.status), `(status ${jump.status})`);
        const valid = await api('PATCH', `/api/consultations/${consId}/status`, {
            token: admin,
            json: { status: 'awaiting_payment' },
        });
        check('Admin bisa memakai transisi yang valid (submitted ke awaiting_payment)', success(valid.status), `(status ${valid.status})`);
    } else {
        console.log(`  LEWAT  Tes loncat status (status awal bukan submitted, tapi ${initialStatus})`);
    }

    section('6. Unggah naskah');
    const upOk = await api('POST', `/api/consultations/${consId}/manuscripts`, {
        token: tokenA,
        form: uploadForm(REAL_PDF, 'naskah_asli.pdf', 'application/pdf'),
    });
    check('Klien A bisa mengunggah PDF asli', success(upOk.status), `(status ${upOk.status} ${JSON.stringify(upOk.data)})`);

    const fakePdf = await api('POST', `/api/consultations/${consId}/manuscripts`, {
        token: tokenA,
        form: uploadForm(Buffer.from('ini cuma teks biasa, bukan PDF'), 'palsu.pdf', 'application/pdf'),
    });
    check('File teks berpura-pura PDF ditolak', rejected(fakePdf.status), `(status ${fakePdf.status})`);

    const exeBuf = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200, 1)]);
    const fakeExe = await api('POST', `/api/consultations/${consId}/manuscripts`, {
        token: tokenA,
        form: uploadForm(exeBuf, 'virus.pdf', 'application/pdf'),
    });
    check('Program (.exe) yang diganti nama jadi .pdf ditolak', rejected(fakeExe.status), `(status ${fakeExe.status})`);

    const bigBuf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(11 * 1024 * 1024, 65)]);
    const big = await api('POST', `/api/consultations/${consId}/manuscripts`, {
        token: tokenA,
        form: uploadForm(bigBuf, 'besar.pdf', 'application/pdf'),
    });
    check('File lebih dari 10 MB ditolak dengan kode 4xx (bukan error 500)', rejected(big.status), `(status ${big.status})`);

    const upOther = await api('POST', `/api/consultations/${consId}/manuscripts`, {
        token: tokenB,
        form: uploadForm(REAL_PDF, 'dari_b.pdf', 'application/pdf'),
    });
    check('Klien B tidak bisa mengunggah ke konsultasi klien A', rejected(upOther.status), `(status ${upOther.status})`);

    const upNoAuth = await api('POST', `/api/consultations/${consId}/manuscripts`, {
        form: uploadForm(REAL_PDF, 'tanpa_login.pdf', 'application/pdf'),
    });
    check('Unggah tanpa login ditolak', upNoAuth.status === 401, `(status ${upNoAuth.status})`);

    section('7. Unduh naskah');
    const [mRows] = await pool.query(
        'SELECT id FROM manuscripts WHERE consultation_id = ? ORDER BY id ASC LIMIT 1',
        [consId]
    );
    if (mRows.length === 0) {
        console.log('  LEWAT  Tes unduh (tidak ada naskah yang berhasil diunggah)');
    } else {
        const mId = mRows[0].id;
        const dlNoAuth = await api('GET', `/api/manuscripts/${mId}/download`);
        check('Unduh tanpa login ditolak', dlNoAuth.status === 401, `(status ${dlNoAuth.status})`);
        const dlB = await api('GET', `/api/manuscripts/${mId}/download`, { token: tokenB });
        check('Klien B tidak bisa mengunduh naskah klien A', dlB.status === 403 || dlB.status === 404, `(status ${dlB.status})`);
        const dlC = await api('GET', `/api/manuscripts/${mId}/download`, { token: tokenC });
        check('Konsultan yang belum ditugaskan tidak bisa mengunduh', dlC.status === 403 || dlC.status === 404, `(status ${dlC.status})`);
        const dlA = await api('GET', `/api/manuscripts/${mId}/download`, { token: tokenA });
        check('Pemilik bisa mengunduh dan isinya utuh', dlA.status === 200 && dlA.buf.slice(0, 5).toString() === '%PDF-', `(status ${dlA.status})`);

        section('8. Penugasan konsultan');
        const assignByClient = await api('PATCH', `/api/consultations/${consId}/assign`, {
            token: tokenA,
            json: { consultant_id: consultantId },
        });
        check('Klien tidak bisa menugaskan konsultan', rejected(assignByClient.status), `(status ${assignByClient.status})`);
        const assign = await api('PATCH', `/api/consultations/${consId}/assign`, {
            token: admin,
            json: { consultant_id: consultantId },
        });
        check('Admin bisa menugaskan konsultan', success(assign.status), `(status ${assign.status} ${JSON.stringify(assign.data)})`);
        const openC = await api('GET', `/api/consultations/${consId}`, { token: tokenC });
        check('Konsultan yang ditugaskan bisa membuka konsultasi', openC.status === 200, `(status ${openC.status})`);
        const dlC2 = await api('GET', `/api/manuscripts/${mId}/download`, { token: tokenC });
        check('Konsultan yang ditugaskan bisa mengunduh naskah', dlC2.status === 200, `(status ${dlC2.status})`);
    }

    section('9. Fitur Baru Tugas 3A: Pengaturan Situs (Settings)');
    const setNoAuth = await api('GET', '/api/settings/payment');
    check('Ambil rekening pembayaran tanpa login ditolak', setNoAuth.status === 401, `(status ${setNoAuth.status})`);

    const setClient = await api('GET', '/api/settings/payment', { token: tokenA });
    check('Klien login bisa mengambil rekening pembayaran', setClient.status === 200 && Boolean(setClient.data?.data?.bank), `(status ${setClient.status})`);

    const adminSetByClient = await api('GET', '/api/admin/settings', { token: tokenA });
    check('Klien tidak bisa membuka endpoint admin settings', adminSetByClient.status === 403, `(status ${adminSetByClient.status})`);

    const adminGetSet = await api('GET', '/api/admin/settings', { token: admin });
    check('Admin bisa membuka semua settings', adminGetSet.status === 200 && Boolean(adminGetSet.data?.settings), `(status ${adminGetSet.status})`);

    const updateSet = await api('PUT', '/api/admin/settings', {
        token: admin,
        json: { payment_bank: 'BANK_UJI_COBA' },
    });
    check('Admin bisa memperbarui settings', updateSet.status === 200, `(status ${updateSet.status})`);

    section('10. Fitur Baru Tugas 3A: Tagihan Otomatis & Pembayaran');
    const consDetailA = await api('GET', `/api/consultations/${consId}`, { token: tokenA });
    const paymentSummary = consDetailA.data?.data?.payment_summary;
    check('Konsultasi baru memuat tagihan pembayaran pending dengan unique_code',
        paymentSummary && paymentSummary.status === 'pending' && Number(paymentSummary.unique_code) > 0,
        `(summary: ${JSON.stringify(paymentSummary)})`
    );

    const [payRows] = await pool.query('SELECT * FROM payments WHERE consultation_id = ?', [consId]);
    const paymentId = payRows[0]?.id;

    const proofOther = await api('POST', `/api/consultations/${consId}/payments/proof`, {
        token: tokenB,
        form: uploadForm(REAL_PDF, 'bukti_b.pdf', 'application/pdf'),
    });
    check('Klien B tidak bisa mengunggah bukti pembayaran untuk konsultasi A', rejected(proofOther.status), `(status ${proofOther.status})`);

    const proofOk = await api('POST', `/api/consultations/${consId}/payments/proof`, {
        token: tokenA,
        form: uploadForm(REAL_PDF, 'bukti_asli.pdf', 'application/pdf'),
    });
    check('Klien A berhasil mengunggah bukti pembayaran', success(proofOk.status), `(status ${proofOk.status})`);

    const consAfterProof = await api('GET', `/api/consultations/${consId}`, { token: tokenA });
    check('Status konsultasi berubah jadi awaiting_payment setelah bukti diunggah',
        consAfterProof.data?.data?.status === 'awaiting_payment',
        `(status: ${consAfterProof.data?.data?.status})`
    );

    const proofDLNoAuth = await api('GET', `/api/payments/${paymentId}/proof`);
    check('Unduh bukti pembayaran tanpa login ditolak', proofDLNoAuth.status === 401, `(status ${proofDLNoAuth.status})`);

    const proofDLClientB = await api('GET', `/api/payments/${paymentId}/proof`, { token: tokenB });
    check('Klien B tidak bisa mengunduh bukti pembayaran milik Klien A', proofDLClientB.status === 403, `(status ${proofDLClientB.status})`);

    const proofDLClientA = await api('GET', `/api/payments/${paymentId}/proof`, { token: tokenA });
    check('Klien A pemilik bisa mengunduh bukti pembayarannya', proofDLClientA.status === 200, `(status ${proofDLClientA.status})`);

    const payUpdateByClient = await api('PATCH', `/api/payments/${paymentId}`, {
        token: tokenA,
        json: { status: 'paid' },
    });
    check('Klien tidak bisa mengubah status verifikasi pembayaran', rejected(payUpdateByClient.status), `(status ${payUpdateByClient.status})`);

    const payRejectNoNote = await api('PATCH', `/api/payments/${paymentId}`, {
        token: admin,
        json: { status: 'rejected' },
    });
    check('Admin menolak pembayaran tanpa reject_note ditolak (400)', rejected(payRejectNoNote.status), `(status ${payRejectNoNote.status})`);

    const payConfirm = await api('PATCH', `/api/payments/${paymentId}`, {
        token: admin,
        json: { status: 'paid' },
    });
    check('Admin menyetujui pembayaran (paid)', success(payConfirm.status), `(status ${payConfirm.status})`);

    const consAfterPaid = await api('GET', `/api/consultations/${consId}`, { token: tokenA });
    check('Status konsultasi otomatis menjadi in_review setelah pembayaran paid',
        consAfterPaid.data?.data?.status === 'in_review',
        `(status: ${consAfterPaid.data?.data?.status})`
    );

    const payReupdate = await api('PATCH', `/api/payments/${paymentId}`, {
        token: admin,
        json: { status: 'rejected', reject_note: 'Batal' },
    });
    check('Pembayaran yang sudah paid tidak boleh diubah lagi', rejected(payReupdate.status), `(status ${payReupdate.status})`);

    section('11. Fitur Baru Tugas 3A: Pesan & Lampiran');
    const msgB = await api('POST', `/api/consultations/${consId}/messages`, {
        token: tokenB,
        json: { body: 'Halo dari klien B yang tidak berhak' },
    });
    check('Klien B tidak bisa mengirim pesan ke konsultasi klien A', rejected(msgB.status), `(status ${msgB.status})`);

    const msgA = await api('POST', `/api/consultations/${consId}/messages`, {
        token: tokenA,
        json: { body: 'Halo konsultan, naskah saya sudah siap' },
    });
    check('Klien A bisa mengirim pesan teks', success(msgA.status), `(status ${msgA.status})`);

    const longText = 'x'.repeat(2001);
    const msgLong = await api('POST', `/api/consultations/${consId}/messages`, {
        token: tokenA,
        json: { body: longText },
    });
    check('Pesan lebih dari 2000 karakter ditolak (400)', rejected(msgLong.status), `(status ${msgLong.status})`);

    const formWithAttach = new FormData();
    formWithAttach.append('body', 'Berikut dokumen pendukung');
    formWithAttach.append('attachment', new Blob([REAL_PDF], { type: 'application/pdf' }), 'lampiran.pdf');

    const msgWithAttach = await api('POST', `/api/consultations/${consId}/messages`, {
        token: tokenA,
        form: formWithAttach,
    });
    check('Klien A bisa mengirim pesan dengan lampiran PDF', success(msgWithAttach.status), `(status ${msgWithAttach.status})`);
    const attachMsgId = msgWithAttach.data?.data?.id;

    const attachB = await api('GET', `/api/messages/${attachMsgId}/attachment`, { token: tokenB });
    check('Klien B tidak bisa mengunduh lampiran pesan konsultasi A', rejected(attachB.status), `(status ${attachB.status})`);

    const attachC = await api('GET', `/api/messages/${attachMsgId}/attachment`, { token: tokenC });
    check('Konsultan yang ditugaskan bisa mengunduh lampiran pesan', attachC.status === 200, `(status ${attachC.status})`);

    const consUnread = await api('GET', `/api/consultations/${consId}`, { token: tokenC });
    check('Konsultan melihat pesan belum dibaca (unread_count > 0)',
        Number(consUnread.data?.data?.unread_count) >= 2,
        `(unread_count: ${consUnread.data?.data?.unread_count})`
    );

    const markReadC = await api('PATCH', `/api/consultations/${consId}/messages/read`, { token: tokenC });
    check('Konsultan bisa menandai pesan sebagai sudah dibaca', success(markReadC.status), `(status ${markReadC.status})`);

    const consAfterRead = await api('GET', `/api/consultations/${consId}`, { token: tokenC });
    check('Setelah ditandai dibaca, unread_count menjadi 0',
        Number(consAfterRead.data?.data?.unread_count) === 0,
        `(unread_count: ${consAfterRead.data?.data?.unread_count})`
    );

    section('12. Fitur Baru Tugas 3A: Filter & Summary Konsultasi');
    const summaryA = await api('GET', '/api/consultations/summary', { token: tokenA });
    check('Klien A bisa mengakses /api/consultations/summary',
        summaryA.status === 200 && summaryA.data?.data?.total >= 1,
        `(summary: ${JSON.stringify(summaryA.data)})`
    );

    const listFilter = await api('GET', `/api/consultations?status=in_review`, { token: tokenA });
    check('Filter ?status= mengembalikan hasil yang sesuai',
        listFilter.status === 200 && Array.isArray(listFilter.data?.data),
        `(count: ${listFilter.data?.data?.length})`
    );
}

async function main() {
    try {
        await run();
    } catch (err) {
        if (err.message === 'RATE_LIMIT') {
            console.log('\nTerhenti: pembatas percobaan login (429) aktif. Restart server atau tunggu 15 menit, lalu ulangi.');
        } else {
            console.log(`\nTerhenti: ${err.message}`);
        }
        process.exitCode = 1;
    }

    await cleanup();

    console.log('\n----------------------------------------');
    console.log(`LOLOS: ${pass}   GAGAL: ${fail}`);
    if (failures.length > 0) {
        console.log('\nYang gagal:');
        failures.forEach((f) => console.log(`  - ${f}`));
        process.exitCode = 1;
    }
    await pool.end();
}

main();