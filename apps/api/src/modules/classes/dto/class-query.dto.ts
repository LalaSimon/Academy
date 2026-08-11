import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClassStatus } from '@prisma/client';

/** Współdzielone z `classes.service`, żeby DTO i serwis nie rozjechały się w czasie. */
export const MAX_CLASSES_PAGE_SIZE = 200;

export class ClassQueryDto {
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  /**
   * Filtr po nauczycielu. Dla roli TEACHER kontroler i tak nadpisuje tę wartość
   * własnym `req.user.id` — nauczyciel nie może podejrzeć cudzych zajęć.
   */
  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // `@Max` brakowało — `?limit=1000000` szło prosto do `take` i zwracało całą
  // tabelę zajęć razem z grupą, nauczycielem i uczniami. Pozostałe DTO listujące
  // miały ten limit od początku; tutaj było to przeoczenie, nie decyzja.
  //
  // 200, a nie 100 jak w pozostałych listach: widoki kalendarza i harmonogramu
  // (ClassesPage, TeacherClassesPage, TeacherDashboardPage) pobierają cały
  // miesiąc zajęć naraz i przy 100 gubiłyby połowę siatki. Sufit ma odciąć zrzut
  // całej tabeli, a nie narzucać stronicowanie tam, gdzie go nie ma.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CLASSES_PAGE_SIZE)
  limit?: number;
}
