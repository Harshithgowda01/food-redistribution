import AppLayout from '../../components/layout/AppLayout';
import NotificationInbox from '../../components/NotificationInbox';

const NGONotifications = () => (
  <AppLayout maxWidth="max-w-3xl">
    <NotificationInbox
      title="Notifications"
      description="Incoming food matches, volunteer pickups, arrival alerts, and drop-offs."
    />
  </AppLayout>
);

export default NGONotifications;
