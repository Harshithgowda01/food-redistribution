const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const Donation = require('../models/Donation.model');
const { sendNotificationEmail } = require('../services/email.service');

/**
 * Creates an in-app notification and sends an email notification to the recipient's registered email.
 *
 * @param {string|Object} recipientId - User ID or populated User object
 * @param {string} type - Notification enum type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} [donationId=null] - Related donation ID
 * @param {string} [deliveryId=null] - Related delivery ID
 * @param {Object} [emailOptions={}] - Optional email customization { details, actionUrl, actionText, deduplicationKey, subject }
 */
const createNotification = async (
  recipientId,
  type,
  title,
  message,
  donationId = null,
  deliveryId = null,
  emailOptions = {}
) => {
  let notification = null;
  try {
    const rawRecipientId = recipientId?._id ? recipientId._id : recipientId;

    // 1. Create In-App Notification
    notification = new Notification({
      recipient: rawRecipientId,
      type: type,
      title: title,
      message: message,
      relatedDonation: donationId,
      relatedDelivery: deliveryId
    });
    await notification.save();

    // 2. Dispatch Email Notification asynchronously
    (async () => {
      try {
        let recipientUser = null;
        if (recipientId && recipientId.email) {
          recipientUser = recipientId;
        } else if (rawRecipientId) {
          recipientUser = await User.findById(rawRecipientId).select('name email');
        }

        if (!recipientUser || !recipientUser.email) {
          return;
        }

        let emailDetails = emailOptions.details || [];

        // If no custom details provided but donationId is present, fetch donation info for context
        if (emailDetails.length === 0 && donationId) {
          const donation = await Donation.findById(donationId).select('foodName foodType quantity quantityUnit expiryTime pickupAddress');
          if (donation) {
            emailDetails = [
              { label: 'Food Item', value: donation.foodName },
              { label: 'Quantity', value: `${donation.quantity} ${donation.quantityUnit || 'meals'}` },
              { label: 'Pickup Location', value: donation.pickupAddress || 'See in dashboard' },
              { label: 'Expires At', value: donation.expiryTime ? new Date(donation.expiryTime).toLocaleString() : 'N/A' }
            ];
          }
        }

        const dedupKey = emailOptions.deduplicationKey || `${recipientUser.email}:${type}:${donationId || deliveryId || title}`;

        await sendNotificationEmail({
          to: recipientUser.email,
          subject: emailOptions.subject || title,
          title: title,
          message: message,
          details: emailDetails,
          actionUrl: emailOptions.actionUrl || '',
          actionText: emailOptions.actionText || '',
          deduplicationKey: dedupKey
        });

      } catch (emailErr) {
        // Email failure must NOT throw or disrupt workflow
        console.error('[NotificationHelper] Email dispatch failed safely:', emailErr.message);
      }
    })();

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error.message);
    return notification;
  }
};

module.exports = { createNotification };