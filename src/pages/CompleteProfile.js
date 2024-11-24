import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { db, storage, auth } from '../firebase/config';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { setUser } from '../store/slices/userSlice';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';

const CompleteProfile = () => {
  const user = useSelector(state => state.user.currentUser);
  const [formData, setFormData] = useState({
    username: '',
    accountType: 'musician',
    bio: '',
    instruments: '',
    genres: '',
    venueCapacity: '',
    profileImage: null
  });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.needsProfile) {
      navigate('/');
    }
  }, [user, navigate]);

  const checkUsernameAvailability = async (username) => {
    if (!username) return;
    
    setIsCheckingUsername(true);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!usernameAvailable) {
      alert('Username is not available');
      return;
    }

    try {
      // Upload profile image if exists
      let profileImageUrl = '';
      if (formData.profileImage) {
        const imageRef = ref(storage, `profiles/${user.uid}`);
        await uploadBytes(imageRef, formData.profileImage);
        profileImageUrl = await getDownloadURL(imageRef);
      }

      // Create user document
      const userData = {
        uid: user.uid,
        email: user.email,
        username: formData.username.toLowerCase(),
        displayName: formData.username,
        accountType: formData.accountType,
        bio: formData.bio,
        genres: formData.genres.split(',').map(genre => genre.trim()),
        profileImage: profileImageUrl,
        createdAt: new Date().toISOString(),
        ...(formData.accountType === 'musician' 
          ? { instruments: formData.instruments.split(',').map(i => i.trim()) }
          : { venueCapacity: parseInt(formData.venueCapacity) }
        )
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.username,
          photoURL: profileImageUrl
        });
      }

      dispatch(setUser(userData));
      navigate('/');
    } catch (error) {
      console.error('Error completing profile:', error);
      alert(error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Complete Your Profile</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          />
          {isCheckingUsername && (
            <span className="text-sm text-gray-500">Checking availability...</span>
          )}
          {!usernameAvailable && (
            <span className="text-sm text-red-500">Username is not available</span>
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
          <label className="block mb-1">Bio</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows="3"
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

        <button 
          type="submit" 
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
          disabled={!usernameAvailable || isCheckingUsername}
        >
          Complete Profile
        </button>
      </form>
    </div>
  );
};

export default CompleteProfile; 