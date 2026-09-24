-- Awards Maker, initial schema.
--
-- Re-running any migration must be safe, hence IF NOT EXISTS everywhere and no
-- destructive statements. Applied by scripts/migrate.mjs, which records each
-- file in `schema_migrations` and never runs it twice.
--
-- The shape follows app/types/award.ts, with three deliberate differences:
--   * a draft is an award row with status='draft' and a NULL slug, instead of a
--     separate store - that is what lets a host keep editing after publishing;
--   * the Nominee union becomes columns rather than JSON, because the ballot
--     joins against nominee ids and a JSON document cannot carry a foreign key;
--   * vote counts are not stored. They are a GROUP BY over ballot_picks, so a
--     tally can never drift from the ballots it claims to summarise.

CREATE TABLE IF NOT EXISTS users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  twitch_id       VARCHAR(64)  NOT NULL,
  login           VARCHAR(191) NOT NULL,
  display_name    VARCHAR(191) NOT NULL,
  email           VARCHAR(191) NULL,
  avatar          VARCHAR(512) NULL,
  role            ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_twitch (twitch_id),
  KEY ix_users_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The tokens Twitch handed us, and what they are good for. `scopes` matters:
-- a voter signs in with user:read:email alone, a host grants the full set, and
-- the difference is what decides whether someone may create a show.
CREATE TABLE IF NOT EXISTS social_accounts (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  provider         VARCHAR(32)  NOT NULL DEFAULT 'twitch',
  provider_user_id VARCHAR(191) NOT NULL,
  access_token     TEXT NULL,
  refresh_token    TEXT NULL,
  scopes           TEXT NULL,
  expires_at       DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- streamawards inherited a schema without this index and has to select-then-write
  -- on every sign-in, which races two simultaneous first logins into two rows.
  -- Greenfield here, so the upsert is safe.
  UNIQUE KEY uq_social_provider_user (provider, provider_user_id),
  KEY ix_social_user (user_id),
  CONSTRAINT fk_social_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS awards (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id      BIGINT UNSIGNED NOT NULL,
  slug          VARCHAR(80)  NULL,
  status        ENUM('draft','published') NOT NULL DEFAULT 'draft',
  tier          ENUM('free','paid')       NOT NULL DEFAULT 'free',
  name          VARCHAR(191) NOT NULL DEFAULT '',
  description   VARCHAR(500) NOT NULL DEFAULT '',
  template_id   VARCHAR(64)  NULL,
  opens_at      DATE NULL,
  closes_at     DATE NULL,
  ceremony_at   DATE NULL,
  -- theme, accent, font, coverUrl, logoUrl. Small, read as a whole, never joined.
  look          JSON NULL,
  -- the channel the show belongs to, as it read at publish time
  host_name     VARCHAR(191) NOT NULL DEFAULT '',
  host_platform ENUM('twitch','kick','youtube') NOT NULL DEFAULT 'twitch',
  -- set when the host closes voting and when the winners go public
  closed_at     DATETIME NULL,
  results_at    DATETIME NULL,
  published_at  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- NULL slugs are unconstrained in MySQL, which is what lets every host hold an
  -- unnamed draft while published slugs stay unique across the site.
  UNIQUE KEY uq_awards_slug (slug),
  KEY ix_awards_owner (owner_id, status),
  KEY ix_awards_catalog (status, closes_at),
  CONSTRAINT fk_awards_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nominations (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  award_id  BIGINT UNSIGNED NOT NULL,
  title     VARCHAR(191) NOT NULL DEFAULT '',
  position  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_nominations_award (award_id, position),
  CONSTRAINT fk_nominations_award FOREIGN KEY (award_id) REFERENCES awards (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The three nominee kinds share a table: a ballot pick points at one row whatever
-- kind it is, and a union across three tables would make every count a UNION too.
CREATE TABLE IF NOT EXISTS nominees (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nomination_id     BIGINT UNSIGNED NOT NULL,
  kind              ENUM('channel','text','media') NOT NULL,
  position          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  -- kind='channel'
  channel_name      VARCHAR(191) NULL,
  channel_platform  ENUM('twitch','kick','youtube') NULL,
  channel_followers INT UNSIGNED NULL,
  -- kind='text' and the caption of kind='media'
  text              VARCHAR(191) NULL,
  -- kind='media'
  media_url         VARCHAR(1024) NULL,
  -- a path under the uploads volume, never a data: URL. See server/utils/uploads.ts.
  image_path        VARCHAR(512) NULL,
  PRIMARY KEY (id),
  KEY ix_nominees_nomination (nomination_id, position),
  CONSTRAINT fk_nominees_nomination FOREIGN KEY (nomination_id) REFERENCES nominations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partners (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  award_id BIGINT UNSIGNED NOT NULL,
  name     VARCHAR(191) NOT NULL DEFAULT '',
  url      VARCHAR(512) NOT NULL DEFAULT '',
  position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_partners_award (award_id, position),
  CONSTRAINT fk_partners_award FOREIGN KEY (award_id) REFERENCES awards (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One ballot per person per show. The uniqueness is the point: until now "you
-- already voted" was "this browser has a localStorage key", which a new tab in
-- private mode defeats. Here it is a property of the database.
CREATE TABLE IF NOT EXISTS ballots (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  award_id     BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ballots_user_award (user_id, award_id),
  -- the daily series on the dashboard groups on this
  KEY ix_ballots_award_day (award_id, submitted_at),
  CONSTRAINT fk_ballots_award FOREIGN KEY (award_id) REFERENCES awards (id) ON DELETE CASCADE,
  CONSTRAINT fk_ballots_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ballot_picks (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ballot_id     BIGINT UNSIGNED NOT NULL,
  nomination_id BIGINT UNSIGNED NOT NULL,
  nominee_id    BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  -- one pick per category per ballot
  UNIQUE KEY uq_picks_ballot_nomination (ballot_id, nomination_id),
  KEY ix_picks_nominee (nominee_id),
  CONSTRAINT fk_picks_ballot FOREIGN KEY (ballot_id) REFERENCES ballots (id) ON DELETE CASCADE,
  CONSTRAINT fk_picks_nomination FOREIGN KEY (nomination_id) REFERENCES nominations (id) ON DELETE CASCADE,
  CONSTRAINT fk_picks_nominee FOREIGN KEY (nominee_id) REFERENCES nominees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ceremony_settings (
  award_id BIGINT UNSIGNED NOT NULL,
  stage    VARCHAR(64) NOT NULL DEFAULT '',
  font     VARCHAR(64) NOT NULL DEFAULT '',
  reveal   VARCHAR(32) NOT NULL DEFAULT 'cut',
  PRIMARY KEY (award_id),
  CONSTRAINT fk_ceremony_award FOREIGN KEY (award_id) REFERENCES awards (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  award_id   BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NULL,
  reason     VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_reports_award (award_id, created_at),
  CONSTRAINT fk_reports_award FOREIGN KEY (award_id) REFERENCES awards (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments. Stripe is the only provider today, but the column is there so a
-- second one does not need a migration - and so an admin comp shows up as an
-- order with provider='comp' rather than as a silent exception in the code.
CREATE TABLE IF NOT EXISTS orders (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  award_id     BIGINT UNSIGNED NULL,
  tier         ENUM('paid') NOT NULL DEFAULT 'paid',
  amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
  currency     CHAR(3) NOT NULL DEFAULT 'USD',
  status       ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  provider     VARCHAR(32) NOT NULL DEFAULT 'stripe',
  provider_ref VARCHAR(191) NULL,
  receipt_url  VARCHAR(512) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_provider_ref (provider, provider_ref),
  KEY ix_orders_user (user_id, created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_award FOREIGN KEY (award_id) REFERENCES awards (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every webhook we accepted, kept verbatim. When a payment is disputed months
-- later, the order row says what we believe and this says what Stripe told us.
CREATE TABLE IF NOT EXISTS payment_events (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id   BIGINT UNSIGNED NULL,
  provider   VARCHAR(32) NOT NULL DEFAULT 'stripe',
  event_id   VARCHAR(191) NULL,
  kind       VARCHAR(64) NOT NULL,
  payload    JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- a webhook delivered twice must not be applied twice
  UNIQUE KEY uq_payment_events_event (provider, event_id),
  KEY ix_payment_events_order (order_id),
  CONSTRAINT fk_payment_events_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
