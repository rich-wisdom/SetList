import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { clearUser } from '../store/slices/userSlice';

const Navbar = () => {
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      dispatch(clearUser());
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold">
            SetList
          </Link>
          <div className="space-x-4">
            {currentUser ? (
              <>
                <Link to="/profile">Profile</Link>
                <Link to="/forum">Forum</Link>
                <Link to="/messages">Messages</Link>
                <button onClick={handleSignOut}>Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 