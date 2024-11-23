import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';

const Profile = () => {
  const { id } = useParams();
  const { currentUser } = useSelector(state => state.user);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data());
          setIsFriend(docSnap.data().friends.includes(currentUser.uid));
        }

        // Fetch user's posts
        const postsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', id)
        );
        const postsSnap = await getDocs(postsQuery);
        const postsData = postsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(postsData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, currentUser]);

  const handleFriendAction = async () => {
    try {
      const userRef = doc(db, 'users', id);
      const currentUserRef = doc(db, 'users', currentUser.uid);

      if (isFriend) {
        // Remove friend
        await updateDoc(userRef, {
          friends: arrayRemove(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          friends: arrayRemove(id)
        });
      } else {
        // Add friend
        await updateDoc(userRef, {
          friends: arrayUnion(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          friends: arrayUnion(id)
        });
      }
      setIsFriend(!isFriend);
    } catch (error) {
      console.error('Error updating friend status:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center space-x-4">
          <img
            src={profile.photoURL || '/default-avatar.png'}
            alt={profile.displayName}
            className="w-24 h-24 rounded-full object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            <p className="text-gray-600">{profile.bio}</p>
            <div className="mt-2">
              <strong>Instruments:</strong>
              {profile.instruments.map((instrument, index) => (
                <span key={index} className="ml-2 bg-gray-200 px-2 py-1 rounded">
                  {instrument}
                </span>
              ))}
            </div>
          </div>
          {currentUser.uid !== id && (
            <button
              onClick={handleFriendAction}
              className={`ml-auto px-4 py-2 rounded ${
                isFriend ? 'bg-red-500' : 'bg-indigo-600'
              } text-white`}
            >
              {isFriend ? 'Remove Friend' : 'Add Friend'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Posts</h2>
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-800">{post.content}</p>
            <span className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile; 