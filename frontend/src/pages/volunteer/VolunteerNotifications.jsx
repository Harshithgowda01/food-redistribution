import AppLayout from '../../components/layout/AppLayout';
import NotificationInbox from '../../components/NotificationInbox';

const VolunteerNotifications = () => (
  <AppLayout maxWidth="max-w-3xl">
    <NotificationInbox
      title="Notifications"
      description="Delivery requests near you and NGO receipt confirmations."
    />
  </AppLayout>
);

export default VolunteerNotifications;
