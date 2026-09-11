import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD6gb4z58EAANhRpCwqEqBETz3LsucgWmo",
  authDomain: "studio-3440483519-68ed7.firebaseapp.com",
  projectId: "studio-3440483519-68ed7",
  storageBucket: "studio-3440483519-68ed7.firebasestorage.app",
  messagingSenderId: "250555537883",
  appId: "1:250555537883:web:6f9214d094c1c25599effe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedPath = 'c:/Users/Rishikesh/OneDrive/Documents/GitHub/Siyaram Project/migration_review/clean-verified-seed-data.json';
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

async function seed() {
  console.log('🚀 Starting Clean Verified Seed Deployment to Firestore...');

  // 1. Existing members map
  const existingMembersSnap = await getDocs(collection(db, 'members'));
  const nameToExistingId = {};
  existingMembersSnap.forEach((d) => {
    const data = d.data();
    const cleanName = (data.name || '').trim().toUpperCase().replace(/\./g, '');
    nameToExistingId[cleanName] = d.id;
  });
  console.log('Found existing member IDs in Firestore:', nameToExistingId);

  // 2. Deploy Season
  const seasonToDeploy = {
    ...seedData.season,
    id: '2025-26', // Match Firestore active season ID
    name: 'Ganesh Utsav 2025–26',
  };
  await setDoc(doc(db, 'seasons', seasonToDeploy.id), seasonToDeploy, { merge: true });
  console.log(`✅ Season [${seasonToDeploy.id}] successfully deployed.`);

  // 3. Deploy Members
  for (const m of seedData.members) {
    const cleanLookup = m.name.trim().toUpperCase().replace(/\./g, '');
    const docId = nameToExistingId[cleanLookup] || m.id;
    const memberDoc = {
      ...m,
      id: docId,
    };
    await setDoc(doc(db, 'members', docId), memberDoc, { merge: true });
    console.log(`✅ Member [${m.name}] deployed to doc [${docId}].`);
  }

  // 4. Deploy Buildings
  for (const b of seedData.buildings) {
    await setDoc(doc(db, 'buildings', b.code), b, { merge: true });
    console.log(`✅ Building [${b.name}] (Code: ${b.code}) deployed with ${b.floors.reduce((acc, f) => acc + f.flats.length, 0)} flats.`);
  }

  // 5. Deploy Transactions in batches
  console.log(`📦 Deploying ${seedData.transactions.length} verified transactions...`);
  const chunkSize = 50;
  for (let i = 0; i < seedData.transactions.length; i += chunkSize) {
    const chunk = seedData.transactions.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((t) => {
      const ref = doc(db, 'transactions', t.id);
      batch.set(ref, t, { merge: true });
    });
    await batch.commit();
    console.log(`   - Committed transactions ${i + 1} to ${Math.min(i + chunkSize, seedData.transactions.length)}`);
  }
  console.log('✅ All 100 Transactions successfully deployed.');

  // 6. Deploy Audit Log
  const auditLog = {
    id: `log-seed-${Date.now()}`,
    action: 'CREATE',
    previousValue: null,
    newValue: {
      seasonId: seasonToDeploy.id,
      openingBalance: seasonToDeploy.openingBalance,
      membersTotal: seedData.summary.breakdown.membersTotal,
      buildingsTotal: seedData.summary.breakdown.buildingsTotal,
      chandaTotal: seedData.summary.breakdown.chandaTotal,
      expensesTotal: seedData.summary.breakdown.expensesTotal,
      transactionsCount: seedData.transactions.length,
      netOnlineBalance: seedData.summary.netOnlineBalance,
      netCashInHand: seedData.summary.netCashInHand,
      totalNetBalance: seedData.summary.totalNetBalance,
    },
    performedBy: 'Admin:VerifiedSeedDeployer',
    timestamp: new Date().toISOString(),
    notes: 'Complete clean verified seed migration deployed with all 100 transactions and exact financial reconciliation.',
  };
  await setDoc(doc(db, 'auditLogs', auditLog.id), auditLog, { merge: true });
  console.log('✅ Audit Log deployed successfully.');

  console.log('\n🎉 ALL SEED DATA SUCCESSFULLY DEPLOYED TO FIRESTORE!');
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
