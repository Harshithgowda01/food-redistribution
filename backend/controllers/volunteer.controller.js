const Volunteer = require('../models/Volunteer.model');
const User = require('../models/User.model');
const Donation = require('../models/Donation.model');
const Delivery = require('../models/Delivery.model');
const NGO = require('../models/NGO.model');
const { createNotification } = require('../utils/notificationHelper');
const { haversineDistance, calculateETA } = require('../utils/haversine');

// ─────────────────────────────────────────
// GET VOLUNTEER PROFILE
// ─────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user._id })
      .populate('user', 'name email phone')
      .populate({
        path: 'activeDelivery',
        populate: [
          { path: 'donation', populate: { path: 'donor', select: 'name phone' } },
          { path: 'ngo', select: 'name email phone' }
        ]
      });

    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer profile not found' });
    }

    res.json({ volunteer });
  } catch (error) {
    console.error('Get volunteer profile error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// UPDATE VOLUNTEER PROFILE
// ─────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { address, latitude, longitude, vehicleType, isAvailable, phone } = req.body;

    const volunteer = await Volunteer.findOne({ user: req.user._id });
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer profile not found' });
    }

    if (address !== undefined) volunteer.address = address;
    if (vehicleType !== undefined) volunteer.vehicleType = vehicleType;
    if (isAvailable !== undefined) volunteer.isAvailable = isAvailable;

    if (latitude !== undefined && longitude !== undefined) {
      volunteer.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    await volunteer.save();

    await User.findByIdAndUpdate(req.user._id, {
      profileCompleted: true,
      ...(phone && { phone })
    });

    res.json({ message: 'Profile updated successfully', volunteer });
  } catch (error) {
    console.error('Update volunteer profile error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// GET AVAILABLE DELIVERY REQUESTS
// ─────────────────────────────────────────
const getAvailableRequests = async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user._id });
    const volunteerLat = volunteer?.location?.coordinates?.[1] || 0;
    const volunteerLng = volunteer?.location?.coordinates?.[0] || 0;
    const hasVolunteerLocation = volunteerLat !== 0 || volunteerLng !== 0;

    const donations = await Donation.find({ status: 'VOLUNTEER_REQUESTED' })
      .populate('donor', 'name phone')
      .populate('matchedNGO', 'name phone')
      .populate('matchedNGOProfile', 'organizationName address phone')
      .sort({ createdAt: -1 });

    const requests = donations.map((donation) => {
      const pickupLat = donation.pickupLocation?.coordinates?.[1] || 0;
      const pickupLng = donation.pickupLocation?.coordinates?.[0] || 0;
      const deliveryLat = donation.deliveryLocation?.coordinates?.[1] || 0;
      const deliveryLng = donation.deliveryLocation?.coordinates?.[0] || 0;

      // Distance from volunteer's location to donor pickup location
      const distanceToPickupKm = hasVolunteerLocation
        ? haversineDistance(volunteerLat, volunteerLng, pickupLat, pickupLng)
        : null;

      // Distance from donor pickup location to NGO delivery destination
      const deliveryTripKm = haversineDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
      const estimatedMinutes = calculateETA(deliveryTripKm, volunteer?.vehicleType || 'other');

      return {
        _id: donation._id,
        foodName: donation.foodName,
        foodType: donation.foodType,
        quantity: donation.quantity,
        quantityUnit: donation.quantityUnit,
        description: donation.description,
        expiryTime: donation.expiryTime,
        pickupAddress: donation.pickupAddress,
        pickupCoordinates: [pickupLng, pickupLat],
        deliveryAddress: donation.deliveryAddress,
        deliveryCoordinates: [deliveryLng, deliveryLat],
        donorName: donation.donor?.name || 'Donor',
        donorPhone: donation.donor?.phone || '',
        ngoName: donation.matchedNGOProfile?.organizationName || donation.matchedNGO?.name || 'NGO',
        ngoPhone: donation.matchedNGOProfile?.phone || donation.matchedNGO?.phone || '',
        distanceToPickupKm,
        deliveryTripKm,
        estimatedMinutes,
        createdAt: donation.createdAt
      };
    });

    // If volunteer location is available, sort nearest pickup first
    if (hasVolunteerLocation) {
      requests.sort((a, b) => (a.distanceToPickupKm || 9999) - (b.distanceToPickupKm || 9999));
    }

    res.json({ requests });
  } catch (error) {
    console.error('Get available requests error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// ACCEPT DELIVERY REQUEST (Race-Safe)
// ─────────────────────────────────────────
const acceptDelivery = async (req, res) => {
  try {
    const volunteerProfile = await Volunteer.findOne({ user: req.user._id });
    if (!volunteerProfile) {
      return res.status(404).json({ message: 'Volunteer profile not found' });
    }

    if (volunteerProfile.activeDelivery) {
      return res.status(400).json({
        message: 'You already have an active delivery in progress. Complete it first before accepting a new one.'
      });
    }

    // Atomically find donation and update status to VOLUNTEER_ASSIGNED
    // If another volunteer accepts it first, findOneAndUpdate will return null
    const donation = await Donation.findOneAndUpdate(
      { _id: req.params.id, status: 'VOLUNTEER_REQUESTED' },
      {
        status: 'VOLUNTEER_ASSIGNED',
        assignedVolunteer: req.user._id,
        assignedVolunteerProfile: volunteerProfile._id
      },
      { new: true }
    )
      .populate('donor', 'name phone')
      .populate('matchedNGO', 'name phone');

    if (!donation) {
      return res.status(400).json({
        message: 'This delivery request is no longer available or was already accepted by another volunteer.'
      });
    }

    const pickupLat = donation.pickupLocation.coordinates[1];
    const pickupLng = donation.pickupLocation.coordinates[0];
    const deliveryLat = donation.deliveryLocation.coordinates[1];
    const deliveryLng = donation.deliveryLocation.coordinates[0];

    const distanceKm = haversineDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
    const estimatedMinutes = calculateETA(distanceKm, volunteerProfile.vehicleType || 'other');

    // Create the Delivery document
    const delivery = await Delivery.create({
      donation: donation._id,
      volunteer: req.user._id,
      volunteerProfile: volunteerProfile._id,
      ngo: donation.matchedNGO._id || donation.matchedNGO,
      pickupAddress: donation.pickupAddress,
      pickupCoordinates: donation.pickupLocation.coordinates,
      deliveryAddress: donation.deliveryAddress,
      deliveryCoordinates: donation.deliveryLocation.coordinates,
      distanceKm,
      estimatedDeliveryMinutes: estimatedMinutes,
      status: 'ASSIGNED',
      assignedAt: new Date()
    });

    // Update volunteer profile with the active delivery ID and mark as not available
    volunteerProfile.activeDelivery = delivery._id;
    volunteerProfile.isAvailable = false;
    await volunteerProfile.save();

    // Notify Donor
    await createNotification(
      donation.donor._id || donation.donor,
      'VOLUNTEER_ASSIGNED',
      'Volunteer Assigned to Your Donation',
      `Volunteer ${req.user.name} has accepted to pick up your donation "${donation.foodName}".`,
      donation._id,
      delivery._id
    );

    // Notify NGO
    await createNotification(
      donation.matchedNGO._id || donation.matchedNGO,
      'VOLUNTEER_FOUND',
      'Volunteer Assigned for Delivery',
      `Volunteer ${req.user.name} has been assigned to deliver "${donation.foodName}" to your location.`,
      donation._id,
      delivery._id
    );

    res.json({
      message: 'Delivery accepted successfully! You are now assigned to this delivery.',
      donation,
      delivery
    });
  } catch (error) {
    console.error('Accept delivery error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// GET ACTIVE DELIVERY
// ─────────────────────────────────────────
const getActiveDelivery = async (req, res) => {
  try {
    const volunteerProfile = await Volunteer.findOne({ user: req.user._id });
    if (!volunteerProfile) {
      return res.status(404).json({ message: 'Volunteer profile not found' });
    }

    if (!volunteerProfile.activeDelivery) {
      return res.json({ delivery: null });
    }

    const delivery = await Delivery.findById(volunteerProfile.activeDelivery)
      .populate({
        path: 'donation',
        populate: [
          { path: 'donor', select: 'name email phone' },
          { path: 'donorProfile', select: 'organizationName address donorType' },
          { path: 'matchedNGO', select: 'name email phone' },
          { path: 'matchedNGOProfile', select: 'organizationName address phone' }
        ]
      })
      .populate('ngo', 'name email phone')
      .populate('volunteer', 'name email phone');

    res.json({ delivery });
  } catch (error) {
    console.error('Get active delivery error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// VOLUNTEER CONFIRMS FOOD PICKUP
// ─────────────────────────────────────────
const confirmPickup = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('donation')
      .populate('ngo', 'name')
      .populate('volunteer', 'name');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.volunteer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized for this delivery' });
    }

    const volunteerProfile = await Volunteer.findOne({ user: req.user._id });
    const distanceKm = delivery.distanceKm || 5;
    const estimatedMinutes = calculateETA(distanceKm, volunteerProfile?.vehicleType || 'other');
    const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);

    delivery.status = 'IN_TRANSIT';
    delivery.volunteerConfirmedPickup = true;
    delivery.pickedUpAt = new Date();
    delivery.estimatedDeliveryMinutes = estimatedMinutes;
    delivery.estimatedDeliveryTime = estimatedDeliveryTime;
    delivery.arrivalNotified = false; // Reset so 2-minute checker will fire
    await delivery.save();

    // Update Donation status
    await Donation.findByIdAndUpdate(delivery.donation._id, {
      status: 'OUT_FOR_DELIVERY',
      volunteerConfirmedPickup: true,
      collectedAt: new Date()
    });

    const donation = delivery.donation;

    // Send in-app notification to NGO with ETA details
    const timeFormatted = estimatedDeliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await createNotification(
      delivery.ngo._id,
      'FOOD_COLLECTED',
      'Food Picked Up — On the Way!',
      `Volunteer ${req.user.name} has picked up "${donation.foodName}". Estimated arrival time is in approx ${estimatedMinutes} mins (~${timeFormatted}).`,
      donation._id,
      delivery._id
    );

    // Send in-app notification to Donor
    await createNotification(
      donation.donor,
      'FOOD_COLLECTED',
      'Food Collected for Delivery',
      `Volunteer ${req.user.name} has picked up your donation "${donation.foodName}" and is en route to the NGO.`,
      donation._id,
      delivery._id
    );

    res.json({
      message: `Pickup confirmed! Estimated delivery time: ${estimatedMinutes} mins (~${timeFormatted})`,
      delivery
    });
  } catch (error) {
    console.error('Volunteer confirm pickup error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// VOLUNTEER CONFIRMS FOOD DELIVERED AT NGO
// ─────────────────────────────────────────
const confirmDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('donation')
      .populate('ngo', 'name');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.volunteer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized for this delivery' });
    }

    delivery.status = 'DELIVERED';
    delivery.volunteerConfirmedDelivery = true;
    delivery.deliveredAt = new Date();
    await delivery.save();

    // Update Donation status
    await Donation.findByIdAndUpdate(delivery.donation._id, {
      status: 'DELIVERED',
      volunteerConfirmedDelivery: true,
      deliveredAt: new Date()
    });

    const donation = delivery.donation;

    // Notify NGO that volunteer has arrived with food
    await createNotification(
      delivery.ngo._id,
      'DELIVERY_COMPLETED',
      'Food Delivered at Your Doorstep',
      `Volunteer ${req.user.name} has arrived and delivered "${donation.foodName}". Please confirm receipt in your dashboard.`,
      donation._id,
      delivery._id
    );

    res.json({
      message: 'Delivery marked as completed by volunteer. Awaiting NGO receipt confirmation.',
      delivery
    });
  } catch (error) {
    console.error('Volunteer confirm delivery error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// GET VOLUNTEER DELIVERY HISTORY
// ─────────────────────────────────────────
const getDeliveryHistory = async (req, res) => {
  try {
    const history = await Delivery.find({
      volunteer: req.user._id,
      status: 'COMPLETED'
    })
      .populate('donation', 'foodName foodType quantity quantityUnit pickupAddress deliveryAddress')
      .populate('ngo', 'name')
      .sort({ completedAt: -1 });

    res.json({ history });
  } catch (error) {
    console.error('Get delivery history error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAvailableRequests,
  acceptDelivery,
  getActiveDelivery,
  confirmPickup,
  confirmDelivery,
  getDeliveryHistory
};
