import Username from './Username';

// In your notification component:
return (
  <div className="notification-item d-flex align-items-center gap-2">
    <Link to={`/profile/${sender.uid}`}>
      <img
        src={sender.profileImage || '/default-avatar.png'}
        alt="Profile"
        className="rounded-circle profile-image-link"
        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
      />
    </Link>
    <div>
      <Username uid={sender.uid} username={sender.username} />
      <span className="ms-2">{notification.message}</span>
    </div>
  </div>
); 