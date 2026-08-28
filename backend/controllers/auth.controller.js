const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const Donor = require('../models/Donor.model');
const NGO = require('../models/NGO.model');
const Volunteer = require('../models/Volunteer.model');
const generateToken = require('../utils/generateToken');

// ─────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const allowedRoles = ['donor', 'ngo', 'volunteer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role
    });

    // Create role-specific profile
    if (role === 'donor') {
      await Donor.create({
        user: user._id,
        donorType: 'individual',
        address: ''
      });
    } else if (role === 'ngo') {
      await NGO.create({
        user: user._id,
        organizationName: name,
        address: '',
        capacity: 100
      });
    } else if (role === 'volunteer') {
      await Volunteer.create({
        user: user._id
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted
      }
    });

  } catch (error) {
    console.error('Register error FULL:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account has been deactivated' });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted
      }
    });

  } catch (error) {
    console.error('Login error FULL:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// ─────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// CREATE ADMIN
// ─────────────────────────────────────────
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    // Check all fields
    if (!name || !email || !password || !secretKey) {
      return res.status(400).json({ 
        message: 'Please provide name, email, password, and secretKey' 
      });
    }

    if (secretKey !== 'FOOD_ADMIN_2025') {
      return res.status(403).json({ message: 'Invalid secret key' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      profileCompleted: true
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'Admin created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Create admin error FULL:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe, createAdmin };