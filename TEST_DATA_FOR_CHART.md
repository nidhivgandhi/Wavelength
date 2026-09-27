# Test Data for Chart Visualization

## The Issue
Your chart isn't showing because all 3 entries are from the same week (Sep 20, 2026). Line charts need data from multiple time periods to show trends.

## Quick Fix: Add Entries from Different Weeks

### Option 1: Add entries manually via the UI
Go to the Symptom Log and add entries with symptoms like:
- "I have a headache today" (will be dated today)
- Then change your system date or wait a week and add more entries

### Option 2: Modify existing entries in Supabase

If you're using Supabase, you can manually update the `created_at` dates:

1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Run this query to spread your entries across different weeks:

```sql
-- Get your user_id first
SELECT user_id, id, created_at, patient_input 
FROM symptoms 
ORDER BY created_at DESC 
LIMIT 10;

-- Then update the dates (replace YOUR_USER_ID with the actual UUID)
-- This spreads 3 entries across 3 different weeks

-- Entry 1: 3 weeks ago
UPDATE symptoms 
SET created_at = NOW() - INTERVAL '21 days'
WHERE id = 'ENTRY_ID_1';

-- Entry 2: 2 weeks ago  
UPDATE symptoms 
SET created_at = NOW() - INTERVAL '14 days'
WHERE id = 'ENTRY_ID_2';

-- Entry 3: 1 week ago
UPDATE symptoms 
SET created_at = NOW() - INTERVAL '7 days'
WHERE id = 'ENTRY_ID_3';
```

### Option 3: Add new test entries with specific dates

Add new entries through the UI, then update their dates:

```sql
-- Find the most recent entries
SELECT id, created_at, patient_input 
FROM symptoms 
WHERE patient_input LIKE '%headache%' OR patient_input LIKE '%pain%'
ORDER BY created_at DESC;

-- Update to create a timeline
UPDATE symptoms SET created_at = '2026-09-01 10:00:00' WHERE id = 'ID_1';
UPDATE symptoms SET created_at = '2026-09-08 11:00:00' WHERE id = 'ID_2';
UPDATE symptoms SET created_at = '2026-09-15 09:30:00' WHERE id = 'ID_3';
UPDATE symptoms SET created_at = '2026-09-22 14:00:00' WHERE id = 'ID_4';
```

## What You Should See After Adding Multi-Week Data

Once you have entries spanning multiple weeks:

1. **Recurring Words Section**: Shows symptoms that appear 2+ times
2. **Chart**: 
   - X-axis: Week dates (e.g., "Sep 1", "Sep 8", "Sep 15")
   - Y-axis: Frequency (how many times per week)
   - Multiple colored lines (one per symptom)
   - Interactive tooltips on hover
3. **Legend**: Shows which color represents which symptom

## Example Data Pattern

For a good chart visualization, create entries like:

**Week 1 (Sep 1-7)**:
- "headache and nausea"
- "headache again"

**Week 2 (Sep 8-14)**:
- "terrible headache"
- "leg pain"

**Week 3 (Sep 15-21)**:
- "headache is back"
- "nausea today"
- "leg pain continues"

**Week 4 (Sep 22-28)**:
- "headache"
- "nausea and leg pain"

This will create a chart with 3 lines showing how each symptom's frequency changes week by week.

## Current Debug Info

Based on your data:
- Entries: 3
- Symptoms: headache, leg, pain
- Time periods: 1 (all in same week)
- **Issue**: Need at least 2 time periods to draw a line

## Next Steps

1. Add entries from different weeks (or modify existing dates)
2. Refresh the Analysis page
3. The chart should now display with multiple data points
