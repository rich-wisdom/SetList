import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { auth, googleProvider, db, storage } from '../firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  updateProfile 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { setUser, setError } from '../store/slices/userSlice';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    accountType: 'musician', // or 'venue'
    bio: '',
    instruments: '', // for musicians
    genres: '', // for both
    venueCapacity: '', // for venues
    profileImage: null
  });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [stageName, setStageName] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    return usernameRegex.test(username);
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || !validateUsername(username)) return;
    
    setIsCheckingUsername(true);
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('usernameLower', '==', username.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    
    setUsernameAvailable(querySnapshot.empty);
    setIsCheckingUsername(false);
  };

  const handleUsernameChange = (e) => {
    const username = e.target.value;
    setFormData(prev => ({ ...prev, username }));
    checkUsernameAvailability(username);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setFormData(prev => ({ ...prev, profileImage: e.target.files[0] }));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // New Google user - redirect to complete profile
        dispatch(setUser({ 
          uid: user.uid,
          email: user.email,
          needsProfile: true 
        }));
        navigate('/complete-profile');
      } else {
        // Existing user - log them in
        dispatch(setUser(userDoc.data()));
        navigate('/');
      }
    } catch (error) {
      dispatch(setError(error.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateUsername(formData.username)) {
      setError('Username can only contain letters, numbers, dashes, and underscores');
      return;
    }

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      let profileImageUrl = '';
      if (formData.profileImage) {
        const imageRef = ref(storage, `profiles/${userCredential.user.uid}`);
        await uploadBytes(imageRef, formData.profileImage);
        profileImageUrl = await getDownloadURL(imageRef);
      }

      // Create user document in Firestore
      const userData = {
        uid: userCredential.user.uid,
        email: formData.email,
        username: formData.username.toLowerCase(),
        accountType: formData.accountType,
        bio: formData.bio,
        genres: formData.genres.split(',').map(genre => genre.trim()),
        profileImage: profileImageUrl,
        createdAt: new Date().toISOString(),
        ...(formData.accountType === 'musician' 
          ? { instruments: formData.instruments.split(',').map(i => i.trim()) }
          : { venueCapacity: parseInt(formData.venueCapacity) }
        ),
        usernameLower: formData.username.toLowerCase(),
        stageName: stageName,
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      // Update Redux store
      dispatch(setUser(userData));
      navigate('/');
    } catch (error) {
      console.error('Error during registration:', error);
      setError(error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Register</h2>
      
      <button
        onClick={handleGoogleSignIn}
        className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg mb-4 flex items-center justify-center hover:bg-gray-50"
      >
        <img src="/google-icon.png" alt="Google" className="w-6 h-6 mr-2" />
        Continue with Google
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or register with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleUsernameChange}
            className={`w-full p-2 border rounded ${
              !usernameAvailable ? 'border-red-500' : ''
            }`}
            required
            pattern="[a-zA-Z0-9_-]+"
          />
          {isCheckingUsername && (
            <span className="text-sm text-gray-500">Checking availability...</span>
          )}
          {!usernameAvailable && (
            <span className="text-sm text-red-500">Username is not available</span>
          )}
          {!validateUsername(formData.username) && (
            <p className="text-red-500">
              Username can only contain letters, numbers, dashes, and underscores
            </p>
          )}
        </div>

        <div>
          <label className="block mb-1">Account Type</label>
          <select
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="musician">Musician</option>
            <option value="venue">Venue</option>
          </select>
        </div>

        {formData.accountType === 'musician' ? (
          <div>
            <label className="block mb-1">Instruments (comma-separated)</label>
            <input
              type="text"
              name="instruments"
              value={formData.instruments}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Guitar, Piano, Drums"
            />
          </div>
        ) : (
          <div>
            <label className="block mb-1">Venue Capacity</label>
            <input
              type="number"
              name="venueCapacity"
              value={formData.venueCapacity}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Maximum crowd size"
            />
          </div>
        )}

        <div>
          <label className="block mb-1">Genres (comma-separated)</label>
          <input
            type="text"
            name="genres"
            value={formData.genres}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="Rock, Jazz, Blues"
          />
        </div>

        <div>
          <label className="block mb-1">Profile Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full p-2"
          />
        </div>

        <div>
          <label>{formData.accountType === 'musician' ? 'Stage Name' : 'Venue Name'}</label>
          <input
            type="text"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded">
          Register
        </button>
      </form>
    </div>
  );
};

export default Register; 