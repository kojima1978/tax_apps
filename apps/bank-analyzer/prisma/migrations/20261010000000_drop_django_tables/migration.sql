-- 段階8: Django 自身の表（認証・管理画面・マイグレーション記録・セッション）を消す。
-- React 版はどれも使わず、Prisma のスキーマにも無い（migrate diff に毎回出ていた19文がこれ）。
-- analyzer_* からこれらへの外部キーは無いので、アプリの表には触れない。
-- 新しい DB（baseline から作った DB）にはもともと無いので IF EXISTS。
-- 切り戻しはこれ以降 Django 版のコードごと git から戻し、DB は消す前の pg_dump から入れ直す。
DROP TABLE IF EXISTS
  "django_admin_log",
  "auth_user_user_permissions",
  "auth_user_groups",
  "auth_group_permissions",
  "auth_permission",
  "auth_group",
  "auth_user",
  "django_content_type",
  "django_migrations",
  "django_session";
