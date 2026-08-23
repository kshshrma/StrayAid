# Fixing Supabase / PostgreSQL User Deletion Error

If you attempt to delete a user from the Supabase Auth panel or via the Admin API and encounter the error:
`Failed to delete user: Database error deleting user`

This is caused by **Foreign Key Referential Integrity Constraints** in PostgreSQL. The `profiles`, `guardians`, and `rescue_assignments` tables have foreign keys referencing the user's ID, but they lack the `ON DELETE CASCADE` instruction. When Supabase attempts to delete the user, the database blocks it to prevent orphan rows.

---

## The Solution

You need to drop the existing foreign key constraints on the public tables and recreate them with `ON DELETE CASCADE` (or `ON DELETE SET NULL` for reports so reported incidents are not deleted).

### SQL Migration Script

Run the following SQL script directly in the **Supabase Dashboard SQL Editor**:

```sql
-- 1. profiles table (references auth.users)
-- Ensures deleting a user automatically deletes their profile details
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- 2. guardians table (references public.profiles)
-- Ensures deleting a profile automatically deletes their Guardian profile
ALTER TABLE public.guardians
  DROP CONSTRAINT IF EXISTS guardians_user_id_fkey,
  ADD CONSTRAINT guardians_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 3. rescue_assignments table (references public.guardians)
-- Ensures deleting a Guardian automatically deletes their rescue history logs
ALTER TABLE public.rescue_assignments
  DROP CONSTRAINT IF EXISTS rescue_assignments_guardian_id_fkey,
  ADD CONSTRAINT rescue_assignments_guardian_id_fkey 
    FOREIGN KEY (guardian_id) 
    REFERENCES public.guardians(id) 
    ON DELETE CASCADE;

-- 4. reports table (references public.guardians)
-- IMPORTANT: When a Guardian profile is deleted, we do NOT want to delete 
-- the reported incidents themselves. We set the assigned_guardian_id to NULL 
-- so they can be re-dispatched.
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_assigned_guardian_id_fkey,
  ADD CONSTRAINT reports_assigned_guardian_id_fkey 
    FOREIGN KEY (assigned_guardian_id) 
    REFERENCES public.guardians(id) 
    ON DELETE SET NULL;
```

---

## Instructions

1. Open your **Supabase Dashboard** for the StrayAid project.
2. Click on **SQL Editor** in the left sidebar navigation.
3. Click **New Query** to create a blank editor tab.
4. Copy the SQL script above and paste it into the editor.
5. Click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`).
6. You will see `Success. No rows returned`.

Once run, you will be able to delete users from Supabase cleanly!
