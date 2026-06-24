import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
  note: string | null;
  markedAt: string;
  student: { id: string; firstName: string | null; lastName: string | null; email: string };
}

export interface AttendanceItem {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export interface StudentStats {
  overall: {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    attendanceRate: number;
  };
  byGroup: {
    group: { id: string; name: string; language: string | null; level: string | null };
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    attendanceRate: number;
  }[];
  history: {
    status: AttendanceStatus;
    markedAt: string;
    class: { id: string; title: string; scheduledAt: string; group: { id: string; name: string } };
  }[];
}

const ATTENDANCE_KEY = 'attendance';

export function useClassAttendance(classId: string) {
  return useQuery<AttendanceRecord[]>({
    queryKey: [ATTENDANCE_KEY, classId],
    queryFn: () => api.get<AttendanceRecord[]>('/attendance', { params: { classId } }).then((r) => r.data),
    enabled: !!classId,
  });
}

export function useBulkUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, items }: { classId: string; items: AttendanceItem[] }) =>
      api.patch<AttendanceRecord[]>('/attendance/bulk', { classId, items }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [ATTENDANCE_KEY, vars.classId] });
    },
  });
}

export function useStudentStats(studentId: string) {
  return useQuery<StudentStats>({
    queryKey: [ATTENDANCE_KEY, 'student', studentId],
    queryFn: () => api.get<StudentStats>(`/attendance/student/${studentId}`).then((r) => r.data),
    enabled: !!studentId,
  });
}
