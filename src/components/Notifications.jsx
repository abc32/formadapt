import React, { useState, useEffect } from 'react';
  import './Notifications.css';
  import translate from '../i18n';

  function Notifications() {
    const [notifications, setNotifications] = useState(
      JSON.parse(localStorage.getItem('notifications')) || [
        { id: 1, message: translate('notifications.welcome'), read: false },
      ]
    );

    const [reminders, setReminders] = useState(
      JSON.parse(localStorage.getItem('reminders')) || {}
    );

    useEffect(() => {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }, [notifications]);

    useEffect(() => {
      const checkReminders = () => {
        const now = new Date();
        Object.entries(reminders).forEach(([moduleId, date]) => {
          const reminderDate = new Date(date);
          if (reminderDate <= now) {
            setNotifications(prevNotifications => [
              ...prevNotifications,
              { id: Date.now(), message: `Rappel pour le module ${moduleId} !`, read: false },
            ]);
            const newReminders = { ...reminders };
            delete newReminders[moduleId];
            setReminders(newReminders);
            localStorage.setItem('reminders', JSON.stringify(newReminders));
          }
        });
      };

      const intervalId = setInterval(checkReminders, 60000);

      return () => clearInterval(intervalId);
    }, [reminders]);

    const handleMarkAsRead = (notificationId) => {
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    };

    const handleRemoveNotification = (notificationId) => {
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
    };

    return (
      <div className="notifications" aria-live="polite" aria-atomic="true">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification ${notification.read ? 'read' : ''}`}>
            {notification.message}
            {!notification.read && (
              <button onClick={() => handleMarkAsRead(notification.id)}>{translate('notifications.markAsRead')}</button>
            )}
            <button onClick={() => handleRemoveNotification(notification.id)}>{translate('notifications.remove')}</button>
          </div>
        ))}
      </div>
    );
  }

  export default Notifications;
