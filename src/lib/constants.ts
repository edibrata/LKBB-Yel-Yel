export const CATEGORIES = [
  'SD Putra',
  'SD Putri',
  'SMP Putra',
  'SMP Putri',
];

export const STRUCTURED_CRITERIA = [
  {
    id: 'kerapihan',
    name: 'Kerapihan (10%)',
    weight: 10,
    subCriteria: [
      {
        id: 'kerapihan_seragam',
        name: 'Kelengkapan Seragam Lapangan',
        desc: 'Memeriksa kelengkapan sesuai surat edaran. Laki-laki (Baret, Kacu, Kaos Sekolah, Celana Pramuka). Perempuan (Topi Pramuka, Kacu, Kaos Sekolah, Celana Pramuka).',
        rubrics: [
          { score: 5, text: 'Seluruh anggota regu memakai seragam lapangan lengkap 100% sesuai edaran tanpa cacat.' },
          { score: 4, text: 'Mayoritas lengkap, terdapat 1-2 anggota regu dengan kekurangan kecil (misal: kacu kurang rapi, cara pakai baret/topi kurang pas).' },
          { score: 3, text: 'Terdapat 3-4 anggota regu yang atribut utamanya tidak lengkap (tidak bawa kacu/baret/topi).' },
          { score: 2, text: 'Lebih dari separuh regu tidak lengkap atau memakai seragam yang salah (bukan seragam lapangan pramuka).' },
          { score: 1, text: 'Hampir seluruh regu tidak mematuhi ketentuan seragam lapangan sama sekali.' }
        ]
      },
      {
        id: 'kerapihan_atribut',
        name: 'Keseragaman Atribut Regu',
        desc: 'Menilai kesamaan desain/warna kaos olahraga sekolah di dalam satu regu (identik), termasuk keseragaman model topi/baret yang digunakan.',
        rubrics: [
          { score: 5, text: 'Desain, warna, dan corak seragam serta atribut tambahan sangat identik dan seragam seluruh regu.' },
          { score: 4, text: 'Keseragaman sangat baik, hanya 1-2 anggota regu yang warnanya sedikit pudar/berbeda batch pembuatan.' },
          { score: 3, text: 'Terdapat perbedaan atribut yang cukup mencolok pada 3-4 anggota regu (misal: beda warna kaos/celana).' },
          { score: 2, text: 'Keseragaman sangat kurang, lebih dari separuh regu memakai desain/warna pakaian yang belang-belang.' },
          { score: 1, text: 'Tidak ada keseragaman atribut sama sekali di dalam regu tersebut.' }
        ]
      },
      {
        id: 'kerapihan_barisan',
        name: 'Kerapian Barisan (Visual Geometris)',
        desc: 'Kelurusan saf dan banjar, jarak antar anggota konstan, posisi tangan dan kaki saat sikap sempurna yang seragam sebelum bergerak.',
        rubrics: [
          { score: 5, text: 'Saf dan banjar lurus sempurna, jarak konstan, sikap sempurna statis tak tergoyahkan oleh seluruh anggota.' },
          { score: 4, text: 'Barisan rapi, namun terdapat 1-2 anggota yang posisinya sedikit keluar dari garis kelurusan saf/banjar.' },
          { score: 3, text: 'Barisan kurang rapat/berantakan pada 3-4 anggota, sikap sempurna masih terlihat ada gerakan tambahan.' },
          { score: 2, text: 'Jarak antar anggota tidak teratur secara mayoritas, barisan melengkung dan sikap sempurna buruk.' },
          { score: 1, text: 'Regu tidak mampu membentuk formasi barisan saf/banjar yang jelas sejak awal.' }
        ]
      }
    ]
  },
  {
    id: 'gerakan',
    name: 'Gerakan di Tempat dan Berpindah Tempat (40%)',
    weight: 40,
    subCriteria: [
      {
        id: 'gerakan_pbb',
        name: 'Penguasaan Teknik PBB Dasar',
        desc: 'Ketepatan gerakan di tempat (hadap kanan/kiri, balik kanan, hormat, dll). (Catatan sistem: Jika salah gerakan, juri memberikan skor lebih rendah).',
        rubrics: [
          { score: 5, text: 'Seluruh gerakan dilakukan dengan sangat akurat dan serempak sesuai aturan PBB. Tidak ada kesalahan teknis.' },
          { score: 4, text: 'Sebagian besar gerakan dilakukan dengan benar dan serempak. Terdapat 1-2 kesalahan kecil/kurang patah-patah.' },
          { score: 3, text: 'Terdapat beberapa kesalahan teknis (3-4 kesalahan) atau kurang serempak secara kasat mata.' },
          { score: 2, text: 'Banyak kesalahan teknis (lebih dari 4 kesalahan), ada anggota yang salah hadap/bingung aba-aba.' },
          { score: 1, text: 'Gerakan yang dilakukan sangat kacau, tidak serempak, dan jauh dari standar PBB.' }
        ]
      },
      {
        id: 'gerakan_berpindah',
        name: 'Ketepatan Gerakan Berpindah',
        desc: 'Kekompakan dan teknik saat langkah tegap/biasa dan perpindahan posisi.',
        rubrics: [
          { score: 5, text: 'Kekompakan, hentakan kaki, ayunan tangan, dan transisi perpindahan posisi dilakukan sempurna dan serempak.' },
          { score: 4, text: 'Gerakan berpindah baik, namun terdapat 1-2 ketidaksamaan hentakan kaki atau kelurusan barisan saat berjalan.' },
          { score: 3, text: 'Cukup sering terjadi "langkah gantung" atau barisan menjadi acak-acakan saat perpindahan formasi.' },
          { score: 2, text: 'Perpindahan posisi sangat berantakan, langkah kaki tidak seirama secara mayoritas.' },
          { score: 1, text: 'Regu tidak mampu melakukan gerakan berpindah secara terkoordinasi (berjalan sendiri-sendiri).' }
        ]
      },
      {
        id: 'gerakan_danton',
        name: 'Peran Pemimpin Regu (Di Dalam Barisan)',
        desc: 'Pemimpin regu melapor untuk menentukan aba-aba; menilai kelantangan, ketegasan, dan kejelasan aba-aba yang diberikan dari dalam formasi barisan.',
        rubrics: [
          { score: 5, text: 'Suara aba-aba sangat lantang, artikulasi sangat jelas, tegas, dan timing pemberian aba-aba sangat presisi.' },
          { score: 4, text: 'Aba-aba lantang dan tegas, namun ada 1-2 instruksi yang timing jeda eksekusinya kurang tepat.' },
          { score: 3, text: 'Suara kurang lantang/agak serak, sehingga beberapa anggota tampak ragu mengeksekusi aba-aba.' },
          { score: 2, text: 'Aba-aba sering salah ucap, artikulasi tidak jelas, atau volume suara terlalu pelan.' },
          { score: 1, text: 'Pemimpin regu tidak mampu memimpin, aba-aba tidak terdengar atau salah total.' }
        ]
      }
    ]
  },
  {
    id: 'variasi',
    name: 'Gerakan Variasi, Formasi dan Yel-Yel (40%)',
    weight: 40,
    subCriteria: [
      {
        id: 'variasi_estetika',
        name: 'Kreativitas dan Estetika',
        desc: 'Menilai orisinalitas, keunikan, dan keindahan gerak variasi agar tidak monoton.',
        rubrics: [
          { score: 5, text: 'Koreografi variasi sangat unik, orisinal, indah, dan menampilkan unsur kepramukaan yang kuat dan tidak monoton.' },
          { score: 4, text: 'Gerakan variasi menarik dan menghibur, namun konsepnya terasa umum/sering digunakan regu lain.' },
          { score: 3, text: 'Kreativitas standar, gerakan terkesan kaku atau merupakan pengulangan dari PBB dasar tanpa sentuhan seni.' },
          { score: 2, text: 'Minim variasi, gerakan monoton, membosankan, dan tidak memiliki nilai estetika pertunjukan.' },
          { score: 1, text: 'Tidak menampilkan gerakan variasi yang bermakna sama sekali.' }
        ]
      },
      {
        id: 'variasi_kesulitan',
        name: 'Tingkat Kesulitan',
        desc: 'Menilai transisi dan kerumitan manuver dari satu formasi ke formasi lain.',
        rubrics: [
          { score: 5, text: 'Transisi dan manuver perpindahan antar formasi sangat rumit, dinamis, namun dieksekusi dengan mulus tanpa cela.' },
          { score: 4, text: 'Manuver formasi cukup rumit, eksekusi baik, namun sedikit terlihat jeda keraguan saat transisi.' },
          { score: 3, text: 'Transisi formasi tergolong mudah/sederhana (hanya maju-mundur/geser sederhana).' },
          { score: 2, text: 'Sering terjadi tabrakan antar anggota saat berpindah tempat menyusun formasi.' },
          { score: 1, text: 'Gagal membentuk formasi variasi sama sekali.' }
        ]
      },
      {
        id: 'variasi_kekompakan',
        name: 'Kekompakan dan Semangat',
        desc: 'Menilai keserempakan gerakan fisik sekaligus kekompakan, volume, dan semangat vokal suara.',
        rubrics: [
          { score: 5, text: 'Energi, semangat vokal, dan keserempakan gerak fisik menyatu luar biasa dan dipertahankan sepanjang waktu.' },
          { score: 4, text: 'Sangat kompak, namun semangat vokal agak menurun di pertengahan/akhir penampilan.' },
          { score: 3, text: 'Kekompakan gerak dan kekompakan suara sering tidak seirama, semangat terlihat biasa saja.' },
          { score: 2, text: 'Banyak pergerakan yang terlambat, vokal terdengar tidak sinkron antar anggota (bersahut-sahutan salah).' },
          { score: 1, text: 'Regu terlihat lesu, tidak bersemangat, dan tidak kompak dalam bernyanyi/bersuara.' }
        ]
      },
      {
        id: 'variasi_pesan',
        name: 'Pesan dan Komunikasi',
        desc: 'Menilai kejelasan pesan edukatif dari lirik Yel-Yel, dipadukan dengan kejelasan artikulasi/aba-aba pemimpin regu saat variasi.',
        rubrics: [
          { score: 5, text: 'Lirik yel-yel sangat edukatif, membangkitkan nasionalisme/pramuka, diartikulasikan dengan sangat jelas hingga pesannya tersampaikan ke penonton.' },
          { score: 4, text: 'Pesan yel-yel baik, namun ada beberapa kata/bait yang pengucapannya terburu-buru sehingga kurang jelas maknanya.' },
          { score: 3, text: 'Pesan yel-yel sekadar pantun/nyanyian biasa tanpa unsur edukasi kepramukaan yang kuat.' },
          { score: 2, text: 'Lirik yel-yel tidak nyambung, artikulasi sangat buruk (bergumam), pesan tidak dapat ditangkap.' },
          { score: 1, text: 'Lirik mengandung unsur negatif/tidak pantas, atau regu lupa lirik yel-yel.' }
        ]
      }
    ]
  },
  {
    id: 'waktu',
    name: 'Ketepatan Waktu (10%)',
    weight: 10,
    subCriteria: [
      {
        id: 'waktu_performa',
        name: 'Pemanfaatan Waktu (Skor Performa)',
        desc: 'Juri memberikan skor berdasarkan efisiensi pemanfaatan waktu 5 menit secara proporsional (tidak terburu-buru dan tidak terlalu singkat).',
        rubrics: [
          { score: 5, text: 'Pemanfaatan waktu sangat proporsional dan padat karya (mendekati 5 menit optimal), tidak terburu-buru, dan selesai dengan timing sempurna.' },
          { score: 4, text: 'Performa selesai tepat waktu, namun ada bagian penampilan yang terlihat terlalu dipercepat atau agak diulur-ulur.' },
          { score: 3, text: 'Waktu penampilan terlalu singkat (kurang dari 3 menit) sehingga materi lomba kurang tereksplorasi.' },
          { score: 2, text: 'Melewati batas maksimal waktu (terkena cut) atau sangat singkat (kurang dari 2 menit).' },
          { score: 1, text: 'Penampilan sangat kacau secara manajemen waktu, jauh dari durasi yang diinstruksikan.' }
        ]
      }
    ]
  }
];

export const FLAT_CRITERIA = STRUCTURED_CRITERIA.flatMap(mc => mc.subCriteria.map(sc => ({
  ...sc,
  aspectId: mc.id,
  aspectName: mc.name,
  aspectWeight: mc.weight
})));

// Backward compatibility or flat map
export const SCORING_CRITERIA = {
  1: FLAT_CRITERIA,
  2: FLAT_CRITERIA,
  3: FLAT_CRITERIA,
};
