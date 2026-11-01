/**
 * Seed 6 layanan awal Scientia Advantage.
 * Jalankan: node scripts/seedServices.js
 *
 * Aman dijalankan berulang kali: INSERT ... ON DUPLICATE KEY UPDATE
 * berdasarkan name_id (dijadikan UNIQUE di sini lewat filter).
 */

require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

const services = [
  {
    name_id: 'Pendampingan Publikasi Jurnal',
    name_en: 'Journal Publication Assistance',
    description_id:
      'Layanan pendampingan lengkap untuk membantu penulis mempublikasikan artikel ilmiah di jurnal Scopus dan Web of Science, mulai dari pemilihan jurnal yang tepat, penyesuaian format naskah, hingga proses pengiriman dan komunikasi dengan editor.',
    description_en:
      'Comprehensive assistance service to help authors publish scientific articles in Scopus and Web of Science journals, covering journal selection, manuscript formatting, submission process, and communication with editors.',
    price: 2500000,
    is_active: 1,
  },
  {
    name_id: 'Pelatihan Penulisan Ilmiah',
    name_en: 'Scientific Writing Training',
    description_id:
      'Program pelatihan intensif yang dirancang untuk meningkatkan kemampuan penulisan ilmiah peserta, mencakup struktur artikel, teknik penyajian data, penggunaan referensi yang tepat, serta strategi menembus jurnal bereputasi internasional.',
    description_en:
      'Intensive training program designed to enhance participants\' scientific writing skills, covering article structure, data presentation techniques, proper referencing, and strategies for publishing in reputable international journals.',
    price: 1500000,
    is_active: 1,
  },
  {
    name_id: 'Analisis dan Pembelajaran Riset',
    name_en: 'Research Analysis and Learning',
    description_id:
      'Layanan analisis mendalam terhadap topik riset klien, termasuk analisis bibliometrik, pemetaan literatur, identifikasi celah penelitian, dan rekomendasi arah riset yang berpotensi tinggi untuk dipublikasikan di jurnal terindeks.',
    description_en:
      'In-depth analysis service for client research topics, including bibliometric analysis, literature mapping, research gap identification, and recommendations for research directions with high publication potential in indexed journals.',
    price: 1800000,
    is_active: 1,
  },
  {
    name_id: 'Bimbingan Strategi Publikasi',
    name_en: 'Publication Strategy Guidance',
    description_id:
      'Konsultasi strategis untuk merancang peta jalan publikasi ilmiah jangka panjang, mencakup pemilihan topik riset yang relevan, penentuan target jurnal berdasarkan scope dan kuartil, serta perencanaan kolaborasi penelitian.',
    description_en:
      'Strategic consultation to design a long-term scientific publication roadmap, covering relevant research topic selection, target journal determination based on scope and quartile, and research collaboration planning.',
    price: 1200000,
    is_active: 1,
  },
  {
    name_id: 'Reviu Manuskrip',
    name_en: 'Manuscript Review',
    description_id:
      'Layanan tinjauan menyeluruh terhadap naskah ilmiah sebelum dikirim ke jurnal, meliputi pemeriksaan struktur, isi, metodologi, kualitas bahasa, kesesuaian format dengan panduan penulis jurnal target, serta rekomendasi perbaikan yang spesifik.',
    description_en:
      'Comprehensive review service for scientific manuscripts before journal submission, including structure, content, methodology, language quality, format compliance with target journal author guidelines, and specific improvement recommendations.',
    price: 800000,
    is_active: 1,
  },
  {
    name_id: 'Konsultasi Riset',
    name_en: 'Research Consultation',
    description_id:
      'Sesi konsultasi tatap muka atau daring untuk mendiskusikan tantangan spesifik dalam proses penelitian dan publikasi, termasuk desain penelitian, analisis data, interpretasi hasil, dan penyusunan bagian tertentu dari naskah ilmiah.',
    description_en:
      'Face-to-face or online consultation sessions to discuss specific challenges in the research and publication process, including research design, data analysis, results interpretation, and drafting specific sections of the scientific manuscript.',
    price: 600000,
    is_active: 1,
  },
];

async function main() {
  console.log('Memulai seeding layanan...');

  for (const svc of services) {
    const [existing] = await pool.query(
      'SELECT id FROM services WHERE name_id = ?',
      [svc.name_id]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE services
            SET name_en = ?, description_id = ?, description_en = ?,
                price = ?, is_active = ?
          WHERE name_id = ?`,
        [
          svc.name_en,
          svc.description_id,
          svc.description_en,
          svc.price,
          svc.is_active,
          svc.name_id,
        ]
      );
      console.log(`  [UPDATE] ${svc.name_id}`);
    } else {
      await pool.query(
        `INSERT INTO services (name_id, name_en, description_id, description_en, price, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          svc.name_id,
          svc.name_en,
          svc.description_id,
          svc.description_en,
          svc.price,
          svc.is_active,
        ]
      );
      console.log(`  [INSERT] ${svc.name_id}`);
    }
  }

  console.log('Selesai! 6 layanan siap.');
  await pool.end();
}

main().catch((err) => {
  console.error('Seed gagal:', err.message);
  process.exit(1);
});
