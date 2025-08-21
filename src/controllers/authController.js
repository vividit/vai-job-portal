import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
  console.log('Generating token with secret:', jwtSecret ? 'Secret exists' : 'No secret');
  
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: "7d" }
  );
};

// Local Email/Password Login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, hasPassword: !!password });
  
  try {
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    console.log('User found:', !!user, user ? { id: user._id, email: user.email, hasPassword: !!user.password } : 'No user');
    
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.password) {
      console.log('User has no password (OAuth user)');
      return res.status(401).json({ error: "This account uses social login. Please use Google or GitHub to sign in." });
    }

    const passwordMatch = await user.matchPassword(password);
    console.log('Password match:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('Password does not match');
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);
    console.log('Login successful for user:', user.email);
    
    res.json({ 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }, 
      token 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Server error" });
  }
};

// Local Register (optional — since OAuth is primary)
export const registerUser = async (req, res) => {
  const { name, fullName, email, password, role } = req.body;
  const userName = name || fullName;
  
      console.log('Registration attempt:', { name: userName, email, role, hasPassword: !!password });
  
  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: "User already exists" });
    }

    // Create user with name (use email prefix if no name provided)
    const userData = { 
      name: userName || email.split('@')[0], 
      email, 
      password, 
      role: role || "jobseeker" 
    };
    
    console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' });
    
    const user = await User.create(userData);
    const token = generateToken(user);
    
    console.log('User created successfully:', { id: user._id, email: user.email, role: user.role });
    
    res.status(201).json({ 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }, 
      token 
    });
  } catch (err) {
    console.error('Registration error details:', err.message, err.stack);
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// OAuth Callback handler (if needed for frontend use)
export const oauthSuccess = (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`${process.env.CLIENT_URL}/dashboard?token=${token}`);
};
