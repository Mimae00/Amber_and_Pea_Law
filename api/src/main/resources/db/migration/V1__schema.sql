-- Amber & Pea Law (fictional sample firm) schema

CREATE TABLE practice_area (
    id           BIGSERIAL PRIMARY KEY,
    slug         VARCHAR(80)  NOT NULL,
    name         VARCHAR(120) NOT NULL,
    summary      VARCHAR(400) NOT NULL,
    description  TEXT         NOT NULL,
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT practice_area_slug_uk UNIQUE (slug),
    CONSTRAINT practice_area_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE attorney (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(80)  NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    title           VARCHAR(120) NOT NULL,
    short_bio       VARCHAR(400) NOT NULL,
    bio             TEXT         NOT NULL,
    photo_url       VARCHAR(500),
    education       TEXT,
    bar_admissions  TEXT,
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT attorney_slug_uk UNIQUE (slug)
);

CREATE TABLE attorney_practice_area (
    attorney_id       BIGINT NOT NULL REFERENCES attorney (id) ON DELETE CASCADE,
    practice_area_id  BIGINT NOT NULL REFERENCES practice_area (id) ON DELETE CASCADE,
    PRIMARY KEY (attorney_id, practice_area_id)
);

CREATE TABLE review (
    id                BIGSERIAL PRIMARY KEY,
    author_name       VARCHAR(120) NOT NULL,
    rating            SMALLINT     NOT NULL,
    content           TEXT         NOT NULL,
    practice_area_id  BIGINT REFERENCES practice_area (id) ON DELETE SET NULL,
    review_date       DATE         NOT NULL DEFAULT CURRENT_DATE,
    published         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT review_rating_range CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX review_published_date_idx ON review (published, review_date DESC);

CREATE TABLE lead (
    id                BIGSERIAL PRIMARY KEY,
    full_name         VARCHAR(120) NOT NULL,
    email             VARCHAR(254) NOT NULL,
    phone             VARCHAR(40),
    message           TEXT,
    practice_area_id  BIGINT REFERENCES practice_area (id) ON DELETE SET NULL,
    source            VARCHAR(30)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    consent           BOOLEAN      NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT lead_source_valid CHECK (source IN ('CONSULTATION_FORM', 'CONTACT_FORM', 'CHATBOT', 'BOOKING')),
    CONSTRAINT lead_status_valid CHECK (status IN ('NEW', 'CONTACTED', 'BOOKED', 'CLOSED')),
    CONSTRAINT lead_consent_required CHECK (consent)
);

CREATE INDEX lead_status_created_idx ON lead (status, created_at DESC);
CREATE INDEX lead_source_created_idx ON lead (source, created_at DESC);

CREATE TABLE booking (
    id          BIGSERIAL PRIMARY KEY,
    lead_id     BIGINT      NOT NULL REFERENCES lead (id) ON DELETE CASCADE,
    start_at    TIMESTAMPTZ NOT NULL,
    end_at      TIMESTAMPTZ NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'NEW',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT booking_status_valid CHECK (status IN ('NEW', 'CONTACTED', 'BOOKED', 'CLOSED', 'CANCELLED')),
    CONSTRAINT booking_time_order CHECK (end_at > start_at),
    -- No double booking: active bookings may not overlap. Enforced by the database.
    CONSTRAINT booking_no_overlap EXCLUDE USING gist (
        tstzrange(start_at, end_at, '[)') WITH &&
    ) WHERE (status <> 'CANCELLED')
);

CREATE INDEX booking_start_idx ON booking (start_at);
CREATE INDEX booking_lead_idx ON booking (lead_id);

CREATE TABLE admin_user (
    id             BIGSERIAL PRIMARY KEY,
    email          VARCHAR(254) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    display_name   VARCHAR(120) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT admin_user_email_uk UNIQUE (email)
);
