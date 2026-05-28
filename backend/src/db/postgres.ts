import { Pool } from "pg";
import type { QueryResultRow } from "pg";
import type {
  Session,
  Recommendation,
  PersonalColorResult,
  UserPreferences,
  User,
  RefreshToken,
  Product,
  ProductCategory,
  PersonalColorType,
  Content,
  ContentCategory,
  ContentStatus,
} from "../types";

type QueryParameters = ReadonlyArray<unknown>;

interface DatabaseError extends Error {
  detail?: string;
  hint?: string;
  code?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string | null;
  instagram_id: string | null;
  email_verified: boolean;
  verification_token: string | null;
  verification_token_expires: Date | null;
  reset_password_token: string | null;
  reset_password_expires: Date | null;
  role: string;
  last_login_at: Date | null;
  has_personal_color_diagnosis?: boolean | null;
  personal_color_result?: unknown;
  diagnosed_at?: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

interface ProductRow extends QueryResultRow {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  image_url?: string | null;
  thumbnail_url?: string | null;
  additional_images?: string[] | null;
  detail_image_urls?: string[] | null;
  personal_colors?: PersonalColorType[] | string[] | null;
  description?: string | null;
  product_link?: string | null;
  shopee_link?: string | null;
  is_available?: boolean | null;
  is_active?: boolean | null;
  created_at: Date;
  updated_at: Date;
}

interface ContentRow extends QueryResultRow {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  thumbnail_url: string | null;
  content: string;
  excerpt: string | null;
  category: ContentCategory;
  tags: string[] | null;
  status: ContentStatus;
  published_at: Date | null;
  meta_description: string | null;
  meta_keywords: string | null;
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

interface DbQueryResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

type RowRecord = QueryResultRow;

type SSLConfig =
  | false
  | {
      rejectUnauthorized: boolean;
      require?: boolean;
    };

// Secure SSL configuration for database connections
const getSSLConfig = (): SSLConfig => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return false; // No SSL for development without DATABASE_URL
  }

  // Explicit escape hatch for self-hosted Postgres without SSL
  // (e.g. local docker-compose, Mac mini, Tailnet internal DB)
  if (
    process.env.DB_SSL_DISABLE === "true" ||
    /[?&]sslmode=disable\b/.test(databaseUrl)
  ) {
    return false;
  }

  // Production SSL configuration
  if (process.env.NODE_ENV === "production") {
    // More secure SSL configuration
    if (
      databaseUrl.includes("render.com") ||
      databaseUrl.includes("railway.app") ||
      databaseUrl.includes("dpg-")
    ) {
      // Render internal database URLs
      // Some cloud providers require specific SSL handling
      return {
        rejectUnauthorized: false, // Only for specific cloud providers
      };
    } else {
      // Default secure SSL configuration
      return {
        rejectUnauthorized: true,
        require: true,
      };
    }
  }

  // Development - if connecting to a remote database, use SSL
  if (
    databaseUrl.includes("render.com") ||
    databaseUrl.includes("railway.app") ||
    databaseUrl.includes("dpg-")
  ) {
    // Render internal database URLs
    return {
      rejectUnauthorized: false, // Allow self-signed certificates in dev
    };
  }

  return false;
};

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSSLConfig(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export class PostgresDatabase {
  private schemaChecks = {
    verificationTokenExpiry: false,
    refreshTokenIdDefault: false,
    userRoleColumn: false,
    userLastLoginAtColumn: false,
    adminActionsTable: false,
    userDiagnosisColumns: false,
    userSavedViewedTables: false,
  };
  // Test database connection
  async testConnection(): Promise<boolean> {
    try {
      // Add connection retry logic for Render deployment
      let retries = 3;
      let lastError;

      while (retries > 0) {
        try {
          const result = await pool.query("SELECT NOW()");
          console.info("Database connected at:", result.rows[0].now);
          return true;
        } catch (err) {
          lastError = err;
          retries--;
          if (retries > 0) {
            console.log(
              `Database connection attempt failed, retrying... (${retries} attempts left)`,
            );
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
          }
        }
      }

      throw lastError;
    } catch (error) {
      console.error("Database connection failed:", error);
      return false;
    }
  }

  // Initialize database schema
  async initialize(): Promise<void> {
    try {
      console.info("[Database] Initializing schema (IF NOT EXISTS)...");

      // 1. Timestamp trigger function
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // 2. Users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          instagram_id VARCHAR(30),
          email_verified BOOLEAN DEFAULT FALSE,
          verification_token VARCHAR(255),
          verification_token_expires TIMESTAMPTZ,
          reset_password_token VARCHAR(255),
          reset_password_expires TIMESTAMP WITH TIME ZONE,
          role VARCHAR(32) NOT NULL DEFAULT 'user',
          last_login_at TIMESTAMPTZ,
          has_personal_color_diagnosis BOOLEAN DEFAULT FALSE,
          personal_color_result JSONB,
          diagnosed_at TIMESTAMPTZ,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_users_instagram_id ON users(instagram_id)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
      );

      // 3. Sessions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id VARCHAR(50) PRIMARY KEY,
          instagram_id VARCHAR(30),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          uploaded_image_url TEXT,
          analysis_result JSONB,
          journey_status VARCHAR(50),
          priority VARCHAR(20),
          offer_sent_at TIMESTAMPTZ,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_sessions_instagram_id ON sessions(instagram_id)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC)`,
      );

      // 4. Recommendations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS recommendations (
          id VARCHAR(50) PRIMARY KEY,
          session_id VARCHAR(50) REFERENCES sessions(id) ON DELETE CASCADE,
          instagram_id VARCHAR(30) NOT NULL,
          personal_color_result JSONB,
          user_preferences JSONB,
          uploaded_image_url TEXT,
          product_ids TEXT[] NOT NULL DEFAULT '{}',
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          dm_sent_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_recommendations_session_id ON recommendations(session_id)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_recommendations_instagram_id ON recommendations(instagram_id)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC)`,
      );

      // 5. Refresh tokens table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(500) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)`,
      );

      // 6. Products table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL,
          price INTEGER NOT NULL,
          thumbnail_url TEXT NOT NULL,
          detail_image_urls TEXT[] DEFAULT '{}',
          personal_colors TEXT[] NOT NULL,
          description TEXT,
          shopee_link TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)`,
      );

      // 7. Contents table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contents (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          subtitle VARCHAR(255),
          slug VARCHAR(255) UNIQUE NOT NULL,
          thumbnail_url TEXT NOT NULL,
          content TEXT NOT NULL,
          excerpt TEXT,
          category VARCHAR(50) NOT NULL,
          tags TEXT[] DEFAULT '{}',
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          published_at TIMESTAMP WITH TIME ZONE,
          meta_description TEXT,
          meta_keywords TEXT,
          view_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_contents_slug ON contents(slug)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_contents_category ON contents(category)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_contents_published_at ON contents(published_at DESC)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_contents_view_count ON contents(view_count DESC)`,
      );

      // 8. Message history table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS message_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id VARCHAR(50),
          message_type TEXT NOT NULL,
          sent_by TEXT NOT NULL DEFAULT 'admin',
          sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_message_history_session_id ON message_history(session_id)`,
      );

      // 9. Admin actions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id VARCHAR(50),
          action_type TEXT NOT NULL,
          action_details JSONB,
          performed_by TEXT NOT NULL,
          performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_admin_actions_performed_at ON admin_actions(performed_at DESC)`,
      );

      // 10. Create triggers (drop first to avoid duplicates)
      const triggers = [
        { name: "update_users_updated_at", table: "users" },
        { name: "update_sessions_updated_at", table: "sessions" },
        { name: "update_recommendations_updated_at", table: "recommendations" },
        { name: "update_products_updated_at", table: "products" },
        { name: "update_contents_updated_at", table: "contents" },
      ];
      for (const t of triggers) {
        await pool.query(`DROP TRIGGER IF EXISTS ${t.name} ON ${t.table}`);
        await pool.query(`
          CREATE TRIGGER ${t.name} BEFORE UPDATE ON ${t.table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
      }

      console.info("✅ [Database] Schema initialization complete");
    } catch (error) {
      console.error("Failed to initialize database schema:", error);
      throw error;
    }
  }

  // Generic query method for token cleanup service
  async query<Row extends QueryResultRow = RowRecord>(
    text: string,
    params: QueryParameters = [],
  ): Promise<DbQueryResult<Row>> {
    try {
      const result = await pool.query<Row>(text, [...params]);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
      };
    } catch (error) {
      console.error("Database query failed:", error);
      throw error;
    }
  }

  // Sessions
  async createSession(
    instagramId: string | null,
    userId?: string,
  ): Promise<Session> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO sessions (id, instagram_id, user_id)
      VALUES ($1, $2, $3)
      RETURNING id, instagram_id, user_id, created_at
    `;

    const result = await pool.query(query, [
      sessionId,
      instagramId || null,
      userId || null,
    ]);
    return {
      id: result.rows[0].id,
      instagramId: result.rows[0].instagram_id || undefined,
      userId: result.rows[0].user_id,
      createdAt: result.rows[0].created_at,
    };
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const query = `
      SELECT id, instagram_id, user_id, uploaded_image_url, analysis_result,
             created_at, updated_at
      FROM sessions
      WHERE id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    let analysisResult: PersonalColorResult | undefined;

    if (row.analysis_result) {
      if (typeof row.analysis_result === "string") {
        analysisResult = JSON.parse(row.analysis_result);
      } else {
        analysisResult = row.analysis_result as PersonalColorResult;
      }
    }

    return {
      id: row.id,
      instagramId: row.instagram_id,
      userId: row.user_id ?? undefined,
      uploadedImageUrl: row.uploaded_image_url,
      analysisResult,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAllSessions(): Promise<Session[]> {
    const query = `
      SELECT id, instagram_id, uploaded_image_url, analysis_result, created_at, updated_at
      FROM sessions
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    return result.rows.map((row) => {
      let analysisResult: PersonalColorResult | undefined;

      if (row.analysis_result) {
        if (typeof row.analysis_result === "string") {
          analysisResult = JSON.parse(row.analysis_result);
        } else {
          analysisResult = row.analysis_result as PersonalColorResult;
        }
      }

      return {
        id: row.id,
        instagramId: row.instagram_id,
        uploadedImageUrl: row.uploaded_image_url,
        analysisResult,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  }

  async updateSession(
    sessionId: string,
    updateData: {
      uploadedImageUrl?: string;
      analysisResult?: PersonalColorResult;
    },
  ): Promise<Session | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updateData.uploadedImageUrl !== undefined) {
      fields.push(`uploaded_image_url = $${paramIndex++}`);
      values.push(updateData.uploadedImageUrl);
    }

    if (updateData.analysisResult !== undefined) {
      fields.push(`analysis_result = $${paramIndex++}`);
      values.push(JSON.stringify(updateData.analysisResult));
    }

    if (fields.length === 0) {
      // No fields to update, return the existing session
      return this.getSession(sessionId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(sessionId);

    const query = `
      UPDATE sessions
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, instagram_id, uploaded_image_url, analysis_result, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    let analysisResult: PersonalColorResult | undefined;

    if (row.analysis_result) {
      if (typeof row.analysis_result === "string") {
        analysisResult = JSON.parse(row.analysis_result);
      } else {
        analysisResult = row.analysis_result as PersonalColorResult;
      }
    }

    return {
      id: row.id,
      instagramId: row.instagram_id,
      uploadedImageUrl: row.uploaded_image_url,
      analysisResult,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query("BEGIN");

      // First, delete all recommendations associated with this session
      const deleteRecommendationsQuery = `
        DELETE FROM recommendations
        WHERE session_id = $1
      `;
      await client.query(deleteRecommendationsQuery, [sessionId]);

      // Then, delete the session itself
      const deleteSessionQuery = `
        DELETE FROM sessions
        WHERE id = $1
        RETURNING id
      `;
      const result = await client.query(deleteSessionQuery, [sessionId]);

      // Commit transaction
      await client.query("COMMIT");

      // Return true if a session was deleted, false otherwise
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      // Rollback transaction on error
      await client.query("ROLLBACK");
      console.error("Error deleting session:", error);
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  }

  // Recommendations
  async createRecommendation(
    data: Omit<Recommendation, "id" | "createdAt" | "updatedAt">,
  ): Promise<Recommendation> {
    const recommendationId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO recommendations
      (id, session_id, instagram_id, personal_color_result, user_preferences, uploaded_image_url, product_ids, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(query, [
      recommendationId,
      data.sessionId,
      data.instagramId,
      JSON.stringify(data.personalColorResult),
      JSON.stringify(data.userPreferences),
      data.uploadedImageUrl || null,
      data.productIds ?? [],
      data.status || "pending",
    ]);

    return this.mapRecommendationRow(result.rows[0]);
  }

  async getRecommendation(
    recommendationId: string,
  ): Promise<Recommendation | undefined> {
    const query = `
      SELECT * FROM recommendations
      WHERE id = $1
    `;

    const result = await pool.query(query, [recommendationId]);

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapRecommendationRow(result.rows[0]);
  }

  async updateRecommendationStatus(
    recommendationId: string,
    status: Recommendation["status"],
  ): Promise<Recommendation | undefined> {
    // When the status flips to `completed`, stamp completed_at exactly once.
    // Explicit ::text casts avoid Postgres "inconsistent types for parameter
    // $1" (42P08): the same param is used as varchar (SET status = $1) and
    // text literal compare (CASE WHEN $1 = 'completed').
    const query = `
      UPDATE recommendations
      SET status = $1::text,
          completed_at = CASE
            WHEN $1::text = 'completed' AND completed_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE completed_at
          END
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, recommendationId]);

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapRecommendationRow(result.rows[0]);
  }

  async updateRecommendationProductIds(
    recommendationId: string,
    productIds: string[],
  ): Promise<Recommendation | undefined> {
    const query = `
      UPDATE recommendations
      SET product_ids = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [productIds, recommendationId]);

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapRecommendationRow(result.rows[0]);
  }

  async getAllRecommendations(): Promise<Recommendation[]> {
    const query = `
      SELECT * FROM recommendations
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => this.mapRecommendationRow(row));
  }

  async getRecommendationsByStatus(
    status: Recommendation["status"],
  ): Promise<Recommendation[]> {
    const query = `
      SELECT * FROM recommendations
      WHERE status = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [status]);
    return result.rows.map((row) => this.mapRecommendationRow(row));
  }

  // Helper method to map database row to Recommendation type
  private mapRecommendationRow(row: {
    id: string;
    session_id: string;
    instagram_id: string;
    personal_color_result: unknown;
    user_preferences: unknown;
    uploaded_image_url?: string;
    product_ids?: string[] | null;
    status: string;
    completed_at?: Date | null;
    created_at: Date;
    updated_at: Date;
  }): Recommendation {
    // Parse JSON data if it's returned as a string
    let personalColorResult: PersonalColorResult;
    let userPreferences: UserPreferences;

    if (typeof row.personal_color_result === "string") {
      personalColorResult = JSON.parse(row.personal_color_result);
    } else {
      personalColorResult = row.personal_color_result as PersonalColorResult;
    }

    if (typeof row.user_preferences === "string") {
      userPreferences = JSON.parse(row.user_preferences);
    } else {
      userPreferences = row.user_preferences as UserPreferences;
    }

    return {
      id: row.id,
      sessionId: row.session_id,
      instagramId: row.instagram_id,
      personalColorResult,
      userPreferences,
      uploadedImageUrl: row.uploaded_image_url,
      productIds: Array.isArray(row.product_ids) ? row.product_ids : [],
      status: row.status as Recommendation["status"],
      completedAt: row.completed_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Close database connection
  async close(): Promise<void> {
    await pool.end();
  }

  // Admin Features - Journey Status and Priority Management
  async updateJourneyStatus(
    sessionId: string,
    status: string,
  ): Promise<boolean> {
    const query = `
      UPDATE sessions 
      SET journey_status = $1, updated_at = NOW()
      WHERE id = $2
    `;

    try {
      const result = await pool.query(query, [status, sessionId]);

      // If status is 'offer_sent', update offer_sent_at
      if (status === "offer_sent" && result.rowCount && result.rowCount > 0) {
        await pool.query(
          "UPDATE sessions SET offer_sent_at = NOW() WHERE id = $1",
          [sessionId],
        );
      }

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Failed to update journey status:", error);
      return false;
    }
  }

  async updatePriority(sessionId: string, priority: string): Promise<boolean> {
    const query = `
      UPDATE sessions 
      SET priority = $1, updated_at = NOW()
      WHERE id = $2
    `;

    try {
      const result = await pool.query(query, [priority, sessionId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Failed to update priority:", error);
      return false;
    }
  }

  async recordMessageSent(
    sessionId: string,
    messageType: string,
    sentBy: string = "admin",
  ): Promise<boolean> {
    const query = `
      INSERT INTO message_history (session_id, message_type, sent_by)
      VALUES ($1, $2, $3)
    `;

    try {
      await pool.query(query, [sessionId, messageType, sentBy]);
      return true;
    } catch (error) {
      console.error("Failed to record message sent:", error);
      return false;
    }
  }

  async addAdminAction(
    sessionId: string | null,
    actionType: string,
    actionDetails: unknown,
    performedBy: string = "admin",
  ): Promise<boolean> {
    await this.ensureAdminActionsTable();
    const query = `
      INSERT INTO admin_actions (session_id, action_type, action_details, performed_by)
      VALUES ($1, $2, $3, $4)
    `;

    try {
      await pool.query(query, [
        sessionId,
        actionType,
        JSON.stringify(actionDetails),
        performedBy,
      ]);
      return true;
    } catch (error) {
      console.error("Failed to add admin action:", error);
      return false;
    }
  }

  async getAdminActions(sessionId?: string): Promise<RowRecord[]> {
    const query = `
      SELECT * FROM admin_actions
      ${sessionId ? "WHERE session_id = $1" : ""}
      ORDER BY performed_at DESC
    `;

    try {
      const result = sessionId
        ? await pool.query(query, [sessionId])
        : await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("Failed to get admin actions:", error);
      return [];
    }
  }

  async getMessageHistory(sessionId: string): Promise<RowRecord[]> {
    const query = `
      SELECT * FROM message_history
      WHERE session_id = $1
      ORDER BY sent_at DESC
    `;

    try {
      const result = await pool.query(query, [sessionId]);
      return result.rows;
    } catch (error) {
      console.error("Failed to get message history:", error);
      return [];
    }
  }

  // Get unified user view for admin dashboard
  async getUnifiedUserView(): Promise<RowRecord[]> {
    const query = `
      SELECT 
        s.id,
        s.instagram_id,
        s.journey_status,
        s.priority,
        s.created_at as registered_at,
        s.updated_at as last_active_at,
        s.analysis_result,
        s.offer_sent_at,
        r.id as recommendation_id,
        r.status as recommendation_status,
        r.created_at as recommendation_requested_at,
        r.updated_at as recommendation_updated_at,
        CASE 
          WHEN s.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN true
          ELSE false
        END as is_new_user,
        EXTRACT(days FROM (CURRENT_TIMESTAMP - s.updated_at)) as days_since_last_activity
      FROM sessions s
      LEFT JOIN recommendations r ON s.id = r.session_id
      ORDER BY s.updated_at DESC
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("Failed to get unified user view:", error);
      return [];
    }
  }

  // User methods
  async createUser(
    data: Omit<User, "id" | "createdAt" | "updatedAt">,
  ): Promise<User> {
    // Ensure required user columns exist in case the database predates recent schema
    await this.ensureVerificationTokenExpiryColumn();
    await this.ensureUserRoleAndLastLoginColumns();
    await this.ensureUserDiagnosisColumns();

    const query = `
      INSERT INTO users (
        email,
        password_hash,
        full_name,
        instagram_id,
        email_verified,
        verification_token,
        verification_token_expires,
        role,
        last_login_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      data.email,
      data.passwordHash,
      data.fullName,
      data.instagramId || null,
      data.emailVerified || false,
      data.verificationToken || null,
      data.verificationTokenExpires || null,
      data.role || "user",
      data.lastLoginAt || null,
    ]);

    return this.mapUserRow(result.rows[0]);
  }

  async getUserById(userId: string): Promise<User | undefined> {
    await this.ensureUserDiagnosisColumns();
    const query = `SELECT * FROM users WHERE id = $1`;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapUserRow(result.rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureUserDiagnosisColumns();
    // 이메일 비교는 대소문자를 구분하지 않으며,
    // Gmail의 로컬파트 점(.) 유무 차이로 인한 불일치를 허용한다.
    //  - 기본: LOWER(email) = LOWER($1)
    //  - 추가: gmail.com / googlemail.com의 경우 점 제거 후 비교
    const query = `
      SELECT *
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR (
              (
                LOWER(email) LIKE '%@gmail.com' OR
                LOWER(email) LIKE '%@googlemail.com'
              )
              AND REPLACE(LOWER(email), '.', '') = REPLACE(LOWER($1), '.', '')
            )
      LIMIT 1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapUserRow(result.rows[0]);
  }

  // List users with optional filters + pagination
  async getAllUsers(filters?: {
    search?: string;
    role?: string;
    emailVerified?: boolean;
    offset?: number;
    limit?: number;
  }): Promise<User[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (filters?.search) {
      where.push(
        `(LOWER(email) LIKE $${idx} OR LOWER(full_name) LIKE $${idx})`,
      );
      values.push(`%${filters.search.toLowerCase()}%`);
      idx++;
    }
    if (filters?.role) {
      where.push(`role = $${idx}`);
      values.push(filters.role);
      idx++;
    }
    if (typeof filters?.emailVerified === "boolean") {
      where.push(`email_verified = $${idx}`);
      values.push(filters.emailVerified);
      idx++;
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit =
      typeof filters?.limit === "number"
        ? Math.max(1, Math.min(100, filters!.limit))
        : 20;
    const offset =
      typeof filters?.offset === "number" ? Math.max(0, filters!.offset) : 0;
    const query = `
      SELECT * FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const result = await pool.query<UserRow>(query, values);
    return result.rows.map((row) => this.mapUserRow(row));
  }

  async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    await this.ensureVerificationTokenExpiryColumn();
    await this.ensureUserRoleAndLastLoginColumns();
    await this.ensureUserDiagnosisColumns();

    const updateFields: string[] = [];
    const values: unknown[] = [];
    let valueIndex = 1;

    if (updates.email !== undefined) {
      updateFields.push(`email = $${valueIndex++}`);
      values.push(updates.email);
    }
    if (updates.passwordHash !== undefined) {
      updateFields.push(`password_hash = $${valueIndex++}`);
      values.push(updates.passwordHash);
    }
    if (updates.fullName !== undefined) {
      updateFields.push(`full_name = $${valueIndex++}`);
      values.push(updates.fullName);
    }
    if (updates.instagramId !== undefined) {
      updateFields.push(`instagram_id = $${valueIndex++}`);
      values.push(updates.instagramId);
    }
    if (updates.emailVerified !== undefined) {
      updateFields.push(`email_verified = $${valueIndex++}`);
      values.push(updates.emailVerified);
    }
    if (updates.verificationToken !== undefined) {
      updateFields.push(`verification_token = $${valueIndex++}`);
      values.push(updates.verificationToken);
    }
    if (updates.verificationTokenExpires !== undefined) {
      updateFields.push(`verification_token_expires = $${valueIndex++}`);
      values.push(updates.verificationTokenExpires);
    }
    if (updates.resetPasswordToken !== undefined) {
      updateFields.push(`reset_password_token = $${valueIndex++}`);
      values.push(updates.resetPasswordToken);
    }
    if (updates.resetPasswordExpires !== undefined) {
      updateFields.push(`reset_password_expires = $${valueIndex++}`);
      values.push(updates.resetPasswordExpires);
    }
    if (updates.role !== undefined) {
      updateFields.push(`role = $${valueIndex++}`);
      values.push(updates.role);
    }
    if (updates.lastLoginAt !== undefined) {
      updateFields.push(`last_login_at = $${valueIndex++}`);
      values.push(updates.lastLoginAt);
    }
    if (updates.hasPersonalColorDiagnosis !== undefined) {
      updateFields.push(`has_personal_color_diagnosis = $${valueIndex++}`);
      values.push(updates.hasPersonalColorDiagnosis);
    }
    if (updates.personalColorResult !== undefined) {
      updateFields.push(`personal_color_result = $${valueIndex++}`);
      values.push(JSON.stringify(updates.personalColorResult));
    }
    if (updates.diagnosedAt !== undefined) {
      updateFields.push(`diagnosed_at = $${valueIndex++}`);
      values.push(updates.diagnosedAt);
    }

    if (updateFields.length === 0) {
      return this.getUserById(userId);
    }

    values.push(userId);
    const query = `
      UPDATE users 
      SET ${updateFields.join(", ")}, updated_at = NOW()
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapUserRow(result.rows[0]);
  }

  // Saved/View history methods
  private async ensureUserSavedViewedTables(): Promise<void> {
    // Create supporting tables once per process
    if (this.schemaChecks.userSavedViewedTables) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_saved_products (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id TEXT NOT NULL,
          saved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, product_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_saved_products_user ON user_saved_products(user_id);
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_viewed_products (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id TEXT NOT NULL,
          viewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, product_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_viewed_products_user ON user_viewed_products(user_id);
      `);

      this.schemaChecks.userSavedViewedTables = true;
    } catch (e) {
      console.error("Failed to ensure user saved/viewed tables:", e);
    }
  }

  async getUserSavedProducts(
    userId: string,
  ): Promise<Array<{ productId: string; savedAt: Date }>> {
    await this.ensureUserSavedViewedTables();
    const q = `SELECT product_id, saved_at FROM user_saved_products WHERE user_id = $1 ORDER BY saved_at DESC`;
    const result = await pool.query(q, [userId]);
    return result.rows.map((r) => ({
      productId: r.product_id as string,
      savedAt: r.saved_at as Date,
    }));
  }

  async addUserSavedProduct(
    userId: string,
    productId: string,
    savedAt?: Date,
  ): Promise<boolean> {
    await this.ensureUserSavedViewedTables();
    const q = `INSERT INTO user_saved_products (user_id, product_id, saved_at) VALUES ($1, $2, $3)
               ON CONFLICT (user_id, product_id) DO UPDATE SET saved_at = EXCLUDED.saved_at`;
    const res = await pool.query(q, [userId, productId, savedAt ?? new Date()]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  async removeUserSavedProduct(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    await this.ensureUserSavedViewedTables();
    const q = `DELETE FROM user_saved_products WHERE user_id = $1 AND product_id = $2`;
    const res = await pool.query(q, [userId, productId]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  async mergeUserSavedProducts(
    userId: string,
    items: Array<{ productId: string; savedAt?: Date }>,
  ): Promise<number> {
    await this.ensureUserSavedViewedTables();
    if (!items || items.length === 0) return 0;
    const values: unknown[] = [];
    const tuples: string[] = [];
    let i = 1;
    for (const it of items) {
      values.push(userId, it.productId, it.savedAt ?? new Date());
      tuples.push(`($${i++}, $${i++}, $${i++})`);
    }
    const q = `INSERT INTO user_saved_products (user_id, product_id, saved_at)
               VALUES ${tuples.join(", ")}
               ON CONFLICT (user_id, product_id) DO UPDATE SET saved_at = GREATEST(user_saved_products.saved_at, EXCLUDED.saved_at)`;
    const res = await pool.query(q, values);
    return res.rowCount ?? 0;
  }

  async getUserViewedProducts(
    userId: string,
  ): Promise<Array<{ productId: string; viewedAt: Date }>> {
    await this.ensureUserSavedViewedTables();
    const q = `SELECT product_id, viewed_at FROM user_viewed_products WHERE user_id = $1 ORDER BY viewed_at DESC LIMIT 100`;
    const result = await pool.query(q, [userId]);
    return result.rows.map((r) => ({
      productId: r.product_id as string,
      viewedAt: r.viewed_at as Date,
    }));
  }

  async upsertUserViewedProduct(
    userId: string,
    productId: string,
    viewedAt?: Date,
  ): Promise<boolean> {
    await this.ensureUserSavedViewedTables();
    const q = `INSERT INTO user_viewed_products (user_id, product_id, viewed_at) VALUES ($1, $2, $3)
               ON CONFLICT (user_id, product_id) DO UPDATE SET viewed_at = EXCLUDED.viewed_at`;
    const res = await pool.query(q, [
      userId,
      productId,
      viewedAt ?? new Date(),
    ]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  async mergeUserViewedProducts(
    userId: string,
    items: Array<{ productId: string; viewedAt?: Date }>,
  ): Promise<number> {
    await this.ensureUserSavedViewedTables();
    if (!items || items.length === 0) return 0;
    const values: unknown[] = [];
    const tuples: string[] = [];
    let i = 1;
    for (const it of items) {
      values.push(userId, it.productId, it.viewedAt ?? new Date());
      tuples.push(`($${i++}, $${i++}, $${i++})`);
    }
    const q = `INSERT INTO user_viewed_products (user_id, product_id, viewed_at)
               VALUES ${tuples.join(", ")}
               ON CONFLICT (user_id, product_id) DO UPDATE SET viewed_at = GREATEST(user_viewed_products.viewed_at, EXCLUDED.viewed_at)`;
    const res = await pool.query(q, values);
    return res.rowCount ?? 0;
  }

  // Refresh token methods
  async createRefreshToken(
    data: Omit<RefreshToken, "id" | "createdAt">,
  ): Promise<RefreshToken> {
    await this.ensureRefreshTokenIdDefault();

    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [
      data.userId,
      data.token,
      data.expiresAt,
    ]);

    return {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      token: result.rows[0].token,
      expiresAt: result.rows[0].expires_at,
      createdAt: result.rows[0].created_at,
    };
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const query = `
      SELECT * FROM refresh_tokens 
      WHERE token = $1 AND expires_at > NOW()
    `;

    const result = await pool.query(query, [token]);

    if (result.rows.length === 0) {
      return undefined;
    }

    return {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      token: result.rows[0].token,
      expiresAt: result.rows[0].expires_at,
      createdAt: result.rows[0].created_at,
    };
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    const query = `DELETE FROM refresh_tokens WHERE token = $1`;
    const result = await pool.query(query, [token]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    const query = `DELETE FROM refresh_tokens WHERE user_id = $1`;
    await pool.query(query, [userId]);
  }

  // Get user by verification token (only non-expired tokens)
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    if (!token) {
      return undefined;
    }

    const query = `
      SELECT * FROM users 
      WHERE verification_token = $1 
        AND email_verified = FALSE
        AND (verification_token_expires IS NULL OR verification_token_expires > CURRENT_TIMESTAMP)
    `;

    try {
      const result = await pool.query(query, [token]);
      if (result.rows.length === 0) {
        return undefined;
      }
      return this.mapUserRow(result.rows[0]);
    } catch (error) {
      console.error("Failed to get user by verification token:", error);
      return undefined;
    }
  }

  // Get user by password reset token
  async getUserByResetToken(token: string): Promise<User | undefined> {
    if (!token) {
      return undefined;
    }

    const query = `
      SELECT * FROM users 
      WHERE reset_password_token = $1 
      AND reset_password_expires > CURRENT_TIMESTAMP
    `;

    try {
      const result = await pool.query(query, [token]);
      if (result.rows.length === 0) {
        return undefined;
      }
      return this.mapUserRow(result.rows[0]);
    } catch (error) {
      console.error("Failed to get user by reset token:", error);
      return undefined;
    }
  }

  // Verify email address
  async verifyUserEmail(userId: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET email_verified = TRUE, verification_token = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Failed to verify user email:", error);
      return false;
    }
  }

  // Reset user password
  async resetUserPassword(
    userId: string,
    newPasswordHash: string,
  ): Promise<boolean> {
    const query = `
      UPDATE users 
      SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    try {
      const result = await pool.query(query, [newPasswordHash, userId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Failed to reset user password:", error);
      return false;
    }
  }

  // Clean up expired reset tokens (for maintenance)
  async cleanupExpiredResetTokens(): Promise<void> {
    const query = `
      UPDATE users 
      SET reset_password_token = NULL, reset_password_expires = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE reset_password_expires < CURRENT_TIMESTAMP
    `;

    try {
      const result = await pool.query(query);
      if (result.rowCount && result.rowCount > 0) {
        console.info(`Cleaned up ${result.rowCount} expired reset tokens`);
      }
    } catch (error) {
      console.error("Failed to cleanup expired reset tokens:", error);
    }
  }

  // Helper method to map database row to User type
  private mapUserRow(row: UserRow): User {
    // Decode personal_color_result if present
    let personalColorResult: PersonalColorResult | undefined = undefined;
    try {
      const raw = row.personal_color_result;
      if (raw) {
        personalColorResult =
          typeof raw === "string"
            ? JSON.parse(raw)
            : (raw as PersonalColorResult);
      }
    } catch {
      personalColorResult = undefined;
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash ?? "",
      fullName: row.full_name ?? "",
      instagramId: row.instagram_id ?? undefined,
      emailVerified: row.email_verified,
      verificationToken: row.verification_token ?? undefined,
      verificationTokenExpires: row.verification_token_expires ?? undefined,
      resetPasswordToken: row.reset_password_token ?? undefined,
      resetPasswordExpires: row.reset_password_expires ?? undefined,
      role: (row.role as User["role"]) ?? "user",
      lastLoginAt: row.last_login_at ?? undefined,
      hasPersonalColorDiagnosis: row.has_personal_color_diagnosis ?? undefined,
      personalColorResult,
      diagnosedAt: row.diagnosed_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? undefined,
    };
  }

  // Ensure user diagnosis columns exist (runtime migration)
  private async ensureUserDiagnosisColumns(): Promise<void> {
    if (this.schemaChecks.userDiagnosisColumns) return;
    try {
      const check = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'users' AND column_name = 'has_personal_color_diagnosis'
         ) AS exists`,
      );
      const has = check.rows[0]?.exists === true;
      if (!has) {
        console.warn(
          "⚠️ [Database] Adding personal color diagnosis columns to users table",
        );
        await pool.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS has_personal_color_diagnosis BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS personal_color_result JSONB,
          ADD COLUMN IF NOT EXISTS diagnosed_at TIMESTAMPTZ
        `);
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_users_has_personal_color_diagnosis
          ON users(has_personal_color_diagnosis)
        `);
      }
      this.schemaChecks.userDiagnosisColumns = true;
    } catch (e) {
      console.error("Failed to ensure user diagnosis columns:", e);
    }
  }

  // Product methods
  async createProduct(
    data: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ): Promise<Product> {
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // First, try to get column information
    try {
      const columnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        ORDER BY ordinal_position
      `;
      const columns = await pool.query(columnQuery);
      console.log(
        "[PostgreSQL] Products table columns:",
        columns.rows.map((r) => r.column_name),
      );
    } catch (e) {
      console.error("[PostgreSQL] Failed to get column info:", e);
    }

    // Use correct column names from our schema (see init.sql)
    const query = `
      INSERT INTO products (
        id, name, category, price, thumbnail_url, detail_image_urls,
        personal_colors, description, shopee_link, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        productId,
        data.name,
        data.category,
        data.price,
        data.thumbnailUrl,
        data.detailImageUrls || [], // Ensure array
        data.personalColors || [], // Ensure array
        data.description || "", // Ensure string
        data.shopeeLink || "", // Ensure string
        data.isActive !== undefined ? data.isActive : true,
      ]);

      return this.mapProductRow(result.rows[0]);
    } catch (error: unknown) {
      const dbError = (
        error instanceof Error ? error : new Error("Unknown database error")
      ) as DatabaseError;
      console.error("[PostgreSQL] Product creation failed:", {
        error: dbError.message,
        detail: dbError.detail,
        hint: dbError.hint,
        code: dbError.code,
        constraint: dbError.constraint,
        table: dbError.table,
        column: dbError.column,
        data,
      });
      throw dbError;
    }
  }

  async getProduct(productId: string): Promise<Product | undefined> {
    const query = "SELECT * FROM products WHERE id = $1";
    const result = await pool.query(query, [productId]);
    return result.rows[0] ? this.mapProductRow(result.rows[0]) : undefined;
  }

  async updateProduct(
    productId: string,
    updates: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Product | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Map our field names to actual database column names
    const fieldMapping: Record<string, string> = {
      thumbnailUrl: "thumbnail_url",
      detailImageUrls: "detail_image_urls",
      shopeeLink: "shopee_link",
      isActive: "is_active",
    };

    Object.entries(updates).forEach(([key, value]) => {
      // Use custom mapping if exists, otherwise convert to snake_case
      const dbKey =
        fieldMapping[key] || key.replace(/([A-Z])/g, "_$1").toLowerCase();
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (fields.length === 0) return this.getProduct(productId);

    values.push(productId);
    const query = `
      UPDATE products 
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] ? this.mapProductRow(result.rows[0]) : undefined;
  }

  async deleteProduct(productId: string): Promise<boolean> {
    const query = "DELETE FROM products WHERE id = $1";
    const result = await pool.query(query, [productId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteAllProducts(): Promise<void> {
    await pool.query("DELETE FROM products");
  }

  async getAllProducts(): Promise<Product[]> {
    const query = "SELECT * FROM products ORDER BY created_at DESC";
    const result = await pool.query(query);
    return result.rows.map((row) => this.mapProductRow(row));
  }

  async getProductsByCategory(category: ProductCategory): Promise<Product[]> {
    const query =
      "SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC";
    const result = await pool.query(query, [category]);
    return result.rows.map((row) => this.mapProductRow(row));
  }

  async getProductsByPersonalColor(
    personalColor: PersonalColorType,
  ): Promise<Product[]> {
    const query =
      "SELECT * FROM products WHERE $1 = ANY(personal_colors) ORDER BY created_at DESC";
    const result = await pool.query(query, [personalColor]);
    return result.rows.map((row) => this.mapProductRow(row));
  }

  async getProductsByCategoryAndPersonalColor(
    category: ProductCategory,
    personalColor: PersonalColorType,
  ): Promise<Product[]> {
    const query =
      "SELECT * FROM products WHERE category = $1 AND $2 = ANY(personal_colors) ORDER BY created_at DESC";
    const result = await pool.query(query, [category, personalColor]);
    return result.rows.map((row) => this.mapProductRow(row));
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const query =
      "SELECT * FROM products WHERE id = ANY($1::text[]) ORDER BY created_at DESC";
    const result = await pool.query(query, [ids]);
    return result.rows.map((row) => this.mapProductRow(row));
  }

  private mapProductRow(row: ProductRow): Product {
    const thumbnailUrl = row.image_url ?? row.thumbnail_url ?? "";
    const detailImagesRaw =
      row.additional_images ?? row.detail_image_urls ?? [];
    const detailImageUrls = Array.isArray(detailImagesRaw)
      ? detailImagesRaw.filter(
          (image): image is string => typeof image === "string",
        )
      : [];
    const personalColorsRaw = row.personal_colors ?? [];
    const personalColors = Array.isArray(personalColorsRaw)
      ? (personalColorsRaw.filter(
          (color): color is PersonalColorType => typeof color === "string",
        ) as PersonalColorType[])
      : [];

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      price: row.price,
      thumbnailUrl,
      detailImageUrls,
      personalColors,
      description: row.description ?? undefined,
      shopeeLink: row.product_link ?? row.shopee_link ?? "",
      isActive: row.is_available ?? row.is_active ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Content methods
  async createContent(
    data: Omit<Content, "id" | "createdAt" | "updatedAt" | "viewCount">,
  ): Promise<Content> {
    const contentId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const query = `
      INSERT INTO contents (
        id, title, subtitle, slug, thumbnail_url, content, excerpt,
        category, tags, status, published_at, meta_description, meta_keywords
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await pool.query(query, [
      contentId,
      data.title,
      data.subtitle,
      data.slug,
      data.thumbnailUrl,
      data.content,
      data.excerpt,
      data.category,
      data.tags,
      data.status,
      data.publishedAt || (data.status === "published" ? new Date() : null),
      data.metaDescription,
      data.metaKeywords,
    ]);

    return this.mapContentRow(result.rows[0]);
  }

  // Pure SELECT — REST GET must be idempotent. View tracking is recorded by
  // explicit POST /:idOrSlug/view via incrementContentView.
  async getContent(contentId: string): Promise<Content | undefined> {
    const result = await pool.query("SELECT * FROM contents WHERE id = $1", [
      contentId,
    ]);
    return result.rows[0] ? this.mapContentRow(result.rows[0]) : undefined;
  }

  // Admin-safe fetch without mutating view counts (kept for API symmetry).
  async getContentForAdmin(contentId: string): Promise<Content | undefined> {
    return this.getContent(contentId);
  }

  async getContentBySlug(slug: string): Promise<Content | undefined> {
    const result = await pool.query("SELECT * FROM contents WHERE slug = $1", [
      slug,
    ]);
    return result.rows[0] ? this.mapContentRow(result.rows[0]) : undefined;
  }

  // Admin-safe slug fetch without mutating view counts.
  async getContentBySlugForAdmin(slug: string): Promise<Content | undefined> {
    return this.getContentBySlug(slug);
  }

  async incrementContentView(idOrSlug: string): Promise<boolean> {
    const query = `
      UPDATE contents
      SET view_count = view_count + 1, updated_at = NOW()
      WHERE id = $1 OR slug = $1
    `;
    const result = await pool.query(query, [idOrSlug]);
    return (result.rowCount ?? 0) > 0;
  }

  async updateContent(
    contentId: string,
    updates: Partial<
      Omit<Content, "id" | "createdAt" | "updatedAt" | "viewCount">
    >,
  ): Promise<Content | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (fields.length === 0) return this.getContent(contentId);

    // Handle published_at update
    if (updates.status === "published") {
      fields.push(`published_at = COALESCE(published_at, NOW())`);
    }

    values.push(contentId);
    const query = `
      UPDATE contents 
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] ? this.mapContentRow(result.rows[0]) : undefined;
  }

  async deleteContent(contentId: string): Promise<boolean> {
    const query = "DELETE FROM contents WHERE id = $1";
    const result = await pool.query(query, [contentId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAllContents(filters?: {
    category?: ContentCategory;
    status?: ContentStatus;
    orderBy?: "created_at_desc" | "published_at_desc" | "view_count_desc";
    limit?: number;
    offset?: number;
  }): Promise<Content[]> {
    let query = "SELECT * FROM contents";
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters?.category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(filters.category);
      paramIndex++;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    // Whitelist of orderBy → SQL clause to prevent injection.
    const orderByClauses: Record<string, string> = {
      created_at_desc: "ORDER BY created_at DESC",
      published_at_desc:
        "ORDER BY COALESCE(published_at, created_at) DESC, created_at DESC",
      view_count_desc: "ORDER BY view_count DESC, created_at DESC",
    };
    const orderBy = filters?.orderBy ?? "created_at_desc";
    query += " " + (orderByClauses[orderBy] ?? orderByClauses.created_at_desc);

    if (filters?.limit !== undefined && filters.limit > 0) {
      query += ` LIMIT $${paramIndex}`;
      values.push(filters.limit);
      paramIndex++;
    }
    if (filters?.offset !== undefined && filters.offset > 0) {
      query += ` OFFSET $${paramIndex}`;
      values.push(filters.offset);
      paramIndex++;
    }

    const result = await pool.query(query, values);
    return result.rows.map((row) => this.mapContentRow(row));
  }

  async countContents(filters?: {
    category?: ContentCategory;
    status?: ContentStatus;
  }): Promise<number> {
    let query = "SELECT COUNT(*)::int AS count FROM contents";
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters?.category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(filters.category);
      paramIndex++;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const result = await pool.query(query, values);
    return result.rows[0]?.count ?? 0;
  }

  async updateContentStatus(
    contentId: string,
    status: ContentStatus,
  ): Promise<Content | undefined> {
    // NOTE: explicit ::text casts required — without them Postgres infers
    // inconsistent types for $1 ("text vs character varying", error 42P08)
    // because the same parameter is used in both `SET status = $1` (varchar
    // column) and the `CASE WHEN $1 = 'published'` text comparison.
    const query = `
      UPDATE contents
      SET status = $1::text,
          updated_at = NOW(),
          published_at = CASE
            WHEN $1::text = 'published' THEN COALESCE(published_at, NOW())
            ELSE published_at
          END
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, contentId]);
    return result.rows[0] ? this.mapContentRow(result.rows[0]) : undefined;
  }

  private mapContentRow(row: ContentRow): Content {
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      slug: row.slug,
      thumbnailUrl: row.thumbnail_url ?? "",
      content: row.content,
      excerpt: row.excerpt ?? undefined,
      category: row.category,
      tags: Array.isArray(row.tags) ? row.tags : [],
      status: row.status,
      publishedAt: row.published_at ?? undefined,
      metaDescription: row.meta_description ?? undefined,
      metaKeywords: row.meta_keywords ?? undefined,
      viewCount: row.view_count ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Clear all data (for testing)
  async clearAllData(): Promise<void> {
    await pool.query("DELETE FROM refresh_tokens");
    await pool.query("DELETE FROM recommendations");
    await pool.query("DELETE FROM sessions");
    await pool.query("DELETE FROM users");
    await pool.query("DELETE FROM products");
    await pool.query("DELETE FROM contents");
  }

  private async ensureVerificationTokenExpiryColumn(): Promise<void> {
    if (this.schemaChecks.verificationTokenExpiry) {
      return;
    }

    const columnCheck = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'verification_token_expires'
      ) AS exists`,
    );

    const hasColumn = columnCheck.rows[0]?.exists === true;

    if (!hasColumn) {
      console.warn(
        "⚠️ [Database] verification_token_expires column missing. Applying runtime migration.",
      );

      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_verification_token_expires
        ON users(verification_token_expires)
      `);

      console.info(
        "✅ [Database] verification_token_expires column added to users table",
      );
    }

    this.schemaChecks.verificationTokenExpiry = true;
  }

  private async ensureRefreshTokenIdDefault(): Promise<void> {
    if (this.schemaChecks.refreshTokenIdDefault) {
      return;
    }

    const defaultCheck = await pool.query<{ column_default: string | null }>(
      `SELECT column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'refresh_tokens'
         AND column_name = 'id'`,
    );

    const columnDefault = defaultCheck.rows[0]?.column_default ?? null;

    if (!columnDefault || !columnDefault.includes("gen_random_uuid")) {
      console.warn(
        "⚠️ [Database] refresh_tokens.id default missing. Applying runtime migration.",
      );

      await pool.query(`
        ALTER TABLE refresh_tokens
        ALTER COLUMN id SET DEFAULT gen_random_uuid()
      `);

      console.info(
        "✅ [Database] refresh_tokens.id default set to gen_random_uuid()",
      );
    }

    this.schemaChecks.refreshTokenIdDefault = true;
  }

  // Ensure `users.role` and `users.last_login_at` columns exist
  private async ensureUserRoleAndLastLoginColumns(): Promise<void> {
    // role column
    if (!this.schemaChecks.userRoleColumn) {
      const roleCheck = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_name = 'users'
             AND column_name = 'role'
         ) AS exists`,
      );
      const hasRole = roleCheck.rows[0]?.exists === true;
      if (!hasRole) {
        console.warn(
          "⚠️ [Database] users.role column missing. Applying runtime migration.",
        );
        await pool.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'user'
        `);
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
        `);
        console.info("✅ [Database] users.role column added");
      }
      this.schemaChecks.userRoleColumn = true;
    }

    // last_login_at column
    if (!this.schemaChecks.userLastLoginAtColumn) {
      const lastLoginCheck = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_name = 'users'
             AND column_name = 'last_login_at'
         ) AS exists`,
      );
      const hasLastLogin = lastLoginCheck.rows[0]?.exists === true;
      if (!hasLastLogin) {
        console.warn(
          "⚠️ [Database] users.last_login_at column missing. Applying runtime migration.",
        );
        await pool.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ
        `);
        console.info("✅ [Database] users.last_login_at column added");
      }
      this.schemaChecks.userLastLoginAtColumn = true;
    }
  }

  // Ensure admin_actions table exists for audit logging
  private async ensureAdminActionsTable(): Promise<void> {
    if (this.schemaChecks.adminActionsTable) {
      return;
    }

    const tableCheck = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'admin_actions'
       ) AS exists`,
    );

    const exists = tableCheck.rows[0]?.exists === true;
    if (!exists) {
      console.warn(
        "⚠️ [Database] admin_actions table missing. Applying runtime migration.",
      );
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id VARCHAR(50),
          action_type TEXT NOT NULL,
          action_details JSONB,
          performed_by TEXT NOT NULL,
          performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_actions_performed_at
        ON admin_actions(performed_at DESC)
      `);
      console.info("✅ [Database] admin_actions table created");
    }

    this.schemaChecks.adminActionsTable = true;
  }
}

// Export singleton instance
export const db = new PostgresDatabase();
