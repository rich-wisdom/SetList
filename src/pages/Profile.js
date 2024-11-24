import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { db, storage } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, Row, Col, Form, Button, Badge, Modal, ListGroup } from 'react-bootstrap';
import { Container } from 'react-bootstrap';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useDispatch } from 'react-redux';
import { clearUser } from '../store/slices/userSlice';

const Profile = () => {
  const currentUser = useSelector(state => state.user.currentUser);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newProfileImage, setNewProfileImage] = useState(null);
  const navigate = useNavigate();
  const [friendsCount, setFriendsCount] = useState(0);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [friends, setFriends] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  useEffect(() => {
    const fetchFriendsCount = async () => {
      if (!profile?.uid) return;
      
      try {
        const friendshipsRef = collection(db, 'friendships');
        const [sentQuery, receivedQuery] = await Promise.all([
          getDocs(query(
            friendshipsRef,
            where('senderId', '==', profile.uid),
            where('status', '==', 'friends')
          )),
          getDocs(query(
            friendshipsRef,
            where('receiverId', '==', profile.uid),
            where('status', '==', 'friends')
          ))
        ]);

        const uniqueFriends = new Set();
        sentQuery.docs.forEach(doc => uniqueFriends.add(doc.data().receiverId));
        receivedQuery.docs.forEach(doc => uniqueFriends.add(doc.data().senderId));
        
        setFriendsCount(uniqueFriends.size);
      } catch (error) {
        console.error('Error fetching friends count:', error);
      }
    };

    fetchFriendsCount();
  }, [profile?.uid]);

  const fetchProfile = async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        setProfile(userDocSnap.data());
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditForm({
      stageName: profile?.stageName || '',
      bio: profile?.bio || '',
      genres: profile?.genres?.join(', ') || '',
      profileImage: profile?.profileImage || '',
      ...(profile?.accountType === 'musician' 
        ? { instruments: profile?.instruments?.join(', ') || '' }
        : { venueCapacity: profile?.venueCapacity?.toString() || '' }
      )
    });
    setIsEditing(true);
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setNewProfileImage(e.target.files[0]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let profileImageUrl = profile.profileImage;

      if (newProfileImage) {
        const imageRef = ref(storage, `profiles/${currentUser.uid}`);
        await uploadBytes(imageRef, newProfileImage);
        profileImageUrl = await getDownloadURL(imageRef);
      }

      const updatedData = {
        ...profile,
        stageName: editForm.stageName,
        bio: editForm.bio,
        genres: editForm.genres.split(',').map(g => g.trim()).filter(g => g),
        profileImage: profileImageUrl,
        ...(profile.accountType === 'musician'
          ? { instruments: editForm.instruments.split(',').map(i => i.trim()).filter(i => i) }
          : { venueCapacity: parseInt(editForm.venueCapacity) || 0 }
        )
      };

      await updateDoc(doc(db, 'users', currentUser.uid), updatedData);
      setProfile(updatedData);
      setIsEditing(false);
      setNewProfileImage(null);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const fetchFriendsList = async () => {
    if (!profile?.uid) return;
    
    try {
      const friendshipsRef = collection(db, 'friendships');
      const [sentQuery, receivedQuery] = await Promise.all([
        getDocs(query(
          friendshipsRef,
          where('senderId', '==', profile.uid),
          where('status', '==', 'friends')
        )),
        getDocs(query(
          friendshipsRef,
          where('receiverId', '==', profile.uid),
          where('status', '==', 'friends')
        ))
      ]);

      const friendIds = new Set();
      sentQuery.docs.forEach(doc => friendIds.add(doc.data().receiverId));
      receivedQuery.docs.forEach(doc => friendIds.add(doc.data().senderId));

      const friendsData = await Promise.all(
        Array.from(friendIds).map(async (friendId) => {
          const userDoc = await getDoc(doc(db, 'users', friendId));
          return { id: userDoc.id, ...userDoc.data() };
        })
      );

      setFriends(friendsData);
    } catch (error) {
      console.error('Error fetching friends list:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(clearUser());
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl mb-4">Profile not found</div>
        <button 
          onClick={() => navigate('/complete-profile')}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Complete Your Profile
        </button>
      </div>
    );
  }

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card>
            <Card.Body>
              {!isEditing ? (
                <>
                  <div className="d-flex align-items-center gap-4 mb-4">
                    <Link to={`/profile/${profile?.uid}`} className="profile-image-link">
                      <img
                        src={profile?.profileImage || '/default-avatar.png'}
                        alt={profile?.username}
                        className="rounded-circle"
                        style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                      />
                    </Link>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h1 className="h3 mb-0">{profile?.stageName}</h1>
                        <img
                          src={`/icons/${profile?.accountType}.png`}
                          alt={profile?.accountType}
                          width="24"
                          height="24"
                        />
                      </div>
                      <Link to={`/profile/${profile?.uid}`} className="username-link">
                        @{profile?.username}
                      </Link>
                      <div 
                        className="mt-2 username-link" 
                        onClick={() => {
                          setShowFriendsList(!showFriendsList);
                          if (!showFriendsList) fetchFriendsList();
                        }}
                      >
                        {friendsCount} Friends
                      </div>
                    </div>
                  </div>

                  {/* Friends List Modal */}
                  <Modal show={showFriendsList} onHide={() => setShowFriendsList(false)}>
                    <Modal.Header closeButton>
                      <Modal.Title>Friends List</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <ListGroup>
                        {friends.map(friend => (
                          <ListGroup.Item key={friend.id}>
                            <Link 
                              to={`/profile/${friend.id}`} 
                              className="d-flex align-items-center gap-3 text-decoration-none"
                            >
                              <img
                                src={friend.profileImage || '/default-avatar.png'}
                                alt={friend.username}
                                className="rounded-circle"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                              />
                              <div>
                                <div>{friend.stageName}</div>
                                <div className="username-link">@{friend.username}</div>
                              </div>
                            </Link>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </Modal.Body>
                  </Modal>

                  <div className="mb-4">
                    <h2 className="h5">Bio</h2>
                    <p>{profile?.bio || 'No bio provided'}</p>
                  </div>

                  <div className="mb-4">
                    <h2 className="h5">Genres</h2>
                    <div className="d-flex flex-wrap gap-2">
                      {profile.genres?.map(genre => (
                        <Badge 
                          key={genre} 
                          className="genre-badge rounded-pill"
                          style={{ textDecoration: 'none' }}
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {profile.accountType === 'musician' ? (
                  <div className="mb-4">
                    <h2 className="h5">Instruments</h2>
                    <div className="d-flex flex-wrap gap-2">
                      {profile.instruments?.map(instrument => (
                        <Badge 
                          key={instrument} 
                          className="instrument-badge rounded-pill"
                          style={{ textDecoration: 'none' }}
                        >
                          {instrument}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  ) : (
                    <div className="mb-4">
                      <h2 className="h5">Venue Capacity</h2>
                      <p>{profile.venueCapacity ? `${profile.venueCapacity} people` : 'Capacity not specified'}</p>
                    </div>
                  )}

                  {/* Edit button */}
                  {currentUser?.uid === profile?.uid && (
                    <Button
                      variant="warning"
                      onClick={handleEdit}
                      className="mt-3 fw-bold text-dark"
                    >
                      Edit Profile
                    </Button>
                  )}

                  {/* Add logout button at the bottom of the profile */}
                  <div className="mt-4 border-top pt-4">
                    <Button 
                      variant="danger" 
                      onClick={() => setShowLogoutModal(true)}
                      className="w-100"
                    >
                      Logout
                    </Button>
                  </div>

                  {/* Logout Confirmation Modal */}
                  <Modal 
                    show={showLogoutModal} 
                    onHide={() => setShowLogoutModal(false)}
                    centered
                  >
                    <Modal.Header closeButton>
                      <Modal.Title>Confirm Logout</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      Are you sure you want to logout?
                    </Modal.Body>
                    <Modal.Footer>
                      <Button 
                        variant="secondary" 
                        onClick={() => setShowLogoutModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="danger" 
                        onClick={handleLogout}
                      >
                        Logout
                      </Button>
                    </Modal.Footer>
                  </Modal>
                </>
              ) : (
                <Form onSubmit={handleSave}>
                  <Row>
                    {/* Stage/Venue Name */}
                    <Col md={12} className="mb-3">
                      <Form.Group>
                        <Form.Label>
                          {profile.accountType === 'musician' ? 'Stage Name' : 'Venue Name'}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={editForm.stageName}
                          onChange={(e) => setEditForm({...editForm, stageName: e.target.value})}
                          placeholder="Enter name"
                        />
                      </Form.Group>
                    </Col>

                    {/* Bio */}
                    <Col md={12} className="mb-3">
                      <Form.Group>
                        <Form.Label>Bio</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={editForm.bio}
                          onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                          placeholder="Tell us about yourself"
                        />
                      </Form.Group>
                    </Col>

                    {/* Genres */}
                    <Col md={12} className="mb-3">
                      <Form.Group>
                        <Form.Label>Genres (comma-separated)</Form.Label>
                        <Form.Control
                          type="text"
                          value={editForm.genres}
                          onChange={(e) => setEditForm({...editForm, genres: e.target.value})}
                          placeholder="rock, jazz, pop"
                        />
                      </Form.Group>
                    </Col>

                    {/* Conditional Fields based on account type */}
                    {profile.accountType === 'musician' ? (
                      <Col md={12} className="mb-3">
                        <Form.Group>
                          <Form.Label>Instruments (comma-separated)</Form.Label>
                          <Form.Control
                            type="text"
                            value={editForm.instruments}
                            onChange={(e) => setEditForm({...editForm, instruments: e.target.value})}
                            placeholder="guitar, piano, drums"
                          />
                        </Form.Group>
                      </Col>
                    ) : (
                      <Col md={12} className="mb-3">
                        <Form.Group>
                          <Form.Label>Venue Capacity</Form.Label>
                          <Form.Control
                            type="number"
                            value={editForm.venueCapacity}
                            onChange={(e) => setEditForm({...editForm, venueCapacity: e.target.value})}
                            placeholder="500"
                          />
                        </Form.Group>
                      </Col>
                    )}

                    {/* Profile Image */}
                    <Col md={12} className="mb-3">
                      <Form.Group>
                        <Form.Label>Profile Image</Form.Label>
                        <Form.Control
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </Form.Group>
                    </Col>

                    {/* Action Buttons */}
                    <Col md={12} className="d-flex gap-2">
                      <Button type="submit" variant="success">
                        Save Changes
                      </Button>
                      <Button 
                        type="button" 
                        className="btn-cancel"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </Col>
                  </Row>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile; 