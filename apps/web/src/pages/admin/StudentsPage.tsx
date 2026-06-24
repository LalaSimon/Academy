import { UsersTable } from '@/components/users/UsersTable';

export function StudentsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <UsersTable roleFilter="STUDENT" title="Uczniowie" />
    </div>
  );
}
