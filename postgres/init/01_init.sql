-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    location    VARCHAR(500),
    city        VARCHAR(100),
    state       VARCHAR(100),
    pincode     VARCHAR(10),
    lat         DECIMAL(10, 8),
    lng         DECIMAL(11, 8),
    amenities   JSONB DEFAULT '[]',
    images      JSONB DEFAULT '[]',
    is_active   BOOLEAN DEFAULT TRUE,
    rera_number VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Towers
CREATE TABLE IF NOT EXISTS towers (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    total_floors INTEGER NOT NULL,
    svg_floor_plan TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Units
CREATE TABLE IF NOT EXISTS units (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tower_id       UUID REFERENCES towers(id) ON DELETE CASCADE,
    unit_number    VARCHAR(50) NOT NULL,
    floor_number   INTEGER NOT NULL,
    unit_type      VARCHAR(20),
    bedrooms       INTEGER,
    bathrooms      INTEGER,
    area_sqft      DECIMAL(10, 2),
    carpet_area    DECIMAL(10, 2),
    base_price     DECIMAL(15, 2),
    price_per_sqft DECIMAL(10, 2),
    down_payment   DECIMAL(15, 2),
    emi_estimate   DECIMAL(10, 2),
    facing         VARCHAR(20),
    status         VARCHAR(20) DEFAULT 'available',
    amenities      JSONB DEFAULT '[]',
    images         JSONB DEFAULT '[]',
    is_trending    BOOLEAN DEFAULT FALSE,
    view_count     INTEGER DEFAULT 0,
    embedding      vector(1536),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    phone         VARCHAR(20),
    password_hash VARCHAR(255),
    sf_contact_id VARCHAR(50),
    is_verified   BOOLEAN DEFAULT FALSE,
    is_active     BOOLEAN DEFAULT TRUE,
    preferences   JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Cart
CREATE TABLE IF NOT EXISTS cart_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    unit_id     UUID REFERENCES units(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, unit_id)
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id         UUID REFERENCES customers(id),
    unit_id             UUID REFERENCES units(id),
    booking_amount      DECIMAL(15, 2) NOT NULL,
    total_amount        DECIMAL(15, 2) NOT NULL,
    discount_amount     DECIMAL(15, 2) DEFAULT 0,
    status              VARCHAR(30) DEFAULT 'pending',
    payment_status      VARCHAR(20) DEFAULT 'unpaid',
    razorpay_order_id   VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    sf_opportunity_id   VARCHAR(50),
    notes               TEXT,
    booked_at           TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code           VARCHAR(50) UNIQUE NOT NULL,
    description    VARCHAR(500),
    discount_type  VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_amount     DECIMAL(15, 2) DEFAULT 0,
    max_discount   DECIMAL(15, 2),
    usage_limit    INTEGER,
    used_count     INTEGER DEFAULT 0,
    valid_from     TIMESTAMPTZ NOT NULL,
    valid_until    TIMESTAMPTZ NOT NULL,
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Search logs
CREATE TABLE IF NOT EXISTS search_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id   UUID REFERENCES customers(id),
    query         TEXT,
    filters       JSONB DEFAULT '{}',
    results_count INTEGER,
    session_id    VARCHAR(100),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_units_status    ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_type      ON units(unit_type);
CREATE INDEX IF NOT EXISTS idx_units_floor     ON units(floor_number);
CREATE INDEX IF NOT EXISTS idx_units_price     ON units(base_price);
CREATE INDEX IF NOT EXISTS idx_units_trending  ON units(is_trending) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_units_tower     ON units(tower_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- pgvector index
CREATE INDEX IF NOT EXISTS idx_units_embedding
    ON units USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Trigram index
CREATE INDEX IF NOT EXISTS idx_units_trgm
    ON units USING gin (unit_type gin_trgm_ops);
