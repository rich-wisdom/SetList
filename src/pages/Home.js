import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
const Home = () => {
  const { currentUser } = useSelector((state) => state.user);

  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-8">Welcome to SetList</h1>
      {!currentUser ? (
        <div className="space-y-4">
          <p className="text-xl">Connect with other musicians, share your music, and build your network!</p>
          <div className="space-x-4">
            <Link to="/login" className="bg-indigo-600 text-white px-6 py-2 rounded-md">
              Login
            </Link>
            <Link to="/register" className="bg-gray-600 text-white px-6 py-2 rounded-md">
              Register
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xl">Welcome back, {currentUser.displayName}!</p>
          <Link to="/forum" className="bg-indigo-600 text-white px-6 py-2 rounded-md">
            Go to Forum
          </Link>
        </div>
      )}
    </div>
  );
};

export default Home; 