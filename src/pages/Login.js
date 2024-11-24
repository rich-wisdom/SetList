import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { setUser } from '../store/slices/userSlice';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      dispatch(setUser(userDoc.data()));
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in our database
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create minimal user profile
        const initialUserData = {
          uid: user.uid,
          email: user.email,
          username: user.email.split('@')[0], // temporary username
          needsProfile: true,
          createdAt: new Date().toISOString()
        };
        
        await setDoc(userDocRef, initialUserData);
        dispatch(setUser(initialUserData));
        navigate('/complete-profile');
      } else {
        dispatch(setUser(userDoc.data()));
        navigate('/');
      }
    } catch (error) {
      if (error.code !== 'auth/cancelled-popup-request') {
        setError(error.message);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <button 
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          Login
        </button>
      </form>

      <div className="mt-4 text-center">
        <span className="text-gray-500">or</span>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="w-full mt-4 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-50 flex items-center justify-center gap-2"
      >
        <img 
          src="/icons/google.png" 
          alt="Google" 
          className="w-5 h-5"
        />
        Continue with Google
      </button>
    </div>
  );
};

export default Login; 