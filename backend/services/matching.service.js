const axios = require('axios');
const Donation = require('../models/Donation.model');
const NGO = require('../models/NGO.model');
const MatchingLog = require('../models/MatchingLog.model');
const { createNotification } = require('../utils/notificationHelper');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Called right after a donation is created
const initiateMatching = async (donationId) => {
  try {
    const donation = await Donation.findById(donationId);
    if (!donation) return;

    donation.status = 'MATCHING';
    await donation.save();

    const ngos = await NGO.find({ isAvailable: true }).populate('user', 'name email');

    if (ngos.length === 0) {
      donation.status = 'UNMATCHED';
      await donation.save();
      await createNotification(
        donation.donor,
        'NO_NGO_FOUND',
        'No NGO Available',
        'No NGOs are currently available to accept your donation.',
        donation._id
      );
      return;
    }

    const ngoData = ngos.map(ngo => ({
      ngoId: ngo.user._id.toString(),
      ngoProfileId: ngo._id.toString(),
      name: ngo.organizationName,
      latitude: ngo.location.coordinates[1],
      longitude: ngo.location.coordinates[0],
      capacity: ngo.capacity,
      foodPreferences: ngo.foodPreferences,
      isAvailable: ngo.isAvailable
    }));

    const donationData = {
      foodType: donation.foodType,
      quantity: donation.quantity,
      expiryTime: donation.expiryTime,
      latitude: donation.pickupLocation.coordinates[1],
      longitude: donation.pickupLocation.coordinates[0]
    };

    const response = await axios.post(`${AI_SERVICE_URL}/match-ngo`, {
      donation: donationData,
      ngos: ngoData
    });

    const rankedNGOs = response.data.rankedNGOs;

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

// Notifies whichever NGO is at currentNGOIndex
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
      'All suitable NGOs rejected or did not respond to your donation.',
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
    `A new donation "${donation.foodName}" (${donation.quantity} ${donation.quantityUnit}) is available for you to accept.`,
    donation._id
  );
};

module.exports = { initiateMatching, notifyNextNGO };