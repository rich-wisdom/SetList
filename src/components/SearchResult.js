import Username from './Username';

// In your search results:
return (
  <div className="search-result d-flex align-items-center gap-2">
    <Link to={`/profile/${user.uid}`}>
      <img
        src={user.profileImage || '/default-avatar.png'}
        alt="Profile"
        className="rounded-circle profile-image-link"
        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
      />
    </Link>
    <div>
      <div className="fw-bold">{user.stageName}</div>
      <Username uid={user.uid} username={user.username} />
    </div>
  </div>
); 