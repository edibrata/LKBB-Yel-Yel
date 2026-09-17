import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const data = [
  { number: '002', name: 'SDN SUKARESMI 1' },
  { number: '003', name: 'SDN SIDAMUKTI 2' },
  { number: '004', name: 'SDN CIBUNGUR 3' },
  { number: '005', name: 'SDN CIBUNGUR 1' },
  { number: '006', name: 'SDN PERDANA' },
  { number: '007', name: 'SDN SIDAMUKTI 3' },
  { number: '008', name: 'SDN CIBUNGUR 2' },
  { number: '009', name: 'SDN CIKUYA 1' },
  { number: '010', name: 'SDN PASIRKADU 1' },
  { number: '011', name: 'SDN CIKUYA 2' },
  { number: '012', name: 'SDN SEUSEUPAN 1' },
  { number: '013', name: 'SDN KUBANGKAMPIL 1' },
  { number: '014', name: 'SDN CIKUYA 3' },
  { number: '015', name: 'SDN WERU 2' },
  { number: '016', name: 'SDN KARYASARI 2' },
  { number: '017', name: 'SDN KUBANGKAMPIL 2' },
  { number: '018', name: 'SDN SIDAMUKTI 4' },
  { number: '019', name: 'SDN SUKARESMI 2' },
  { number: '020', name: 'SDN PERDANA 3' },
  { number: '021', name: 'SDN SIDAMUKTI 1' },
  { number: '022', name: 'MI ANWARUL HIDAYAH' },
  { number: '023', name: 'SDN PASIRKADU 2' },
  { number: '025', name: 'SDN PASIRKADU 4' },
  { number: '026', name: 'SDN KARYASARI 4' }
];

async function seed() {
  for (const item of data) {
    const docId = `P_${item.number}`;
    await setDoc(doc(db, 'participants', docId), {
      number: item.number,
      name: item.name,
      category: 'SD Putra'
    });
    console.log(`Added ${item.number} - ${item.name}`);
  }
  console.log('Done');
  process.exit(0);
}

seed();
