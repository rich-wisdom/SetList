import { useState, useEffect } from 'react';
import { Navbar as BsNavbar, Nav, Container, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { clearUser } from '../store/slices/userSlice';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const Navbar = () => {
  const currentUser = useSelector(state => state.user.currentUser);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(clearUser());
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (!currentUser) return;
      
      try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
          notificationsRef,
          where('userId', '==', currentUser.uid),
          where('read', '==', false)
        );
        const snapshot = await getDocs(q);
        setUnreadNotifications(snapshot.size);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchUnreadNotifications();
  }, [currentUser]);

  return (
    <BsNavbar expand="lg" className="custom-navbar">
      <Container>
        <BsNavbar.Brand as={Link} to="/" className="fw-bold">
          MusicApp
        </BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BsNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {currentUser ? (
              <>
                <Nav.Link as={Link} to="/search" className="mx-2">
                  Search
                </Nav.Link>
                <Nav.Link as={Link} to="/messages" className="mx-2">
                  Messages
                </Nav.Link>
                <Nav.Link as={Link} to="/notifications" className="mx-2 position-relative">
                  Notifications
                  {unreadNotifications > 0 && (
                    <Badge 
                      bg="danger" 
                      pill 
                      className="badge-notification"
                    >
                      {unreadNotifications}
                    </Badge>
                  )}
                </Nav.Link>
                <Nav.Link as={Link} to="/profile" className="mx-2">
                  Profile
                </Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="mx-2">
                  Login
                </Nav.Link>
                <Nav.Link as={Link} to="/register" className="mx-2">
                  Register
                </Nav.Link>
              </>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
};

export default Navbar; 