const cron = require('node-cron');
const Donation = require('../models/Donation.model');
const Delivery = require('../models/Delivery.model');
const Volunteer = require('../models/Volunteer.model');
const { notifyNextNGO } = require('../services/matching.service');
const { createNotification } = require('../utils/notificationHelper');

const TIMEOUT_MINUTES = parseInt(process.env.NGO_TIMEOUT_MINUTES, 10) || 2;
const VOLUNTEER_TIMEOUT_MINUTES = parseInt(process.env.VOLUNTEER_TIMEOUT_MINUTES, 10) || 3;

const startTimeoutChecker = () => {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();

      // ─────────────────────────────────────────
      // 1. CHECK NGO ACCEPTANCE TIMEOUT (2 MINUTES)
      // ─────────────────────────────────────────
      const waitingDonations = await Donation.find({ status: 'WAITING_FOR_NGO' });

      for (const donation of waitingDonations) {
        if (!donation.ngoRankedList || !Array.isArray(donation.ngoRankedList)) continue;
        const currentEntry = donation.ngoRankedList[donation.currentNGOIndex];
        if (!currentEntry || currentEntry.status !== 'notified' || !currentEntry.notifiedAt) continue;

        const notifiedAt = new Date(currentEntry.notifiedAt);
        if (isNaN(notifiedAt.getTime())) continue;

        const minutesPassed = (now - notifiedAt) / (1000 * 60);

        if (minutesPassed >= TIMEOUT_MINUTES) {
          currentEntry.status = 'timeout';
          currentEntry.respondedAt = now;

          // Add timed-out NGO to excluded list for this donation
          if (!donation.excludedNGOs) donation.excludedNGOs = [];
          if (currentEntry.ngoId) {
            const isAlreadyExcluded = donation.excludedNGOs.some(
              id => id && id.toString() === currentEntry.ngoId.toString()
            );
            if (!isAlreadyExcluded) {
              donation.excludedNGOs.push(currentEntry.ngoId);
            }
          }

          donation.currentNGOIndex += 1;
          await donation.save();

          console.log(`Donation ${donation._id}: NGO timed out, moving to next NGO`);
          await notifyNextNGO(donation._id);
        }
      }

      // ─────────────────────────────────────────
      // 2. CHECK 2-MINUTE ARRIVAL ALERT FOR IN-TRANSIT DELIVERIES
      // ─────────────────────────────────────────
      const activeDeliveries = await Delivery.find({
        status: { $in: ['IN_TRANSIT', 'PICKED_UP'] },
        arrivalNotified: false,
        estimatedDeliveryTime: { $ne: null }
      }).populate('donation', 'foodName').populate('volunteer', 'name');

      for (const delivery of activeDeliveries) {
        const deliveryTime = new Date(delivery.estimatedDeliveryTime);
        const minutesUntilArrival = (deliveryTime - now) / (1000 * 60);

        // When 2 minutes or less remain before estimated delivery arrival
        if (minutesUntilArrival <= 2) {
          delivery.arrivalNotified = true;
          await delivery.save();

          const foodName = delivery.donation?.foodName || 'food donation';
          const volunteerName = delivery.volunteer?.name || 'Volunteer';

          await createNotification(
            delivery.ngo,
            'DELIVERY_ASSIGNED',
            'Food Arriving Soon (~2 mins)!',
            `Volunteer ${volunteerName} is approximately 2 minutes away with "${foodName}". Please prepare to receive the food.`,
            delivery.donation?._id || delivery.donation,
            delivery._id,
            {
              subject: `[Arrival Alert] Food Arriving Soon: ${foodName}`,
              actionText: 'View Delivery Status',
              actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/ngo/dashboard`
            }
          );

          console.log(`Delivery ${delivery._id}: Sent 2-minute arrival alert to NGO.`);
        }
      }

      // ─────────────────────────────────────────
      // 3. CHECK NO-VOLUNTEER TIMEOUT (3 MINUTES)
      // ─────────────────────────────────────────
      const pendingVolunteerDonations = await Donation.find({
        status: 'VOLUNTEER_REQUESTED',
        volunteerSearchTimedOut: false
      });

      for (const donation of pendingVolunteerDonations) {
        const requestedAt = donation.volunteerRequestedAt || donation.updatedAt;
        const minutesPassed = (now - new Date(requestedAt)) / (1000 * 60);

        if (minutesPassed >= VOLUNTEER_TIMEOUT_MINUTES) {
          donation.volunteerSearchTimedOut = true;
          await donation.save();

          if (donation.matchedNGO) {
            await createNotification(
              donation.matchedNGO,
              'NO_VOLUNTEER_AVAILABLE',
              'No Volunteer Found - Action Required',
              `No volunteers accepted delivery for "${donation.foodName}" within ${VOLUNTEER_TIMEOUT_MINUTES} minutes. Please choose: 1) Collect Myself, or 2) Cancel Donation (to allow rematching to another NGO).`,
              donation._id,
              null,
              {
                subject: `[Action Required] No Volunteer Found for: ${donation.foodName}`,
                actionText: 'Choose Collect Myself or Cancel',
                actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/ngo/dashboard`
              }
            );
          }
          console.log(`Donation ${donation._id}: Volunteer search timed out after ${VOLUNTEER_TIMEOUT_MINUTES} mins.`);
        }
      }

      // ─────────────────────────────────────────
      // 4. CHECK AUTOMATIC FOOD EXPIRY
      // ─────────────────────────────────────────
      const uncollectedDonations = await Donation.find({
        status: {
          $nin: [
            'FOOD_COLLECTED',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'COMPLETED',
            'CANCELLED',
            'EXPIRED'
          ]
        },
        expiryTime: { $lte: now }
      });

      for (const donation of uncollectedDonations) {
        donation.status = 'EXPIRED';
        await donation.save();

        // If volunteer was assigned before pickup, clear volunteer active status
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
            'Donation Expired',
            `The donation "${donation.foodName}" reached its expiry time before pickup and has been closed.`,
            donation._id
          );
        }

        // Notify Donor
        await createNotification(
          donation.donor,
          'DONATION_CANCELLED',
          'Food Donation Expired',
          `Your food donation "${donation.foodName}" passed its expiration time and was closed automatically.`,
          donation._id
        );

        // Notify NGO if matched
        if (donation.matchedNGO) {
          await createNotification(
            donation.matchedNGO,
            'DONATION_CANCELLED',
            'Food Donation Expired',
            `Donation "${donation.foodName}" reached its expiry time and is no longer available.`,
            donation._id
          );
        }

        console.log(`Donation ${donation._id}: Automatically marked as EXPIRED.`);
      }

    } catch (error) {
      console.error('Timeout checker error:', error.message);
    }
  });
};

module.exports = { startTimeoutChecker };