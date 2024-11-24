import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Card, Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { db } from '../firebase/config';
import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  addDoc 
} from 'firebase/firestore';

const UserProfile = () => {
  const { userId } = useParams();
  const currentUser = useSelector(state => state.user.currentUser);
  const [profile, setProfile] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('Fetching profile for userId:', userId);
        
        if (!userId) {
          setError('No user ID provided');
          setLoading(false);
          return;
        }

        // Get user profile
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          console.log('Profile data:', userDocSnap.data());
          setProfile(userDocSnap.data());
          
          // Check friendship status if viewing another user's profile
          if (currentUser && currentUser.uid !== userId) {
            const friendshipsRef = collection(db, 'friendships');
            
            // Check outgoing requests
            const outgoingQuery = query(
              friendshipsRef,
              where('senderId', '==', currentUser.uid),
              where('receiverId', '==', userId)
            );
            const outgoingSnapshot = await getDocs(outgoingQuery);

            // Check incoming requests
            const incomingQuery = query(
              friendshipsRef,
              where('senderId', '==', userId),
              where('receiverId', '==', currentUser.uid)
            );
            const incomingSnapshot = await getDocs(incomingQuery);

            if (!outgoingSnapshot.empty || !incomingSnapshot.empty) {
              const friendship = outgoingSnapshot.docs[0]?.data() || incomingSnapshot.docs[0]?.data();
              setFriendshipStatus(friendship.status);
            }
          }
        } else {
          console.log('No profile found for userId:', userId);
          setError('Profile not found');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, currentUser]);

  const checkFriendshipStatus = async () => {
    if (!currentUser) return;

    try {
      const friendshipsRef = collection(db, 'friendships');
      
      // Check both directions of friendship
      const [sentQuery, receivedQuery] = await Promise.all([
        getDocs(query(
          friendshipsRef,
          where('senderId', '==', currentUser.uid),
          where('receiverId', '==', userId)
        )),
        getDocs(query(
          friendshipsRef,
          where('senderId', '==', userId),
          where('receiverId', '==', currentUser.uid)
        ))
      ]);

      const friendship = sentQuery.docs[0] || receivedQuery.docs[0];

      if (friendship) {
        const status = friendship.data().status;
        setFriendshipStatus(status);
        console.log('Friendship status:', status); // Debug log
      } else {
        setFriendshipStatus('none');
      }
    } catch (error) {
      console.error('Error checking friendship status:', error);
      setFriendshipStatus('none');
    }
  };

  useEffect(() => {
    if (currentUser && userId) {
      checkFriendshipStatus();
    }
  }, [currentUser, userId]);

  const handleFriendRequest = async () => {
    try {
      const friendshipsRef = collection(db, 'friendships');
      await addDoc(friendshipsRef, {
        senderId: currentUser.uid,
        receiverId: userId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'friendRequest',
        fromUser: currentUser.uid,
        read: false,
        createdAt: new Date().toISOString()
      });

      setFriendshipStatus('pending');
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleMessage = async () => {
    try {
      // Check if a chat thread already exists
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      let existingChat = null;

      // Find chat with these two participants
      querySnapshot.docs.forEach(doc => {
        const chatData = doc.data();
        if (chatData.participants.includes(userId)) {
          existingChat = { id: doc.id, ...chatData };
        }
      });

      if (existingChat) {
        // Navigate to existing chat
        navigate(`/messages/${existingChat.id}`);
      } else {
        // Create new chat thread
        const newChatRef = await addDoc(chatsRef, {
          participants: [currentUser.uid, userId],
          createdAt: new Date().toISOString(),
          lastMessage: null,
          lastMessageTime: null
        });

        // Navigate to new chat
        navigate(`/messages/${newChatRef.id}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  const handleUnfriend = async () => {
    try {
      const friendshipsRef = collection(db, 'friendships');
      
      // Check both directions of friendship
      const [sentQuery, receivedQuery] = await Promise.all([
        getDocs(query(
          friendshipsRef,
          where('senderId', '==', currentUser.uid),
          where('receiverId', '==', userId)
        )),
        getDocs(query(
          friendshipsRef,
          where('senderId', '==', userId),
          where('receiverId', '==', currentUser.uid)
        ))
      ]);

      const friendship = sentQuery.docs[0] || receivedQuery.docs[0];

      if (friendship) {
        await deleteDoc(doc(db, 'friendships', friendship.id));
        
        // Create notification for the other user
        await addDoc(collection(db, 'notifications'), {
          userId: userId,
          type: 'unfriended',
          fromUser: currentUser.uid,
          read: false,
          createdAt: new Date().toISOString()
        });

        setFriendshipStatus('none');
      }
    } catch (error) {
      console.error('Error unfriending:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl mb-4 text-red-600">{error}</div>
        <button 
          onClick={() => navigate('/')}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl mb-4">Profile not found</div>
        <button 
          onClick={() => navigate('/')}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow">
            <Card.Body>
              <div className="d-flex align-items-center gap-4 mb-4">
                <img
                  src={profile.profileImage || '/default-avatar.png'}
                  alt={profile.username}
                  className="rounded-circle"
                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                />
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h1 className="h3 mb-0">{profile.stageName}</h1>
                    <img
                      src={`/icons/${profile.accountType}.png`}
                      alt={profile.accountType}
                      width="24"
                      height="24"
                    />
                  </div>
                  <p className="text-muted mb-0">@{profile.username}</p>
                </div>
              </div>

              <div className="mb-4">
                <h2 className="h5">Bio</h2>
                <p>{profile.bio || 'No bio provided'}</p>
              </div>

              <div className="mb-4">
                <h2 className="h5">Genres</h2>
                <div className="d-flex flex-wrap gap-2">
                  {profile.genres?.map(genre => (
                    <Badge 
                      key={genre} 
                      bg="secondary"
                      className="px-3 py-2"
                    >
                      {genre}
                    </Badge>
                  )) || 'No genres specified'}
                </div>
              </div>

              {profile.accountType === 'musician' ? (
                <div className="mb-4">
                  <h2 className="h5">Instruments</h2>
                  <div className="d-flex flex-wrap gap-2">
                    {profile.instruments?.map(instrument => (
                      <Badge 
                        key={instrument} 
                        bg="info"
                        className="px-3 py-2"
                      >
                        {instrument}
                      </Badge>
                    )) || 'No instruments specified'}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <h2 className="h5">Venue Capacity</h2>
                  <p className="text-gray-700">
                    {profile.venueCapacity ? `${profile.venueCapacity} people` : 'Capacity not specified'}
                  </p>
                </div>
              )}

              {currentUser && currentUser.uid !== userId && (
                <div className="mt-4 d-flex gap-2">
                  {friendshipStatus === 'none' && (
                    <Button 
                      variant="primary" 
                      onClick={handleFriendRequest}
                    >
                      Send Friend Request
                    </Button>
                  )}
                  
                  {friendshipStatus === 'pending' && (
                    <Badge bg="warning" className="px-3 py-2">
                      Friend Request Pending
                    </Badge>
                  )}
                  
                  {friendshipStatus === 'friends' && (
                    <>
                      <Button 
                        variant="primary" 
                        onClick={handleMessage}
                      >
                        Message
                      </Button>
                      <Button 
                        variant="danger" 
                        onClick={handleUnfriend}
                      >
                        Unfriend
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UserProfile; 