import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { auth, db, storage } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { setUser, setError } from '../store/slices/userSlice';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    bio: '',
    instruments: '',
    profileImage: null
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        profileImage: e.target.files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      let photoURL = '';
      if (formData.profileImage) {
        const imageRef = ref(storage, `profiles/${userCredential.user.uid}`);
        await uploadBytes(imageRef, formData.profileImage);
        photoURL = await getDownloadURL(imageRef);
      }

      // Update profile
      await updateProfile(userCredential.user, {
        displayName: formData.displayName,
        photoURL
      });

      // Create user document
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        displayName: formData.displayName,
        email: formData.email,
        bio: formData.bio,
        instruments: formData.instruments.split(',').map(i => i.trim()),
        photoURL,
        friends: [],
        createdAt: new Date().toISOString()
      });

      dispatch(setUser(userCredential.user));
      navigate('/');
    } catch (error) {
      dispatch(setError(error.message));
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
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
          <label className="block mb-1">Display Name</label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
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
        <div>
          <label className="block mb-1">Profile Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full p-2"
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