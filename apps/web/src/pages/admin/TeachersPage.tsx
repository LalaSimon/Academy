import { UsersTable } from '@/components/users/UsersTable';

export function TeachersPage() {
  return (
    <UsersTable roleFilter="TEACHER" title="Nauczyciele" />
  );
}
