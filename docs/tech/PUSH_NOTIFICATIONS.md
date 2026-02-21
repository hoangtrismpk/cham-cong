# 🔔 Push Notifications Integration Guide

**Status:** 📝 Documentation Ready (Implementation Pending)  
**Created:** 2026-02-07

---

## 📋 Overview

Hệ thống push notifications cần được cập nhật để tích hợp với employment types và schedule templates. Thay vì gửi thông báo cố định lúc 08:15 và 17:45, hệ thống sẽ:

- ✅ Đọc schedule template của mỗi nhân viên
- ✅ Tính toán thời gian nhắc nhở dựa trên employment type
- ✅ Skip notifications nếu có full-day leave
- ✅ Adjust notifications cho partial leave

---

## 🎯 Requirements

### 1. Schedule-Based Notifications

**Full-time Employees:**
- Morning reminder: 15 phút trước scheduled_start_time
- Evening reminder: 15 phút trước scheduled_end_time
- Default: 08:15 và 17:45 (nếu không có schedule)

**Part-time Employees:**
- Chỉ nhắc vào ca làm việc (morning hoặc evening)
- Morning shift: Nhắc lúc 08:15
- Evening shift: Nhắc lúc 13:15

**Interns:**
- Dựa vào custom schedule của từng ngày
- 15 phút trước start_time và end_time

### 2. Leave Integration

**Full Day Leave:**
- ❌ SKIP tất cả notifications cho ngày đó
- Không gửi morning và evening reminders

**Half Day Leave:**
- Half day morning: ❌ Skip morning reminder, ✅ Send evening
- Half day afternoon: ✅ Send morning, ❌ Skip evening

**Partial Leave:**
- ✅ Vẫn gửi both reminders
- Thêm note trong notification: "Bạn có nghỉ phép từ XX:XX - YY:YY"

---

## 🔌 Implementation Steps

### Step 1: Update Notification Service

**File:** `lib/firebase/notification-service.ts`

```typescript
import { ScheduleTemplateService } from '@/lib/services/schedule-template-service';
import { LeaveRequestService } from '@/lib/services/leave-request-service';

interface NotificationContext {
  employeeId: string;
  employmentType: EmploymentType;
  date: string; // YYYY-MM-DD
}

async function shouldSendNotification(
  context: NotificationContext,
  reminderType: 'morning' | 'evening'
): Promise<boolean> {
  // 1. Check for full day leave
  const leaves = await LeaveRequestService.getApprovedLeavesForDateRange(
    context.employeeId,
    context.date,
    context.date
  );

  const hasFullDayLeave = leaves.some(l => l.leave_type === 'full_day');
  if (hasFullDayLeave) {
    return false; // Skip all notifications
  }

  // 2. Check for half day leave
  if (reminderType === 'morning') {
    const hasHalfDayMorning = leaves.some(l => l.leave_type === 'half_day_morning');
    if (hasHalfDayMorning) return false;
  }

  if (reminderType === 'evening') {
    const hasHalfDayAfternoon = leaves.some(l => l.leave_type === 'half_day_afternoon');
    if (hasHalfDayAfternoon) return false;
  }

  // 3. Check if employee works on this day
  const dayOfWeek = new Date(context.date).getDay();
  const schedules = await ScheduleTemplateService.getEmployeeSchedule(context.employeeId);
  const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);

  if (!daySchedule) {
    return false; // Not working on this day
  }

  return true;
}

async function getReminderTime(
  employeeId: string,
  date: string,
  reminderType: 'morning' | 'evening'
): Promise<string | null> {
  const dayOfWeek = new Date(date).getDay();
  const schedules = await ScheduleTemplateService.getEmployeeSchedule(employeeId);
  const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);

  if (!daySchedule) return null;

  const times = ScheduleTemplateService.calculateScheduleTimes(
    daySchedule.shift_type,
    daySchedule.custom_start_time,
    daySchedule.custom_end_time
  );

  if (reminderType === 'morning') {
    // 15 minutes before start
    return subtractMinutes(times.start_time, 15);
  } else {
    // 15 minutes before end
    return subtractMinutes(times.end_time, 15);
  }
}

function subtractMinutes(time: string, minutes: number): string {
  const [hour, min] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + min - minutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMin = totalMinutes % 60;
  return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
}
```

### Step 2: Update Cron Job

**File:** `scripts/send-clock-reminders.ts`

```typescript
import { createClient } from '@/utils/supabase/server';

async function sendClockInReminders() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Get all active employees
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, employment_type, fcm_token')
    .eq('is_active', true)
    .not('fcm_token', 'is', null);

  for (const employee of employees || []) {
    const shouldSend = await shouldSendNotification({
      employeeId: employee.id,
      employmentType: employee.employment_type,
      date: today
    }, 'morning');

    if (shouldSend && employee.fcm_token) {
      const reminderTime = await getReminderTime(employee.id, today, 'morning');
      
      // Send notification
      await sendPushNotification(employee.fcm_token, {
        title: '⏰ Nhắc nhở chấm công',
        body: `Đừng quên chấm công vào lúc ${reminderTime}!`,
        data: {
          type: 'clock_in_reminder',
          date: today
        }
      });
    }
  }
}
```

### Step 3: Vercel Cron Configuration

**Add to `vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summaries",
      "schedule": "30 17 * * *"
    },
    {
      "path": "/api/cron/clock-in-reminders",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/clock-out-reminders",
      "schedule": "30 10 * * *"
    }
  ]
}
```

**Note:** Schedule times are in UTC. Adjust for Vietnam timezone (UTC+7).

---

## 📊 Notification Matrix

| Employment Type | Working Day | Leave Type | Morning Reminder | Evening Reminder |
|-----------------|-------------|------------|------------------|------------------|
| Full-time | Mon-Fri | None | ✅ 08:15 | ✅ 17:45 |
| Full-time | Mon-Fri | Full day | ❌ | ❌ |
| Full-time | Mon-Fri | Half (AM) | ❌ | ✅ 17:45 |
| Full-time | Mon-Fri | Half (PM) | ✅ 08:15 | ❌ |
| Part-time | Morning shift | None | ✅ 08:15 | ❌ |
| Part-time | Evening shift | None | ❌ | ✅ 13:15 |
| Intern | Custom | None | ✅ (start-15m) | ✅ (end-15m) |
| Intern | Custom | Full day | ❌ | ❌ |

---

## 🧪 Testing

### Manual Test Script

```typescript
// Test notification logic
async function testNotifications() {
  const testCases = [
    {
      employeeId: 'xxx',
      date: '2026-02-10', // Monday
      expectedMorning: true,
      expectedEvening: true
    },
    {
      employeeId: 'yyy',
      date: '2026-02-10',
      leaveType: 'full_day',
      expectedMorning: false,
      expectedEvening: false
    }
  ];

  for (const testCase of testCases) {
    const shouldSendMorning = await shouldSendNotification({
      employeeId: testCase.employeeId,
      employmentType: 'full-time',
      date: testCase.date
    }, 'morning');

    console.assert(
      shouldSendMorning === testCase.expectedMorning,
      `Morning notification test failed for ${testCase.employeeId}`
    );
  }
}
```

---

## 🔐 Security Considerations

1. **Rate Limiting**: Giới hạn số lượng notifications per user per day
2. **Token Validation**: Verify FCM tokens before sending
3. **Privacy**: Không gửi sensitive data trong notification payload
4. **Opt-out**: Cho phép users tắt notifications

---

## 📈 Monitoring

### Metrics to Track

- Notification sent count
- Delivery success rate
- User engagement (open rate)
- Errors and failures

### Logging

```typescript
await supabase.from('notification_logs').insert({
  employee_id: employeeId,
  notification_type: 'clock_in_reminder',
  sent_at: new Date().toISOString(),
  delivered: true,
  opened: false
});
```

---

## 🚀 Future Enhancements

- [ ] Smart notifications (ML-based optimal reminder time)
- [ ] Multi-language support
- [ ] Custom reminder preferences per user
- [ ] Notification history in app
- [ ] Push notification analytics dashboard

---

**Status:** Documentation complete. Implementation ready when needed.  
**Estimated Implementation Time:** 2-3 hours  
**Dependencies:** Firebase Cloud Messaging (FCM), Vercel Cron
