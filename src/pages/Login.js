import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/slices/userSlice';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        dispatch(setUser({ ...userDoc.data(), uid: userCredential.user.uid }));
        navigate('/profile');
      } else {
        setError('User profile not found. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Login error:', error);
      switch (error.code) {
        case 'auth/invalid-credential':
          setError('Invalid email or password. Please try again.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email. Please register first.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        default:
          setError('Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      let result;
      try {
        // Try popup first
        result = await signInWithPopup(auth, provider);
      } catch (popupError) {
        console.log('Popup blocked, trying redirect...', popupError);
        // If popup fails (blocked), fall back to redirect
        await signInWithRedirect(auth, provider);
        return; // The page will redirect and handle auth in useEffect
      }

      // Handle successful sign-in
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        // Create new user profile
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          username: result.user.email.split('@')[0],
          stageName: '',
          accountType: 'musician',
          createdAt: new Date().toISOString(),
          bio: '',
          genres: [],
          instruments: [],
          profileImage: result.user.photoURL || ''
        });
      }
      
      const userData = userDoc.exists() ? userDoc.data() : await getDoc(doc(db, 'users', result.user.uid));
      dispatch(setUser({ ...userData, uid: result.user.uid }));
      navigate('/profile');
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add this useEffect to handle redirect result
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const userDoc = await getDoc(doc(db, 'users', result.user.uid));
          
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', result.user.uid), {
              uid: result.user.uid,
              email: result.user.email,
              username: result.user.email.split('@')[0],
              stageName: '',
              accountType: 'musician',
              createdAt: new Date().toISOString(),
              bio: '',
              genres: [],
              instruments: [],
              profileImage: result.user.photoURL || ''
            });
          }
          
          const userData = userDoc.exists() ? userDoc.data() : await getDoc(doc(db, 'users', result.user.uid));
          dispatch(setUser({ ...userData, uid: result.user.uid }));
          navigate('/profile');
        }
      } catch (error) {
        console.error('Redirect result error:', error);
        setError('Failed to complete sign in. Please try again.');
      }
    };

    handleRedirectResult();
  }, [dispatch, navigate]);

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card className="auth-card shadow">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Login to OpenMic 🎤</h2>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleEmailLogin}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                  />
                </Form.Group>

                <Button 
                  type="submit" 
                  className="w-100 mb-3"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </Form>

              <div className="text-center my-3">
                <div className="divider d-flex align-items-center justify-content-center">
                  <span className="px-2 text-muted">OR</span>
                </div>
              </div>

              <Button 
                onClick={handleGoogleLogin}
                variant="outline-light"
                className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
              >
                <img 
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  style={{ width: '20px', height: '20px' }}
                />
                Sign in with Google
              </Button>

              <div className="text-center">
                <Link to="/register" className="text-decoration-none">
                  Need an account? Register
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login; 