import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { setUser, clearUser } from '../store/slices/userSlice';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log('Current auth user:', user.uid);
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            console.log('User data from Firestore:', userDocSnap.data());
            dispatch(setUser({
              uid: user.uid,
              ...userDocSnap.data()
            }));
          } else {
            console.log('No user document found, creating one...');
            // Create a basic profile if none exists
            const userData = {
              uid: user.uid,
              email: user.email,
              username: user.email.split('@')[0],
              createdAt: new Date().toISOString(),
              needsProfile: true
            };
            await setDoc(userDocRef, userData);
            dispatch(setUser(userData));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          dispatch(clearUser());
        }
      } else {
        dispatch(clearUser());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return children;
};

export default AuthProvider; 