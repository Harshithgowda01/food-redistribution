const Donor = require('../models/Donor.model');
const User = require('../models/User.model');
const Donation = require('../models/Donation.model');
const Delivery = require('../models/Delivery.model');
const { createNotification } = require('../utils/notificationHelper');

const getProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user._id }).populate('user', 'name email phone');
    res.json({ donor });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { organizationName, donorType, address, latitude, longitude, phone } = req.body;

    const donor = await Donor.findOne({ user: req.user._id });
    if (!donor) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }

    donor.organizationName = organizationName || donor.organizationName;
    donor.donorType = donorType || donor.donorType;
    donor.address = address || donor.address;

    if (latitude && longitude) {
      donor.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    await donor.save();

    await User.findByIdAndUpdate(req.user._id, {
      profileCompleted: true,
      ...(phone && { phone })
    });

    res.json({ message: 'Profile updated successfully', donor });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// DONOR CONFIRMS FOOD PICKUP / HANDOVER
// ─────────────────────────────────────────
const confirmPickup = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });

    if (donation.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized for this donation' });
    }

    donation.donorConfirmedCollection = true;
    if (!donation.collectedAt) {
      donation.collectedAt = new Date();
    }

    if (donation.collectionMethod === 'self_collect') {
      donation.status = 'FOOD_COLLECTED';
    }

    await donation.save();

    // Update Delivery record if volunteer delivery
    if (donation.collectionMethod === 'volunteer') {
      const delivery = await Delivery.findOne({ donation: donation._id });
      if (delivery) {
        delivery.donorConfirmedPickup = true;
        await delivery.save();
      }
    }

    // Notify NGO
    if (donation.matchedNGO) {
      await createNotification(
        donation.matchedNGO,
        'FOOD_COLLECTED',
        'Donor Confirmed Food Handover',
        `The donor has confirmed that "${donation.foodName}" has been handed over.`,
        donation._id
      );
    }

    res.json({ message: 'Food handover confirmed successfully', donation });
  } catch (error) {
    console.error('Donor confirm pickup error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getProfile, updateProfile, confirmPickup };