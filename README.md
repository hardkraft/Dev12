# Zadanie Rekrutacyjne: URL Shortener

Witaj! Twoim zadaniem jest dokończenie implementacji niewielkiego, ale "produkcyjnego" mikroserwisu do skracania linków i zbierania analityki. Repozytorium zawiera podstawową konfigurację, a Twoim celem jest ożywienie logiki aplikacji.

## 📦 Tech-Stack

* **Język**: Node.js 20 LTS, TypeScript
* **Framework**: NestJS (z adapterem Fastify)
* **ORM**: Prisma
* **Baza Danych**: PostgreSQL 15 (uruchamiana przez Docker)

## 🚀 Uruchomienie projektu

Repozytorium jest gotowe do pracy. Aby uruchomić środowisko deweloperskie, wykonaj poniższe kroki.

**Wymagania:**
* Node.js v20
* pnpm (lub npm/yarn)
* Docker i Docker Compose

**Kroki:**
1.  Uruchom kontener z bazą danych:
    ```bash
    docker compose up -d
    ```
2.  Zainstaluj zależności, uruchom migracje i włącz aplikację w trybie deweloperskim:
    ```bash
    pnpm i && pnpm db:migrate && pnpm dev
    ```
Aplikacja będzie nasłuchiwać na porcie `3000`.

---

## 🎯 Twoje Zadanie: Implementacja MVP

Twoim głównym celem jest implementacja logiki dla trzech poniższych endpointów.

### 1. Tworzenie nowego skróconego linku

* **Endpoint**: `POST /links`
* **Request Body**:
    ```json
    {
      "url": "[https://bardzo-dlugi-adres-url.com/z/parametrami](https://bardzo-dlugi-adres-url.com/z/parametrami)",
      "slug?": "moj-wlasny-slug",
      "expiresAt?": "2025-12-31T23:59:59Z"
    }
    ```

* **Reguły do zaimplementowania**:
    * Pole `url` jest **wymagane** i musi być poprawnym adresem URL (http/https).
    * Pole `slug` jest **opcjonalne**. Jeśli nie zostanie podane, wygeneruj losowy, unikalny ciąg o długości co najmniej 6 znaków (a-z, A-Z, 0-9).
    * `slug` musi być **unikalny** w całej bazie danych. Próba dodania istniejącego sluga powinna zwrócić błąd.
    * Pole `expiresAt` jest **opcjonalne**.
    * *(Opcjonalnie)* Logika **idempotencji**: Jeśli żądanie zawiera nagłówek `Idempotency-Key` o tej samej wartości co poprzednie, zwróć ten sam zasób.

* **Odpowiedź (Sukces)**:
    * `201 Created`
    * Body: `{ "id": "...", "slug": "...", "url": "...", "createdAt": "...", "expiresAt": "..." }`

### 2. Przekierowanie na podstawie sluga

* **Endpoint**: `GET /:slug`

* **Reguły do zaimplementowania**:
    * Jeśli `slug` istnieje i link nie wygasł, wykonaj przekierowanie `302 Redirect` na docelowy `url`.
    * Przed przekierowaniem, **atomowo** zwiększ licznik `visits` dla tego linku o 1. Operacja musi być bezpieczna (bez "race conditions").
    * Jeśli `slug` nie istnieje, zwróć `404 Not Found`.
    * Jeśli link powiązany ze `slug` wygasł (data `expiresAt` jest w przeszłości), zwróć `410 Gone`.

### 3. Listowanie skróconych linków

* **Endpoint**: `GET /links`
* **Query Params**:
    * `limit` (np. 10)
    * `offset` (np. 0)
    * `search` (do filtrowania po `slug` lub `url`)

* **Odpowiedź (Sukces)**:
    * `200 OK`
    * Body:
        ```json
        {
          "items": [
            { "id": "...", "slug": "...", "url": "...", "visits": 123, ... },
            ...
          ],
          "total": 100,
          "limit": 10,
          "offset": 0
        }
        ```

---

## ✅ Wymagania jakościowe

Oprócz samej funkcjonalności, ocenie podlegać będą:
* **Model Danych**: Poprawnie zdefiniowany schemat w `prisma/schema.prisma` i wygenerowana migracja.
* **Walidacja**: Walidacja danych przychodzących (np. za pomocą DTO i `class-validator`).
* **Obsługa Błędów**: Poprawne mapowanie błędów na statusy HTTP (`400`, `404`, `409`, `410`).
* **Testy**: Napisanie co najmniej jednego testu jednostkowego i jednego testu e2e, aby potwierdzić działanie kluczowej logiki.
* **Czystość Kodu**: Struktura, czytelność i prostota kodu.

## 🌟 Stretch Goals (jeśli starczy czasu)

Jeśli zaimplementujesz MVP przed czasem, możesz spróbować swoich sił w jednym z poniższych zadań:
* Zaimplementuj obsługę nagłówka `Idempotency-Key` dla `POST /links`.
* Dodaj prosty rate-limiting na endpointy.
* Dodaj endpoint `GET /health` sprawdzający połączenie z bazą danych.
* Wygeneruj dokumentację API za pomocą Swaggera (OpenAPI).

Powodzenia!