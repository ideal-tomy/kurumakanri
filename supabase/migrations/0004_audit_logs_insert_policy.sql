-- 監査ログへの INSERT を認証済みスタッフに許可（writeAudit / Server Actions 用）

create policy audit_logs_staff_insert on public.audit_logs
  for insert to authenticated
  with check (public.is_active_staff());
