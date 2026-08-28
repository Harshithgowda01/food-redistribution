const NGO = require('../models/NGO.model');
const User = require('../models/User.model');
const Donation = require('../models/Donation.model');
const MatchingLog = require('../models/MatchingLog.model');
const Volunteer = require('../models/Volunteer.model');
const Delivery = require('../models/Delivery.model');
const { createNotification } = require('../utils/notificationHelper');
const { notifyNextNGO } = require('../services/matching.service');
const { haversineDistance } = require('../utils/haversine');

// ─────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const ngo = await NGO.findOne({ user: req.user._id }).populate('user', 'name email phone');
    res.json({ ngo });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      organizationName,
      registrationNumber,
      address,
      capacity,
      foodPreferences,
      isAvailable,
      availabilitySchedule,
      description,
      latitude,
      longitude,
      phone
    } = req.body;

    const ngo = await NGO.findOne({ user: req.user._id });
    if (!ngo) return res.status(404).json({ message: 'NGO profile not found' });

    if (organizationName !== undefined) ngo.organizationName = organizationName;
    if (registrationNumber !== undefined) ngo.registrationNumber = registrationNumber;
    if (address !== undefined) ngo.address = address;
    if (capacity !== undefined) ngo.capacity = capacity;
    if (foodPreferences !== undefined) ngo.foodPreferences = foodPreferences;
    if (isAvailable !== undefined) ngo.isAvailable = isAvailable;
    if (availabilitySchedule !== undefined) ngo.availabilitySchedule = availabilitySchedule;
    if (description !== undefined) ngo.description = description;

    if (latitude && longitude) {
      ngo.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    await ngo.save();

    await User.findByIdAndUpdate(req.user._id, {
      profileCompleted: true,
      ...(phone && { phone })
    });

    res.json({ message: 'Profile updated successfully', ngo });
  } catch (error) {
    console.error('Update NGO profile error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// INCOMING DONATIONS (this NGO is currently being asked)
// ─────────────────────────────────────────
const getIncomingDonations = async (req, res) => {
  try {
    const donations = await Donation.find({
      status: 'WAITING_FOR_NGO',
      'ngoRankedList.ngoId': req.user._id
    }).populate('donor', 'name phone');

    const filtered = donations.filter(d => {
      const currentEntry = d.ngoRankedList[d.currentNGOIndex];
      return (
        currentEntry &&
        currentEntry.ngoId.toString() === req.user._id.toString() &&
        currentEntry.status === 'notified'
      );
    });

    res.json({ donations: filtered });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// MY DONATIONS (assigned to this NGO)
// ─────────────────────────────────────────
const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ matchedNGO: req.user._id })
      .populate('donor', 'name phone')
      .populate('assignedVolunteer', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ donations });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// ACCEPT DONATION
// ─────────────────────────────────────────
const acceptDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });

    if (donation.status !== 'WAITING_FOR_NGO') {
      return res.status(400).json({ message: 'This donation is no longer available for response' });
    }

    const currentEntry = donation.ngoRankedList[donation.currentNGOIndex];
    if (!currentEntry || currentEntry.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not eligible to respond to this donation right now' });
    }

    const ngoProfile = await NGO.findOne({ user: req.user._id });

    currentEntry.status = 'accepted';
    currentEntry.respondedAt = new Date();

    donation.matchedNGO = req.user._id;
    donation.matchedNGOProfile = ngoProfile._id;
    donation.status = 'NGO_ACCEPTED';
    donation.acceptedAt = new Date();

    await donation.save();

    await MatchingLog.findOneAndUpdate(
      { donation: donation._id },
      { selectedNGO: req.user._id, finalOutcome: 'accepted' }
    );

    await createNotification(
      donation.donor,
      'NGO_ACCEPTED',
      'NGO Accepted Your Donation',
      `${ngoProfile.organizationName} has accepted your donation "${donation.foodName}".`,
      donation._id
    );

    res.json({ message: 'Donation accepted successfully', donation });
  } catch (error) {
    console.error('Accept donation error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// REJECT DONATION
// ─────────────────────────────────────────
const rejectDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });

    if (donation.status !== 'WAITING_FOR_NGO') {
      return res.status(400).json({ message: 'This donation is no longer available for response' });
    }

    const currentEntry = donation.ngoRankedList[donation.currentNGOIndex];
    if (!currentEntry || currentEntry.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not eligible to respond to this donation right now' });
    }

    currentEntry.status = 'rejected';
    currentEntry.respondedAt = new Date();
    donation.currentNGOIndex += 1;

    await donation.save();

    await notifyNextNGO(donation._id);

    res.json({ message: 'Donation rejected' });
  } catch (error) {
    console.error('Reject donation error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// CHOOSE COLLECTION METHOD AND DELIVERY ADDRESS
// ─────────────────────────────────────────
const chooseCollectionMethod = async (req, res) => {
  try {
    const { collectionMethod, deliveryAddress, deliveryAddressType, latitude, longitude } = req.body;

    if (!['self_collect', 'volunteer'].includes(collectionMethod)) {
      return res.status(400).json({ message: 'Choose either self_collect or volunteer' });
    }

    if (!deliveryAddress || !['registered', 'custom', 'map_pin'].includes(deliveryAddressType)) {
      return res.status(400).json({ message: 'Please select a valid delivery address' });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Please provide the delivery location on the map' });
    }

    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });

    if (donation.matchedNGO?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This donation is not assigned to your NGO' });
    }

    if (donation.status !== 'NGO_ACCEPTED') {
      return res.status(400).json({ message: 'Collection method has already been chosen for this donation' });
    }

    donation.collectionMethod = collectionMethod;
    donation.deliveryAddress = deliveryAddress;
    donation.deliveryAddressType = deliveryAddressType;
    donation.deliveryLocation = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    };
    donation.status = collectionMethod === 'self_collect'
      ? 'NGO_COLLECTING'
      : 'VOLUNTEER_REQUESTED';
    if (collectionMethod === 'volunteer') {
      donation.volunteerRequestedAt = new Date();
      donation.volunteerSearchTimedOut = false;
    }
    await donation.save();

    const ngo = await NGO.findOne({ user: req.user._id });
    const statusMessage = collectionMethod === 'self_collect'
      ? `${ngo.organizationName} will collect your donation.`
      : `${ngo.organizationName} has requested a volunteer to collect and deliver your donation.`;

    await createNotification(
      donation.donor,
      collectionMethod === 'self_collect' ? 'NGO_SELF_COLLECTING' : 'VOLUNTEER_REQUESTED',
      collectionMethod === 'self_collect' ? 'NGO Will Collect the Food' : 'Volunteer Requested',
      statusMessage,
      donation._id
    );

    // If volunteer requested, find the nearest 5 available volunteers and notify them
    if (collectionMethod === 'volunteer') {
      const pickupLat = donation.pickupLocation.coordinates[1];
      const pickupLng = donation.pickupLocation.coordinates[0];

      // Find active volunteers who are available and not currently doing a delivery
      const availableVolunteers = await Volunteer.find({
        isAvailable: true,
        activeDelivery: null
      }).populate('user', 'name email');

      // Filter volunteers who have set their map location
      const validVolunteers = availableVolunteers.filter(v =>
        v.location &&
        v.location.coordinates &&
        (v.location.coordinates[0] !== 0 || v.location.coordinates[1] !== 0)
      );

      // Rank by Haversine distance from donor pickup point
      const rankedVolunteers = validVolunteers.map(v => {
        const dist = haversineDistance(
          pickupLat,
          pickupLng,
          v.location.coordinates[1],
          v.location.coordinates[0]
        );
        return { volunteer: v, distanceKm: dist };
      }).sort((a, b) => a.distanceKm - b.distanceKm);

      const top5Volunteers = rankedVolunteers.slice(0, 5);

      // Send in-app notification to nearest 5 volunteers
      for (const item of top5Volunteers) {
        await createNotification(
          item.volunteer.user._id,
          'NEW_DELIVERY_REQUEST',
          'New Delivery Request Nearby',
          `A donation of "${donation.foodName}" (${donation.quantity} ${donation.quantityUnit}) needs pickup ${item.distanceKm.toFixed(1)} km away.`,
          donation._id
        );
      }
    }

    res.json({
      message: collectionMethod === 'self_collect'
        ? 'Collection details saved. Your NGO can now collect the donation.'
        : 'Volunteer request created. Top nearby volunteers have been notified.',
      donation
    });
  } catch (error) {
    console.error('Choose collection method error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// CONFIRM FOOD RECEIPT (NGO Confirms Final Delivery/Collection)
// ─────────────────────────────────────────
const confirmReceipt = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });

    if (donation.matchedNGO?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized for this donation' });
    }

    donation.ngoConfirmedReceipt = true;
    donation.status = 'COMPLETED';
    donation.completedAt = new Date();
    await donation.save();

    // If delivered by volunteer, update Delivery record and volunteer stats
    if (donation.collectionMethod === 'volunteer') {
      const delivery = await Delivery.findOne({ donation: donation._id });
      if (delivery) {
        delivery.ngoConfirmedReceipt = true;
        delivery.status = 'COMPLETED';
        delivery.completedAt = new Date();
        await delivery.save();
      }

      if (donation.assignedVolunteer) {
        const volunteerProfile = await Volunteer.findOne({ user: donation.assignedVolunteer });
        if (volunteerProfile) {
          volunteerProfile.activeDelivery = null;
          volunteerProfile.isAvailable = true;
          volunteerProfile.totalDeliveries += 1;
          await volunteerProfile.save();
        }

        await createNotification(
          donation.assignedVolunteer,
          'DELIVERY_COMPLETED',
          'Delivery Completed!',
          `The NGO has confirmed receipt for "${donation.foodName}". Great job!`,
          donation._id,
          delivery ? delivery._id : null
        );
      }
    }

    // Notify Donor
    await createNotification(
      donation.donor,
      'DONATION_COMPLETED',
      'Donation Completed!',
      `Your food donation "${donation.foodName}" has been successfully delivered and received by the NGO. Thank you for making a difference!`,
      donation._id
    );

    res.json({ message: 'Donation marked as completed successfully', donation });
  } catch (error) {
    console.error('Confirm receipt error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// SWITCH TO SELF COLLECT (When no volunteer found or NGO chooses)
// ─────────────────────────────────────────
const switchSelfCollect = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });

    if (donation.matchedNGO?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized for this donation' });
    }

    if (!['VOLUNTEER_REQUESTED', 'NGO_ACCEPTED'].includes(donation.status)) {
      return res.status(400).json({ message: 'Cannot switch collection method at current status' });
    }

    donation.collectionMethod = 'self_collect';
    donation.status = 'NGO_COLLECTING';
    donation.volunteerSearchTimedOut = false;
    await donation.save();

    const ngo = await NGO.findOne({ user: req.user._id });
    await createNotification(
      donation.donor,
      'NGO_SELF_COLLECTING',
      'NGO Will Collect the Food Directly',
      `${ngo?.organizationName || 'The NGO'} has switched to self-collection and will pick up the donation directly.`,
      donation._id
    );

    res.json({ message: 'Switched to self-collection successfully', donation });
  } catch (error) {
    console.error('Switch self collect error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────
// RETRY VOLUNTEER SEARCH (Broadcasts to volunteers again)
// ─────────────────────────────────────────
const retryVolunteerSearch = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });

    if (donation.matchedNGO?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized for this donation' });
    }

    if (donation.status !== 'VOLUNTEER_REQUESTED') {
      return res.status(400).json({ message: 'Donation is not currently waiting for a volunteer' });
    }

    donation.volunteerRequestedAt = new Date();
    donation.volunteerSearchTimedOut = false;
    await donation.save();

    const pickupLat = donation.pickupLocation.coordinates[1];
    const pickupLng = donation.pickupLocation.coordinates[0];

    const availableVolunteers = await Volunteer.find({
      isAvailable: true,
      activeDelivery: null
    }).populate('user', 'name email');

    const validVolunteers = availableVolunteers.filter(v =>
      v.location &&
      v.location.coordinates &&
      (v.location.coordinates[0] !== 0 || v.location.coordinates[1] !== 0)
    );

    const rankedVolunteers = validVolunteers.map(v => {
      const dist = haversineDistance(
        pickupLat,
        pickupLng,
        v.location.coordinates[1],
        v.location.coordinates[0]
      );
      return { volunteer: v, distanceKm: dist };
    }).sort((a, b) => a.distanceKm - b.distanceKm);

    const top5Volunteers = rankedVolunteers.slice(0, 5);

    for (const item of top5Volunteers) {
      await createNotification(
        item.volunteer.user._id,
        'NEW_DELIVERY_REQUEST',
        'New Delivery Request (Urgent)',
        `A donation of "${donation.foodName}" is urgently awaiting pickup (${item.distanceKm.toFixed(1)} km away).`,
        donation._id
      );
    }

    res.json({ message: 'Volunteer search restarted. Top nearby volunteers have been notified.', donation });
  } catch (error) {
    console.error('Retry volunteer search error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getIncomingDonations,
  getMyDonations,
  acceptDonation,
  rejectDonation,
  chooseCollectionMethod,
  confirmReceipt,
  switchSelfCollect,
  retryVolunteerSearch
};
