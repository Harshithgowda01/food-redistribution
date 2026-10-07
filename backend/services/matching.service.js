const axios = require('axios');
const Donation = require('../models/Donation.model');
const NGO = require('../models/NGO.model');
const MatchingLog = require('../models/MatchingLog.model');
const { createNotification } = require('../utils/notificationHelper');
const { haversineDistance } = require('../utils/haversine');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const calculateDistanceScore = (distanceKm, maxRadius = 15) => {
  if (distanceKm >= maxRadius) return 0;
  return Math.round((1 - distanceKm / maxRadius) * 100 * 100) / 100;
};

const calculateCompatibilityScore = (foodType, ngoPreferences = []) => {
  if (!ngoPreferences || ngoPreferences.length === 0) return 50;
  if (ngoPreferences.includes('any') || ngoPreferences.includes(foodType)) return 100;
  return 20;
};

const calculateCapacityScore = (quantity, capacity) => {
  if (!capacity || capacity <= 0) return 0;
  if (capacity >= quantity) {
    const ratio = quantity / capacity;
    return Math.round((60 + ratio * 40) * 100) / 100;
  } else {
    const ratio = capacity / quantity;
    return Math.round(ratio * 50 * 100) / 100;
  }
};

const calculateUrgencyScore = (expiryTime) => {
  try {
    const expiry = new Date(expiryTime);
    const now = new Date();
    const hoursLeft = (expiry - now) / (1000 * 3600);
    if (hoursLeft <= 0) return 0;
    if (hoursLeft <= 1) return 100;
    if (hoursLeft <= 3) return 80;
    if (hoursLeft <= 6) return 60;
    if (hoursLeft <= 12) return 40;
    return 20;
  } catch {
    return 50;
  }
};

const rankNGOsFallback = (donationData, ngos) => {
  const urgencyScore = calculateUrgencyScore(donationData.expiryTime);
  const weights = urgencyScore >= 80
    ? { distance: 0.45, compatibility: 0.20, capacity: 0.15, availability: 0.10, urgency: 0.10 }
    : { distance: 0.30, compatibility: 0.25, capacity: 0.20, availability: 0.15, urgency: 0.10 };

  const results = [];
  for (const ngo of ngos) {
    if (ngo.isAvailable === false) continue;
    const distanceKm = haversineDistance(
      donationData.latitude,
      donationData.longitude,
      ngo.latitude,
      ngo.longitude
    );
    const distanceScore = calculateDistanceScore(distanceKm);
    const compatibilityScore = calculateCompatibilityScore(donationData.foodType, ngo.foodPreferences);
    const capacityScore = calculateCapacityScore(donationData.quantity, ngo.capacity);
    const availabilityScore = ngo.isAvailable ? 100 : 0;

    const totalScore =
      distanceScore * weights.distance +
      compatibilityScore * weights.compatibility +
      capacityScore * weights.capacity +
      availabilityScore * weights.availability +
      urgencyScore * weights.urgency;

    results.push({
      ngoId: ngo.ngoId,
      ngoProfileId: ngo.ngoProfileId,
      name: ngo.name,
      distanceKm,
      distanceScore,
      compatibilityScore,
      capacityScore,
      urgencyScore,
      availabilityScore,
      totalScore: Math.round(totalScore * 100) / 100
    });
  }

  results.sort((a, b) => b.totalScore - a.totalScore);
  return results;
};

const fetchRankedNGOs = async (donationData, ngoData) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/match-ngo`, {
      donation: donationData,
      ngos: ngoData
    }, { timeout: 3000 });

    if (response.data && Array.isArray(response.data.rankedNGOs)) {
      return response.data.rankedNGOs;
    }
  } catch (err) {
    console.warn('[MatchingService] AI Service match call unavailable or timed out, using fallback matching engine:', err.message);
  }
  return rankNGOsFallback(donationData, ngoData);
};

/**
 * Initiates initial matching or matching with exclusions for a donation.
 */
const initiateMatching = async (donationId, extraExcludedNGOs = []) => {
  try {
    const donation = await Donation.findById(donationId);
    if (!donation) return;

    // Check if food already expired
    if (new Date(donation.expiryTime) <= new Date()) {
      donation.status = 'EXPIRED';
      await donation.save();
      await createNotification(
        donation.donor,
        'DONATION_CANCELLED',
        'Donation Expired',
        `Your food donation "${donation.foodName}" reached its expiry time and could not be matched.`,
        donation._id
      );
      return;
    }

    donation.status = 'MATCHING';
    await donation.save();

    const excludedIds = [
      ...(donation.excludedNGOs || []).map(id => id.toString()),
      ...extraExcludedNGOs.map(id => id.toString())
    ];

    const rawNgos = await NGO.find({
      isAvailable: true,
      user: { $nin: excludedIds }
    }).populate('user', 'name email');

    // Filter out orphaned NGO profiles where the user was deleted or is missing
    const ngos = rawNgos.filter(ngo => ngo && ngo.user && ngo.user._id);

    if (ngos.length === 0) {
      donation.status = 'UNMATCHED';
      await donation.save();
      await createNotification(
        donation.donor,
        'NO_NGO_FOUND',
        'No NGO Available',
        'No eligible NGOs are currently available to accept your donation.',
        donation._id
      );
      await MatchingLog.create({
        donation: donation._id,
        rankedNGOs: [],
        finalOutcome: 'no_ngos_available',
        totalNGOsConsidered: 0
      });
      return;
    }

    const ngoData = ngos.map(ngo => ({
      ngoId: ngo.user._id.toString(),
      ngoProfileId: ngo._id.toString(),
      name: ngo.organizationName || 'NGO',
      latitude: (ngo.location && ngo.location.coordinates && ngo.location.coordinates[1]) || 0,
      longitude: (ngo.location && ngo.location.coordinates && ngo.location.coordinates[0]) || 0,
      capacity: ngo.capacity || 100,
      foodPreferences: ngo.foodPreferences || ['any'],
      isAvailable: ngo.isAvailable !== false
    }));

    const donationData = {
      foodType: donation.foodType,
      quantity: donation.quantity,
      expiryTime: donation.expiryTime,
      latitude: (donation.pickupLocation && donation.pickupLocation.coordinates && donation.pickupLocation.coordinates[1]) || 0,
      longitude: (donation.pickupLocation && donation.pickupLocation.coordinates && donation.pickupLocation.coordinates[0]) || 0
    };

    const rankedNGOs = await fetchRankedNGOs(donationData, ngoData);

    if (!rankedNGOs || rankedNGOs.length === 0) {
      donation.status = 'UNMATCHED';
      await donation.save();
      await createNotification(
        donation.donor,
        'NO_NGO_FOUND',
        'No Suitable NGO Found',
        'No suitable NGO was found for your donation.',
        donation._id
      );
      await MatchingLog.create({
        donation: donation._id,
        rankedNGOs: [],
        finalOutcome: 'no_ngos_available',
        totalNGOsConsidered: 0
      });
      return;
    }

    donation.ngoRankedList = rankedNGOs.map(item => ({
      ngoId: item.ngoId,
      ngoProfileId: item.ngoProfileId,
      score: item.totalScore,
      status: 'pending'
    }));
    donation.currentNGOIndex = 0;
    await donation.save();

    await MatchingLog.create({
      donation: donation._id,
      rankedNGOs: rankedNGOs.map(item => ({
        ngoId: item.ngoId,
        ngoName: item.name,
        scores: {
          distanceScore: item.distanceScore,
          compatibilityScore: item.compatibilityScore,
          capacityScore: item.capacityScore,
          urgencyScore: item.urgencyScore,
          availabilityScore: item.availabilityScore,
          totalScore: item.totalScore
        }
      })),
      totalNGOsConsidered: rankedNGOs.length
    });

    await notifyNextNGO(donation._id);

  } catch (error) {
    console.error('Matching error:', error.message);
  }
};

/**
 * Re-matches a donation when an assigned NGO cancels after volunteer failure or decision window.
 * Excludes previous/cancelling NGOs and selects the next highest-ranked eligible NGO.
 */
const rematchDonation = async (donationId, cancellingNGOId = null) => {
  try {
    const donation = await Donation.findById(donationId);
    if (!donation) return { success: false, reason: 'Donation not found' };

    // 1. Check if donation has expired
    if (new Date(donation.expiryTime) <= new Date()) {
      donation.status = 'EXPIRED';
      donation.matchedNGO = null;
      donation.matchedNGOProfile = null;
      donation.assignedVolunteer = null;
      donation.assignedVolunteerProfile = null;
      donation.volunteerSearchTimedOut = false;
      await donation.save();

      await createNotification(
        donation.donor,
        'DONATION_CANCELLED',
        'Food Donation Expired',
        `Donation "${donation.foodName}" reached its expiry time during rematching and has been marked as expired.`,
        donation._id
      );

      if (cancellingNGOId) {
        await createNotification(
          cancellingNGOId,
          'DONATION_CANCELLED',
          'Donation Expired',
          `Donation "${donation.foodName}" has expired.`,
          donation._id
        );
      }

      return { success: false, expired: true, reason: 'Donation has expired' };
    }

    // 2. Add cancelling NGO to excluded list if not already present
    if (cancellingNGOId) {
      const exists = donation.excludedNGOs.some(
        id => id.toString() === cancellingNGOId.toString()
      );
      if (!exists) {
        donation.excludedNGOs.push(cancellingNGOId);
      }
    }

    // 3. Clear existing match & volunteer assignment data
    donation.matchedNGO = null;
    donation.matchedNGOProfile = null;
    donation.assignedVolunteer = null;
    donation.assignedVolunteerProfile = null;
    donation.collectionMethod = null;
    donation.deliveryAddress = null;
    donation.deliveryAddressType = null;
    donation.deliveryLocation = { type: 'Point', coordinates: [0, 0] };
    donation.volunteerRequestedAt = null;
    donation.volunteerSearchTimedOut = false;
    donation.status = 'MATCHING';
    await donation.save();

    // 4. Fetch available NGOs excluding all in donation.excludedNGOs
    const excludedIds = donation.excludedNGOs.map(id => id.toString());
    const rawNgos = await NGO.find({
      isAvailable: true,
      user: { $nin: excludedIds }
    }).populate('user', 'name email');

    // Filter out orphaned NGO profiles
    const ngos = rawNgos.filter(ngo => ngo && ngo.user && ngo.user._id);

    if (ngos.length === 0) {
      donation.status = 'UNMATCHED';
      donation.ngoRankedList = [];
      donation.currentNGOIndex = 0;
      await donation.save();

      await createNotification(
        donation.donor,
        'NO_NGO_FOUND',
        'No NGO Available for Rematch',
        `No eligible NGOs remain to accept your donation "${donation.foodName}".`,
        donation._id
      );

      await MatchingLog.create({
        donation: donation._id,
        rankedNGOs: [],
        finalOutcome: 'no_ngos_available',
        totalNGOsConsidered: 0
      });

      return { success: true, rematched: false, message: 'No eligible NGOs remain' };
    }

    // 5. Format remaining eligible NGOs and fetch ranked results
    const ngoData = ngos.map(ngo => ({
      ngoId: ngo.user._id.toString(),
      ngoProfileId: ngo._id.toString(),
      name: ngo.organizationName || 'NGO',
      latitude: (ngo.location && ngo.location.coordinates && ngo.location.coordinates[1]) || 0,
      longitude: (ngo.location && ngo.location.coordinates && ngo.location.coordinates[0]) || 0,
      capacity: ngo.capacity || 100,
      foodPreferences: ngo.foodPreferences || ['any'],
      isAvailable: ngo.isAvailable !== false
    }));

    const donationData = {
      foodType: donation.foodType,
      quantity: donation.quantity,
      expiryTime: donation.expiryTime,
      latitude: (donation.pickupLocation && donation.pickupLocation.coordinates && donation.pickupLocation.coordinates[1]) || 0,
      longitude: (donation.pickupLocation && donation.pickupLocation.coordinates && donation.pickupLocation.coordinates[0]) || 0
    };

    const rankedNGOs = await fetchRankedNGOs(donationData, ngoData);

    if (!rankedNGOs || rankedNGOs.length === 0) {
      donation.status = 'UNMATCHED';
      donation.ngoRankedList = [];
      donation.currentNGOIndex = 0;
      await donation.save();

      await createNotification(
        donation.donor,
        'NO_NGO_FOUND',
        'No Suitable NGO Found',
        `No suitable NGO was found to rematch your donation "${donation.foodName}".`,
        donation._id
      );

      return { success: true, rematched: false, message: 'No suitable NGO found' };
    }

    // 6. Update ranked list and notify the newly selected highest-ranked NGO
    donation.ngoRankedList = rankedNGOs.map(item => ({
      ngoId: item.ngoId,
      ngoProfileId: item.ngoProfileId,
      score: item.totalScore,
      status: 'pending'
    }));
    donation.currentNGOIndex = 0;
    await donation.save();

    await MatchingLog.create({
      donation: donation._id,
      rankedNGOs: rankedNGOs.map(item => ({
        ngoId: item.ngoId,
        ngoName: item.name,
        scores: {
          distanceScore: item.distanceScore,
          compatibilityScore: item.compatibilityScore,
          capacityScore: item.capacityScore,
          urgencyScore: item.urgencyScore,
          availabilityScore: item.availabilityScore,
          totalScore: item.totalScore
        }
      })),
      totalNGOsConsidered: rankedNGOs.length
    });

    await notifyNextNGO(donation._id);

    return {
      success: true,
      rematched: true,
      nextNGO: rankedNGOs[0]
    };

  } catch (error) {
    console.error('Rematch error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Notifies whichever NGO is at currentNGOIndex in the ranked list.
 */
const notifyNextNGO = async (donationId) => {
  const donation = await Donation.findById(donationId);
  if (!donation) return;

  if (donation.currentNGOIndex >= donation.ngoRankedList.length) {
    donation.status = 'UNMATCHED';
    await donation.save();

    await createNotification(
      donation.donor,
      'NO_NGO_FOUND',
      'No NGO Accepted Your Donation',
      'All suitable NGOs rejected or did not respond to your donation in time.',
      donation._id
    );

    await MatchingLog.findOneAndUpdate(
      { donation: donation._id },
      { finalOutcome: 'all_rejected' }
    );
    return;
  }

  const currentEntry = donation.ngoRankedList[donation.currentNGOIndex];
  currentEntry.status = 'notified';
  currentEntry.notifiedAt = new Date();

  donation.status = 'WAITING_FOR_NGO';
  await donation.save();

  await createNotification(
    currentEntry.ngoId,
    'NEW_DONATION_AVAILABLE',
    'New Food Donation Available',
    `A new donation "${donation.foodName}" (${donation.quantity} ${donation.quantityUnit}) is available for you to accept. Please respond within 2 minutes.`,
    donation._id,
    null,
    {
      subject: `[Action Required] New Food Donation Available: ${donation.foodName}`,
      actionText: 'View & Accept Donation',
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/ngo/dashboard`
    }
  );
};

module.exports = {
  initiateMatching,
  rematchDonation,
  notifyNextNGO
};