# 🕐 Cron Jobs Documentation

**Last Updated:** 2026-02-07

---

## 📋 Overview

Hệ thống sử dụng cron jobs để tự động hóa các tác vụ theo lịch trình:

| Job Name | Schedule | Purpose | Endpoint |
|----------|----------|---------|----------|
| **Daily Work Summary** | Every day at 00:30 | Tính toán work summary cho ngày hôm trước | `/api/cron/daily-summaries` |
| **Recalculate Pending** | On-demand | Tính lại summaries khi leave được approve/reject | `/api/cron/daily-summaries?recalculate=true` |

---

## 🚀 Deployment

### Vercel Cron (Recommended)

Vercel tự động chạy cron jobs dựa trên `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summaries",
      "schedule": "30 17 * * *"
    }
  ]
}
```

**Schedule Format:** Cron expression (UTC timezone)
- `30 17 * * *` = 00:30 ICT (17:30 UTC, UTC+7)

**Verification:**
1. Deploy to Vercel
2. Check **Settings → Cron Jobs** in Vercel Dashboard
3. View execution logs

---

### Alternative: Node-cron (Self-hosted)

Nếu không dùng Vercel, dùng `node-cron` package:

```bash
npm install node-cron
```

**Create `server/cron.ts`:**
```typescript
import cron from 'node-cron';
import { calculateDailySummariesCron } from '@/lib/cron/calculate-daily-summaries';

// Run every day at 00:30
cron.schedule('30 0 * * *', async () => {
  console.log('Running daily summary calculation...');
  await calculateDailySummariesCron();
});
```

---

## 🔐 Security

### Cron Secret

Protect cron endpoints với secret key:

**1. Add to `.env.local`:**
```env
CRON_SECRET=your-very-secret-random-string-here
```

**2. Configure Vercel:**
- Go to **Settings → Environment Variables**
- Add `CRON_SECRET` với giá trị giống `.env.local`

**3. Test locally:**
```bash
curl -X POST http://localhost:3000/api/cron/daily-summaries \
  -H "Authorization: Bearer your-very-secret-random-string-here"
```

**⚠️ Important:** Không commit CRON_SECRET vào git!

---

## 📊 Monitoring

### Cron Logs Table

Tạo bảng `cron_logs` để tracking:

```sql
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'error'
  count INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cron_logs_job ON cron_logs(job_name);
CREATE INDEX idx_cron_logs_executed ON cron_logs(executed_at DESC);
```

### View Logs

```sql
-- Recent cron executions
SELECT job_name, status, count, duration_ms, executed_at
FROM cron_logs
ORDER BY executed_at DESC
LIMIT 10;

-- Failed cron jobs
SELECT *
FROM cron_logs
WHERE status = 'error'
ORDER BY executed_at DESC;
```

---

## 🧪 Manual Testing

### Test Daily Summary Calculation

**Via API:**
```bash
# Calculate for yesterday
curl -X POST http://localhost:3000/api/cron/daily-summaries \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"

# Recalculate pending summaries
curl -X POST http://localhost:3000/api/cron/daily-summaries \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json" \
  -d '{"recalculate": true}'
```

**Via Code:**
```typescript
import { manualTriggerDailySummaries } from '@/lib/cron/calculate-daily-summaries';

// Calculate for specific date
const result = await manualTriggerDailySummaries('2026-02-06');
console.log(result);
```

---

## 🔄 How It Works

### Daily Summary Calculation Flow

```
00:30 ICT (每夜)
    ↓
Vercel Cron triggers /api/cron/daily-summaries
    ↓
calculateDailySummariesCron()
    ↓
FOR each active employee:
    1. Get yesterday's date
    2. Fetch schedule for that day
    3. Fetch attendance (clock in/out)
    4. Fetch approved leaves
    5. Calculate:
       - clocked_hours
       - total_leave_hours
       - actual_working_hours = clocked - leave
       - payable_hours
    6. Upsert to daily_work_summary
    ↓
Log success/error to cron_logs
    ↓
Return count of calculated summaries
```

### Recalculation Trigger

```
Leave request approved/rejected
    ↓
Mark daily_work_summary.needs_recalculation = true
    ↓
Cron job (or manual trigger) runs
    ↓
Recalculate all summaries with needs_recalculation = true
    ↓
Set needs_recalculation = false
```

---

## ⚡ Performance

### Optimization Tips

1. **Batch Processing**: Process max 100 summaries per run
2. **Parallel Execution**: Use Promise.all for concurrent calculations
3. **Error Handling**: Continue if one employee fails, log error
4. **Timeout**: Set max execution time (Vercel: 10s for Hobby, 60s for Pro)

### Monitoring Metrics

- **Execution Time**: Should be < 10s for Hobby plan
- **Success Rate**: Aim for > 95%
- **Error Rate**: Monitor `cron_logs` for failures

---

## 📝 Troubleshooting

### Cron Job Not Running

**Check:**
1. ✅ `vercel.json` is in project root
2. ✅ Deployed to Vercel (cron only works in production)
3. ✅ Check Vercel Dashboard → **Deployments → Functions → Cron Jobs**
4. ✅ Timezone is correct (UTC vs ICT)

### Calculation Errors

**Common Issues:**
- Missing attendance data → Use fallback to scheduled hours
- Missing schedule template → Use company default config
- Leave duration calculation error → Check leave_type logic

**Debug:**
```typescript
// Check specific employee's summary
const summary = await WorkSummaryCalculator.calculateDailySummary(
  'employee-id-here',
  '2026-02-06'
);
console.log(summary);
```

---

## 🎯 Future Enhancements

- [ ] Send notifications when cron fails
- [ ] Dashboard to view cron execution history
- [ ] Slack/Discord webhook for alerts
- [ ] Retry mechanism for failed calculations
- [ ] Weekly/Monthly summary reports

---

**Last Updated:** 2026-02-07  
**Maintained by:** Development Team
