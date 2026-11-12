import AppLayout from '../../components/layout/AppLayout';
import NotificationInbox from '../../components/NotificationInbox';

const DonorNotifications = () => (
  <AppLayout maxWidth="max-w-3xl">
    <NotificationInbox
      title="Notifications"
      description="Updates about your donations, NGO matches, and handovers."
    />
  </AppLayout>
);

export default DonorNotifications;
