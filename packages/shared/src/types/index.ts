export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type ClassStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED';

export type MaterialType = 'PDF' | 'VIDEO' | 'AUDIO' | 'IMAGE' | 'LINK' | 'OTHER';

export type NotificationType =
  | 'CLASS_REMINDER'
  | 'PAYMENT_REMINDER'
  | 'CLASS_CANCELLED'
  | 'ATTENDANCE_ALERT'
  | 'GENERAL';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: { field: string; message: string }[];
}
