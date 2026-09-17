const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  const scoresRef = db.collection('scores');
  const snapshot = await scoresRef.get();
  snapshot.forEach(doc => {
     console.log(doc.id, doc.data().timerSeconds, doc.data().timePenalty, doc.data().post);
  });
}
run();
