const Donation = require('../models/Donation.model');
const Donor = require('../models/Donor.model');
const Volunteer = require('../models/Volunteer.model');
const Delivery = require('../models/Delivery.model');
const { initiateMatching } = require('../services/matching.service');
const { createNotification } = require('../utils/notificationHelper');

const createDonation = async (req, res) => {
  try {
    const {
      foodType,
      foodName,
      quantity,
      quantityUnit,
      description,
      expiryTime,
      pickupAddress,
      latitude,
      longitude
    } = req.body;

    if (!foodType || !foodName || !quantity || !expiryTime || !pickupAddress || !latitude || !longitude) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const donorProfile = await Donor.findOne({ user: req.user._id });
    if (!donorProfile) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }

    const donation = await Donation.create({
      donor: req.user._id,
      donorProfile: donorProfile._id,
      foodType,
      foodName,
      quantity,
      quantityUnit: quantityUnit || 'meals',
      description,
      expiryTime,
      pickupAddress,
      pickupLocation: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      status: 'POSTED'
    });

    donorProfile.totalDonations += 1;
    await donorProfile.save();

    // Trigger AI matching immediately
    await initiateMatching(donation._id);

    const updatedDonation = await Donation.findById(donation._id);

    res.status(201).json({
      message: 'Donation posted successfully',
      donation: updatedDonation
    });

  } catch (error) {
    console.error('Create donation error:', error.message);
    res.status(500).json({ message: 'Server error while posting donation' });
  }
};

const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id }).sort({ createdAt: -1 });
    res.json({ donations });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('matchedNGO', 'name email phone')
      .populate('assignedVolunteer', 'name email phone');

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    res.json({ donation });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// CANCEL DONATION (Donor, NGO, or Admin)
// ─────────────────────────────────────────
const cancelDonation = async (req, res) => {
  try {
    const { reason } = req.body;
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Check authorization: Donor, matched NGO, or Admin can cancel
    const isDonor = donation.donor.toString() === req.user._id.toString();
    const isNGO = donation.matchedNGO && donation.matchedNGO.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isDonor && !isNGO && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to cancel this donation' });
    }

    // Cannot cancel if already collected or completed
    const uncancelableStatuses = ['FOOD_COLLECTED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
    if (uncancelableStatuses.includes(donation.status)) {
      return res.status(400).json({
        message: `Cannot cancel donation because food is already ${donation.status.toLowerCase().replace(/_/g, ' ')}`
      });
    }

    const cancellationReason = reason?.trim() || `Cancelled by ${req.user.role}`;

    donation.status = 'CANCELLED';
    donation.cancelledAt = new Date();
    donation.cancelledBy = req.user.role;
    donation.cancellationReason = cancellationReason;
    await donation.save();

    // If volunteer was assigned, clear volunteer active mission
    if (donation.assignedVolunteer) {
      const volunteerProfile = await Volunteer.findOne({ user: donation.assignedVolunteer });
      if (volunteerProfile) {
        volunteerProfile.activeDelivery = null;
        volunteerProfile.isAvailable = true;
        await volunteerProfile.save();
      }

      await Delivery.deleteMany({ donation: donation._id });

      await createNotification(
        donation.assignedVolunteer,
        'DONATION_CANCELLED',
        'Delivery Mission Cancelled',
        `The donation "${donation.foodName}" was cancelled by the ${req.user.role}. Reason: ${cancellationReason}`,
        donation._id
      );
    }

    // Notify other party
    if (isDonor && donation.matchedNGO) {
      await createNotification(
        donation.matchedNGO,
        'DONATION_CANCELLED',
        'Donation Cancelled by Donor',
        `The donor has cancelled donation "${donation.foodName}". Reason: ${cancellationReason}`,
        donation._id
      );
    } else if (isNGO) {
      await createNotification(
        donation.donor,
        'DONATION_CANCELLED',
        'Donation Cancelled by NGO',
        `The matched NGO has cancelled donation "${donation.foodName}". Reason: ${cancellationReason}`,
        donation._id
      );
    }

    res.json({
      message: 'Donation cancelled successfully',
      donation
    });
  } catch (error) {
    console.error('Cancel donation error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createDonation,
  getMyDonations,
  getDonationById,
  cancelDonation
};