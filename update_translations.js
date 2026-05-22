const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, 'frontend/src/locales/ar/translation.json');
const enPath = path.join(__dirname, 'frontend/src/locales/en/translation.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// EN updates
if (!en.notifications) {
  en.notifications = {
    title: "Notifications",
    empty: "No new notifications",
    mark_all_read: "Mark all as read",
    view_all: "View all notifications",
    send_notification: "Send Notification",
    form_title: "Title",
    form_message: "Message",
    form_severity: "Severity",
    form_type: "Type",
    form_target_role: "Target Role",
    form_governorate: "Governorate (Optional)",
    btn_send: "Send",
    btn_cancel: "Cancel",
    success_sent: "Notification sent successfully",
    all_caught_up: "You're all caught up!"
  };
}

// AR updates
if (!ar.notifications) {
  ar.notifications = {
    title: "الإشعارات",
    empty: "لا توجد إشعارات جديدة",
    mark_all_read: "تحديد الكل كمقروء",
    view_all: "عرض كل الإشعارات",
    send_notification: "إرسال إشعار",
    form_title: "العنوان",
    form_message: "الرسالة",
    form_severity: "الأهمية",
    form_type: "النوع",
    form_target_role: "الدور المستهدف",
    form_governorate: "المحافظة (اختياري)",
    btn_send: "إرسال",
    btn_cancel: "إلغاء",
    success_sent: "تم إرسال الإشعار بنجاح",
    all_caught_up: "لقد اطلعت على كل شيء!"
  };
}

fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
console.log("Translations successfully updated.");
