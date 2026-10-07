const axios = require('axios');
const User = require('../models/User.model');
const Donation = require('../models/Donation.model');
const Delivery = require('../models/Delivery.model');
const Donor = require('../models/Donor.model');
const NGO = require('../models/NGO.model');
const Volunteer = require('../models/Volunteer.model');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ─────────────────────────────────────────
// 1. OVERALL STATS
// ─────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalNGOs,
      totalVolunteers,
      totalDonations,
      completedDonations,
      activeDonations,
      cancelledDonations,
      expiredDonations,
      activeDeliveries,
      mealsRescuedResult
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'ngo' }),
      User.countDocuments({ role: 'volunteer' }),
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'COMPLETED' }),
      Donation.countDocuments({
        status: {
          $in: [
            'POSTED',
            'MATCHING',
            'WAITING_FOR_NGO',
            'NGO_ACCEPTED',
            'NGO_COLLECTING',
            'VOLUNTEER_REQUESTED',
            'VOLUNTEER_ASSIGNED',
            'FOOD_COLLECTED',
            'OUT_FOR_DELIVERY',
            'DELIVERED'
          ]
        }
      }),
      Donation.countDocuments({ status: 'CANCELLED' }),
      Donation.countDocuments({ status: 'EXPIRED' }),
      Delivery.countDocuments({ status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'] } }),
      Donation.aggregate([
        { $match: { status: { $nin: ['CANCELLED', 'EXPIRED', 'UNMATCHED'] } } },
        { $group: { _id: null, totalMeals: { $sum: '$quantity' } } }
      ])
    ]);

    const totalMealsRescued = mealsRescuedResult.length > 0 ? mealsRescuedResult[0].totalMeals : 0;

    res.json({
      stats: {
        users: {
          total: totalUsers,
          donors: totalDonors,
          ngos: totalNGOs,
          volunteers: totalVolunteers
        },
        donations: {
          total: totalDonations,
          completed: completedDonations,
          active: activeDonations,
          cancelled: cancelledDonations,
          expired: expiredDonations
        },
        totalMealsRescued,
        activeDeliveries
      }
    });
  } catch (error) {
    console.error('Admin getStats error:', error.message);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
};

// ─────────────────────────────────────────
// 2. ANALYTICS & CHARTS DATA
// ─────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    // Food type distribution
    const foodTypeStats = await Donation.aggregate([
      {
        $group: {
          _id: '$foodType',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Status distribution
    const statusStats = await Donation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Daily donations trend (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const dailyTrend = await Donation.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          donationsCount: { $sum: 1 },
          mealsQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      analytics: {
        foodTypeStats: foodTypeStats.map(item => ({
          name: item._id ? item._id.replace(/_/g, ' ') : 'Other',
          rawType: item._id,
          count: item.count,
          totalQuantity: item.totalQuantity
        })),
        statusStats: statusStats.map(item => ({
          status: item._id ? item._id.replace(/_/g, ' ') : 'Unknown',
          rawStatus: item._id,
          count: item.count
        })),
        dailyTrend: dailyTrend.map(item => ({
          date: item._id,
          donations: item.donationsCount,
          meals: item.mealsQuantity
        }))
      }
    });
  } catch (error) {
    console.error('Admin getAnalytics error:', error.message);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
};

// ─────────────────────────────────────────
// 3. USER MANAGEMENT
// ─────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const query = {};

    if (role && ['donor', 'ngo', 'volunteer', 'admin'].includes(role)) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Admin getUsers error:', error.message);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Admin toggleUserStatus error:', error.message);
    res.status(500).json({ message: 'Server error updating user status' });
  }
};

// ─────────────────────────────────────────
// 4. DONATIONS MONITORING
// ─────────────────────────────────────────
const getDonations = async (req, res) => {
  try {
    const { status, foodType, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (foodType) query.foodType = foodType;
    if (search) query.foodName = { $regex: search, $options: 'i' };

    const donations = await Donation.find(query)
      .populate('donor', 'name email phone')
      .populate('matchedNGO', 'name email phone')
      .populate('assignedVolunteer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ donations });
  } catch (error) {
    console.error('Admin getDonations error:', error.message);
    res.status(500).json({ message: 'Server error fetching donations' });
  }
};

// ─────────────────────────────────────────
// 5. DELIVERIES MONITORING
// ─────────────────────────────────────────
const getDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('donation', 'foodName foodType quantity quantityUnit')
      .populate('volunteer', 'name email phone')
      .populate('ngo', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ deliveries });
  } catch (error) {
    console.error('Admin getDeliveries error:', error.message);
    res.status(500).json({ message: 'Server error fetching deliveries' });
  }
};

// ─────────────────────────────────────────
// 6. MAP / GEOGRAPHIC DISTRIBUTION
// ─────────────────────────────────────────
const getMapData = async (req, res) => {
  try {
    const [donations, ngos, volunteers] = await Promise.all([
      Donation.find({ 'pickupLocation.coordinates.0': { $ne: 0 } })
        .populate('donor', 'name')
        .select('foodName foodType quantity quantityUnit status pickupAddress pickupLocation deliveryAddress deliveryLocation createdAt')
        .limit(100),
      NGO.find({ 'location.coordinates.0': { $ne: 0 } })
        .populate('user', 'name phone')
        .select('organizationName address capacity location isAvailable'),
      Volunteer.find({ 'location.coordinates.0': { $ne: 0 } })
        .populate('user', 'name phone')
        .select('vehicleType isAvailable location address')
    ]);

    const donationPoints = donations.map(d => ({
      id: d._id,
      type: 'donation_pickup',
      title: d.foodName,
      subtitle: `${d.quantity} ${d.quantityUnit} • ${d.foodType}`,
      status: d.status,
      address: d.pickupAddress,
      lat: (d.pickupLocation && d.pickupLocation.coordinates && d.pickupLocation.coordinates[1]) || 0,
      lng: (d.pickupLocation && d.pickupLocation.coordinates && d.pickupLocation.coordinates[0]) || 0
    }));

    const ngoPoints = ngos.map(n => ({
      id: n._id,
      type: 'ngo_location',
      title: n.organizationName || 'NGO',
      subtitle: `Capacity: ${n.capacity} meals • ${n.isAvailable ? 'Available' : 'Unavailable'}`,
      address: n.address,
      lat: (n.location && n.location.coordinates && n.location.coordinates[1]) || 0,
      lng: (n.location && n.location.coordinates && n.location.coordinates[0]) || 0
    }));

    const volunteerPoints = volunteers.map(v => ({
      id: v._id,
      type: 'volunteer_location',
      title: v.user?.name || 'Volunteer',
      subtitle: `Vehicle: ${v.vehicleType || 'other'} • ${v.isAvailable ? 'Available' : 'Busy'}`,
      address: v.address,
      lat: (v.location && v.location.coordinates && v.location.coordinates[1]) || 0,
      lng: (v.location && v.location.coordinates && v.location.coordinates[0]) || 0
    }));

    res.json({
      points: [...donationPoints, ...ngoPoints, ...volunteerPoints],
      totalPoints: donationPoints.length + ngoPoints.length + volunteerPoints.length
    });
  } catch (error) {
    console.error('Admin getMapData error:', error.message);
    res.status(500).json({ message: 'Server error fetching map data' });
  }
};

// ─────────────────────────────────────────
// 7. LINEAR REGRESSION DEMAND PREDICTION
// ─────────────────────────────────────────
const getDemandPrediction = async (req, res) => {
  try {
    const recentDonations = await Donation.find()
      .select('quantity foodType createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    const response = await axios.post(`${AI_SERVICE_URL}/predict-demand`, {
      donations: recentDonations
    });

    res.json(response.data);
  } catch (error) {
    console.error('Admin getDemandPrediction error:', error.message);
    res.status(500).json({ message: 'Error communicating with AI prediction service' });
  }
};

module.exports = {
  getStats,
  getAnalytics,
  getUsers,
  toggleUserStatus,
  getDonations,
  getDeliveries,
  getMapData,
  getDemandPrediction
};
