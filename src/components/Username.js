import { Link } from 'react-router-dom';

const Username = ({ uid, username }) => {
  return (
    <Link 
      to={`/profile/${uid}`} 
      className="text-decoration-none username-link"
    >
      @{username}
    </Link>
  );
};

export default Username; 