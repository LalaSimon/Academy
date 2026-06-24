import { UsersTable } from '@/components/users/UsersTable';

export function StudentsPage() {
  return (
    <UsersTable roleFilter="STUDENT" title="Uczniowie" />
  );
}
