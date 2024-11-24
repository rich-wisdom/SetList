import { Link } from 'react-router-dom';
import Username from './Username';

// In your component:
return (
  <div className="d-flex align-items-center gap-2">
    <Link to={`/profile/${otherUser.uid}`}>
      <img
        src={otherUser.profileImage || '/default-avatar.png'}
        alt="Profile"
        className="rounded-circle profile-image-link"
        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
      />
    </Link>
    <div>
      <Username uid={otherUser.uid} username={otherUser.username} />
    </div>
  </div>
); 