import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { Link } from 'react-router-dom';

const Forum = () => {
  const { currentUser } = useSelector(state => state.user);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(postsQuery);
      const postsData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const post = { id: doc.id, ...doc.data() };
          // Fetch user data for each post
          const userDoc = await getDoc(doc(db, 'users', post.userId));
          return {
            ...post,
            user: userDoc.data()
          };
        })
      );
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      await addDoc(collection(db, 'posts'), {
        content: newPost,
        userId: currentUser.uid,
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });
      setNewPost('');
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleLike = async (postId, likes) => {
    const postRef = doc(db, 'posts', postId);
    try {
      if (likes.includes(currentUser.uid)) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid)
        });
      }
      fetchPosts();
    } catch (error) {
      console.error('Error updating likes:', error);
    }
  };

  const handleComment = async (postId, comment) => {
    if (!comment.trim()) return;
    
    const postRef = doc(db, 'posts', postId);
    try {
      await updateDoc(postRef, {
        comments: arrayUnion({
          userId: currentUser.uid,
          content: comment,
          createdAt: new Date().toISOString()
        })
      });
      fetchPosts();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmitPost} className="mb-8">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          className="w-full p-4 border rounded"
          placeholder="Share your thoughts..."
          rows="3"
        />
        <button 
          type="submit"
          className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Post
        </button>
      </form>

      <div className="space-y-6">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-2">
              <Link to={`/profile/${post.userId}`}>
                <img
                  src={post.user.photoURL || '/default-avatar.png'}
                  alt={post.user.displayName}
                  className="w-10 h-10 rounded-full mr-2"
                />
              </Link>
              <div>
                <Link to={`/profile/${post.userId}`} className="font-bold">
                  {post.user.displayName}
                </Link>
                <p className="text-sm text-gray-500">
                  {new Date(post.createdAt?.toDate()).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <p className="mb-4">{post.content}</p>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleLike(post.id, post.likes)}
                className={`flex items-center space-x-1 ${
                  post.likes.includes(currentUser.uid) ? 'text-indigo-600' : ''
                }`}
              >
                <span>❤️</span>
                <span>{post.likes.length}</span>
              </button>
              
              <button
                onClick={() => {
                  const comment = prompt('Add a comment:');
                  if (comment) handleComment(post.id, comment);
                }}
              >
                💬 {post.comments.length}
              </button>
            </div>

            {post.comments.length > 0 && (
              <div className="mt-4 space-y-2">
                {post.comments.map((comment, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded">
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Forum; 