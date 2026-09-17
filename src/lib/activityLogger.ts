import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const logActivity = async (userId: string, userName: string, role: string, action: string, details: string) => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      userName,
      role,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
