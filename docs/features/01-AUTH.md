# Feature: Autoryzacja i uwierzytelnianie

## Wymagania

- Logowanie emailem i hasłem
- Role: ADMIN, TEACHER, STUDENT, PARENT
- JWT Access Token (15 min) + Refresh Token (7 dni, httpOnly cookie)
- Reset hasła przez email
- Admin tworzy konta dla nauczycieli i uczniów (brak publicznej rejestracji)
- Opcjonalnie: pierwsze logowanie wymaga zmiany hasła (tymczasowe hasło od admina)

## Flow logowania

```
1. POST /auth/login { email, password }
2. Weryfikacja hasła (Argon2)
3. Generacja accessToken (JWT, 15min) + refreshToken (losowy, DB, 7dni)
4. Response: { accessToken } + Set-Cookie: refreshToken (httpOnly)
5. Frontend trzyma accessToken w pamięci (nie localStorage!)
6. Przy wygaśnięciu: POST /auth/refresh → nowy accessToken
```

## Bezpieczeństwo

- Hasła: Argon2id
- Rate limiting: 5 prób/min na `/auth/login`
- Refresh token: rotacja przy każdym użyciu (token rotation)
- Logout: unieważnienie refresh tokena w DB

## Do zrobienia

- [ ] Moduł `auth` w NestJS
- [ ] Strategia JWT (Passport.js)
- [ ] Guard `@UseGuards(JwtAuthGuard, RolesGuard)` + decorator `@Roles()`
- [ ] Endpoint reset hasła + szablon email
- [ ] Strona logowania w React
- [ ] Hook `useAuth` + AuthContext / Zustand store
- [ ] Interceptor axios do automatycznego refresha tokena
- [ ] Ochrona routingu (PrivateRoute component)
