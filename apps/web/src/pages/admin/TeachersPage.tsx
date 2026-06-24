import { UsersTable } from '@/components/users/UsersTable';

export function TeachersPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <UsersTable roleFilter="TEACHER" title="Nauczyciele" />
    </div>
  );
}
