


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_expiring_licenses"() RETURNS TABLE("id" "uuid", "name" "text", "license_number" "text", "license_expiry_date" "date", "days_until_expiry" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    id,
    name,
    license_number,
    license_expiry_date,
    (license_expiry_date - CURRENT_DATE) as days_until_expiry
  FROM drivers
  WHERE license_expiry_date IS NOT NULL
    AND license_expiry_date >= CURRENT_DATE
    AND license_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
  ORDER BY license_expiry_date ASC;
$$;


ALTER FUNCTION "public"."get_expiring_licenses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_team_id"("_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT ur.team_id FROM public.user_roles ur WHERE ur.user_id = _user_id LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_team_id"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_personnel_id_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  prefix text;
  random_suffix text;
BEGIN
  -- Only generate if id_number is null or empty
  IF NEW.id_number IS NULL OR NEW.id_number = '' THEN
    -- Determine prefix based on table name
    CASE TG_TABLE_NAME
      WHEN 'helpers' THEN prefix := 'HLP';
      WHEN 'recyclers' THEN prefix := 'RYC';
      WHEN 'management' THEN prefix := 'MNM';
      WHEN 'mechanics' THEN prefix := 'MEC';
      ELSE prefix := 'PER'; -- fallback
    END CASE;
    
    -- Generate 9 random digits
    random_suffix := lpad(floor(random() * 1000000000)::text, 9, '0');
    NEW.id_number := prefix || '-' || random_suffix;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_personnel_id_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_team_id_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    NEW.team_id := public.get_user_team_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_team_id_from_auth"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "industry" "text" NOT NULL,
    "qr_code" "text" NOT NULL,
    "contact_info" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contact_person" "text",
    "contact_number" "text",
    "mt_requirement" numeric DEFAULT 0,
    "collection_days" "text"[] DEFAULT ARRAY['Mon'::"text", 'Tue'::"text", 'Wed'::"text", 'Thu'::"text", 'Fri'::"text"],
    "collection_shift" "text" DEFAULT 'AM'::"text",
    "latitude" numeric,
    "longitude" numeric,
    "status" "text" DEFAULT 'active'::"text",
    "contract_file_url" "text",
    "contract_expiry_date" "date"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "truck_id" "uuid" NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "helper_ids" "uuid"[] NOT NULL,
    "items" "jsonb" NOT NULL,
    "waste_types" "text"[] NOT NULL,
    "signature_data" "text",
    "signed_by" "text",
    "qr_code" "text" NOT NULL,
    "pdf_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "tally_entries" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."collection_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "license_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id_number" "text",
    "birthdate" "date",
    "contact_number" "text",
    "availability" "jsonb" DEFAULT '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "shifts": ["AM", "PM"]}'::"jsonb",
    "license_file_url" "text",
    "license_expiry_date" "date",
    "status" "text" DEFAULT 'available'::"text",
    "suspension_start_date" "date",
    "suspension_end_date" "date",
    "leaves_available" integer DEFAULT 15,
    "team_id" "uuid",
    CONSTRAINT "drivers_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'suspended'::"text", 'fired'::"text"])))
);


ALTER TABLE "public"."drivers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."drivers"."status" IS 'Employment status: available (can be scheduled), suspended (temporarily unavailable), fired (permanently unavailable)';



COMMENT ON COLUMN "public"."drivers"."suspension_start_date" IS 'Start date of suspension period (only relevant when status is suspended)';



COMMENT ON COLUMN "public"."drivers"."suspension_end_date" IS 'End date of suspension period (only relevant when status is suspended)';



CREATE TABLE IF NOT EXISTS "public"."equipment_checkouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "assigned_to_type" "text" NOT NULL,
    "driver_id" "uuid",
    "helper_id" "uuid",
    "quantity" integer DEFAULT 1,
    "checked_out_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "checked_in_at" timestamp with time zone,
    "status" "text" DEFAULT 'checked_out'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "mechanic_id" "uuid",
    "management_id" "uuid",
    "recycler_id" "uuid"
);


ALTER TABLE "public"."equipment_checkouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "is_consumable" boolean DEFAULT false,
    "quantity" integer DEFAULT 1,
    "status" "text" DEFAULT 'available'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."equipment_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."helpers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id_number" "text",
    "birthdate" "date",
    "contact_number" "text",
    "availability" "jsonb" DEFAULT '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "shifts": ["AM", "PM"]}'::"jsonb",
    "status" "text" DEFAULT 'available'::"text",
    "suspension_start_date" "date",
    "suspension_end_date" "date",
    "photo_url" "text",
    "address" "text",
    "leaves_available" integer DEFAULT 15,
    "team_id" "uuid",
    CONSTRAINT "helpers_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'suspended'::"text", 'fired'::"text"])))
);


ALTER TABLE "public"."helpers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."helpers"."status" IS 'Employment status: available (can be scheduled), suspended (temporarily unavailable), fired (permanently unavailable)';



COMMENT ON COLUMN "public"."helpers"."suspension_start_date" IS 'Start date of suspension period (only relevant when status is suspended)';



COMMENT ON COLUMN "public"."helpers"."suspension_end_date" IS 'End date of suspension period (only relevant when status is suspended)';



CREATE TABLE IF NOT EXISTS "public"."incident_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reported_by" "uuid" NOT NULL,
    "reporter_name" "text" NOT NULL,
    "incident_type" "text" NOT NULL,
    "incident_date" "date" NOT NULL,
    "incident_time" time without time zone,
    "location" "text",
    "personnel_involved" "jsonb" DEFAULT '[]'::"jsonb",
    "description" "text" NOT NULL,
    "severity" "text" DEFAULT 'low'::"text",
    "status" "text" DEFAULT 'submitted'::"text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "incident_reports_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "incident_reports_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'under_review'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."incident_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_order_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_order_id" "uuid" NOT NULL,
    "service_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "provider_name" "text",
    "description" "text",
    "cost" numeric,
    "cost_added_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL
);


ALTER TABLE "public"."job_order_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_number" "text" NOT NULL,
    "truck_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "scheduled_date" "date",
    "completed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "total_active_minutes" integer DEFAULT 0,
    "last_resume_at" timestamp with time zone,
    "suspended_periods" "jsonb" DEFAULT '[]'::"jsonb",
    "mechanic_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "mechanic_comments" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."job_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."job_orders"."mechanic_comments" IS 'Array of comment objects with user_id, user_name, comment, and created_at';



CREATE TABLE IF NOT EXISTS "public"."leaves" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "personnel_type" "text" NOT NULL,
    "personnel_id" "uuid" NOT NULL,
    "personnel_name" "text" NOT NULL,
    "personnel_id_number" "text" NOT NULL,
    "leave_type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text" NOT NULL,
    "medical_certificate_url" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "leave_days" integer DEFAULT 0 NOT NULL,
    "is_paid" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."leaves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."management" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_number" "text",
    "address" "text",
    "leaves_available" integer DEFAULT 15,
    "status" "text" DEFAULT 'available'::"text",
    "photo_url" "text",
    "id_number" "text",
    "birthdate" "date",
    "availability" "jsonb" DEFAULT '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "shifts": ["AM", "PM"]}'::"jsonb",
    "suspension_start_date" "date",
    "suspension_end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."management" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mechanic_consumable_checkouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consumable_id" "uuid" NOT NULL,
    "mechanic_id" "uuid" NOT NULL,
    "job_order_id" "uuid" NOT NULL,
    "truck_id" "uuid" NOT NULL,
    "quantity_used" numeric NOT NULL,
    "checked_out_by_user_id" "uuid",
    "checked_out_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mechanic_consumable_checkouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mechanic_consumables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "quantity" numeric DEFAULT 0,
    "min_stock_level" numeric DEFAULT 10,
    "status" "text" DEFAULT 'in_stock'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "unit_cost" numeric DEFAULT 0
);


ALTER TABLE "public"."mechanic_consumables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mechanic_time_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mechanic_id" "uuid" NOT NULL,
    "time_in" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_out" timestamp with time zone,
    "photo_url" "text",
    "latitude" numeric,
    "longitude" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mechanic_time_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mechanical_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reported_by" "uuid" NOT NULL,
    "reporter_name" "text" NOT NULL,
    "truck_id" "uuid" NOT NULL,
    "report_date" "date" NOT NULL,
    "issue_description" "text" NOT NULL,
    "severity" "text" DEFAULT 'low'::"text",
    "status" "text" DEFAULT 'submitted'::"text",
    "truck_operational" boolean DEFAULT true,
    "symptoms" "jsonb" DEFAULT '[]'::"jsonb",
    "mechanic_comments" "jsonb" DEFAULT '[]'::"jsonb",
    "job_order_id" "uuid",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "mechanical_reports_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "mechanical_reports_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'under_review'::"text", 'job_order_created'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."mechanical_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mechanics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "id_number" "text",
    "contact_number" "text",
    "birthdate" "date",
    "status" "text" DEFAULT 'available'::"text",
    "availability" "jsonb" DEFAULT '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "shifts": ["AM", "PM"]}'::"jsonb",
    "suspension_start_date" "date",
    "suspension_end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photo_url" "text",
    "leaves_available" integer DEFAULT 15
);


ALTER TABLE "public"."mechanics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personnel_time_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "personnel_id" "uuid" NOT NULL,
    "personnel_type" "text" NOT NULL,
    "personnel_name" "text" NOT NULL,
    "time_in" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_out" timestamp with time zone,
    "photo_url" "text",
    "latitude" numeric,
    "longitude" numeric,
    "group_session_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "truck_id" "uuid",
    "team_id" "uuid",
    CONSTRAINT "personnel_time_logs_personnel_type_check" CHECK (("personnel_type" = ANY (ARRAY['driver'::"text", 'helper'::"text", 'mechanic'::"text", 'recycler'::"text", 'management'::"text"])))
);


ALTER TABLE "public"."personnel_time_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."personnel_time_logs"."truck_id" IS 'The truck/vehicle the group is using. Groups are identified by truck_id + time_in date.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recyclers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_number" "text",
    "address" "text",
    "leaves_available" integer DEFAULT 15,
    "status" "text" DEFAULT 'available'::"text",
    "photo_url" "text",
    "id_number" "text",
    "birthdate" "date",
    "availability" "jsonb" DEFAULT '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "shifts": ["AM", "PM"]}'::"jsonb",
    "suspension_start_date" "date",
    "suspension_end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recyclers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "shift" "text" NOT NULL,
    "driver_id" "uuid",
    "helper_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "truck_id" "uuid",
    "status" "text" DEFAULT 'scheduled'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_backup" boolean DEFAULT false,
    "mt_requirement" numeric,
    "approved_by" "text",
    "approved_at" timestamp with time zone,
    "signature_data" "text",
    "device_fingerprint" "text",
    "client_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "is_special_dispatch" boolean DEFAULT false,
    "client_mt_allocations" "jsonb" DEFAULT '[]'::"jsonb",
    "recycler_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    CONSTRAINT "schedules_shift_check" CHECK (("shift" = ANY (ARRAY['AM'::"text", 'PM'::"text"]))),
    CONSTRAINT "schedules_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_approval'::"text", 'approved'::"text", 'scheduled'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."schedules"."is_backup" IS 'Indicates if this is a backup driver/helper assignment (for deployments with >5 trucks)';



COMMENT ON COLUMN "public"."schedules"."mt_requirement" IS 'Metric tons requirement for this shift';



COMMENT ON COLUMN "public"."schedules"."approved_by" IS 'User who approved this schedule';



COMMENT ON COLUMN "public"."schedules"."approved_at" IS 'Timestamp when schedule was approved';



COMMENT ON COLUMN "public"."schedules"."signature_data" IS 'Digital signature data for approval';



COMMENT ON COLUMN "public"."schedules"."device_fingerprint" IS 'Unique device identifier for audit trail of approvals';



COMMENT ON COLUMN "public"."schedules"."is_special_dispatch" IS 'Flag to indicate if this is a special dispatch schedule';



COMMENT ON COLUMN "public"."schedules"."client_mt_allocations" IS 'Array of {client_id, mt_requirement, allocated_mt} for special dispatch schedules';



COMMENT ON COLUMN "public"."schedules"."recycler_ids" IS 'Array of recycler IDs assigned to this schedule';



CREATE TABLE IF NOT EXISTS "public"."scheduling_parameters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parameter_key" "text" NOT NULL,
    "parameter_value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scheduling_parameters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool_checkouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tool_id" "uuid" NOT NULL,
    "mechanic_id" "uuid" NOT NULL,
    "checked_out_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "checked_in_at" timestamp with time zone,
    "status" "text" DEFAULT 'checked_out'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "job_order_id" "uuid",
    "checked_out_by_user_id" "uuid",
    "checked_in_by_user_id" "uuid",
    "checkin_photo_url" "text"
);


ALTER TABLE "public"."tool_checkouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "category" "text",
    "status" "text" DEFAULT 'available'::"text",
    "condition" "text" DEFAULT 'good'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."truck_maintenance_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "truck_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "max_30_days" CHECK ((("end_date" - "start_date") <= 30)),
    CONSTRAINT "valid_date_range" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."truck_maintenance_blocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."truck_maintenance_blocks" IS 'Tracks scheduled maintenance and downtime periods for trucks';



COMMENT ON COLUMN "public"."truck_maintenance_blocks"."start_date" IS 'Start date of maintenance period';



COMMENT ON COLUMN "public"."truck_maintenance_blocks"."end_date" IS 'End date of maintenance period (max 30 days from start)';



COMMENT ON COLUMN "public"."truck_maintenance_blocks"."reason" IS 'Reason for maintenance/downtime';



CREATE TABLE IF NOT EXISTS "public"."trucks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plate_number" "text",
    "status" "text" DEFAULT 'available'::"text",
    "capacity" numeric DEFAULT 0,
    "team_id" "uuid",
    "odometer_reading" numeric DEFAULT 0
);


ALTER TABLE "public"."trucks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."trucks"."capacity" IS 'Truck capacity in metric tons (MT)';



COMMENT ON COLUMN "public"."trucks"."odometer_reading" IS 'Current odometer reading in kilometers';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."collection_receipts"
    ADD CONSTRAINT "collection_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_receipts"
    ADD CONSTRAINT "collection_receipts_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_checkouts"
    ADD CONSTRAINT "equipment_checkouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_inventory"
    ADD CONSTRAINT "equipment_inventory_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."equipment_inventory"
    ADD CONSTRAINT "equipment_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."helpers"
    ADD CONSTRAINT "helpers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incident_reports"
    ADD CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_order_services"
    ADD CONSTRAINT "job_order_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_orders"
    ADD CONSTRAINT "job_orders_job_number_key" UNIQUE ("job_number");



ALTER TABLE ONLY "public"."job_orders"
    ADD CONSTRAINT "job_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leaves"
    ADD CONSTRAINT "leaves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."management"
    ADD CONSTRAINT "management_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mechanic_consumable_checkouts"
    ADD CONSTRAINT "mechanic_consumable_checkouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mechanic_consumables"
    ADD CONSTRAINT "mechanic_consumables_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."mechanic_consumables"
    ADD CONSTRAINT "mechanic_consumables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mechanic_time_logs"
    ADD CONSTRAINT "mechanic_time_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mechanical_reports"
    ADD CONSTRAINT "mechanical_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mechanics"
    ADD CONSTRAINT "mechanics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personnel_time_logs"
    ADD CONSTRAINT "personnel_time_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."recyclers"
    ADD CONSTRAINT "recyclers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduling_parameters"
    ADD CONSTRAINT "scheduling_parameters_parameter_key_key" UNIQUE ("parameter_key");



ALTER TABLE ONLY "public"."scheduling_parameters"
    ADD CONSTRAINT "scheduling_parameters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_checkouts"
    ADD CONSTRAINT "tool_checkouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."truck_maintenance_blocks"
    ADD CONSTRAINT "truck_maintenance_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trucks"
    ADD CONSTRAINT "trucks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_clients_qr_code" ON "public"."clients" USING "btree" ("qr_code");



CREATE INDEX "idx_collection_receipts_created_at" ON "public"."collection_receipts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_collection_receipts_qr_code" ON "public"."collection_receipts" USING "btree" ("qr_code");



CREATE INDEX "idx_drivers_license_expiry" ON "public"."drivers" USING "btree" ("license_expiry_date");



CREATE INDEX "idx_drivers_team" ON "public"."drivers" USING "btree" ("team_id");



CREATE INDEX "idx_helpers_team" ON "public"."helpers" USING "btree" ("team_id");



CREATE INDEX "idx_job_order_services_job_order_id" ON "public"."job_order_services" USING "btree" ("job_order_id");



CREATE INDEX "idx_leaves_personnel" ON "public"."leaves" USING "btree" ("personnel_type", "personnel_id");



CREATE INDEX "idx_leaves_status" ON "public"."leaves" USING "btree" ("status");



CREATE INDEX "idx_personnel_time_logs_personnel" ON "public"."personnel_time_logs" USING "btree" ("personnel_id", "personnel_type");



CREATE INDEX "idx_personnel_time_logs_session" ON "public"."personnel_time_logs" USING "btree" ("group_session_id");



CREATE INDEX "idx_personnel_time_logs_team" ON "public"."personnel_time_logs" USING "btree" ("team_id");



CREATE INDEX "idx_personnel_time_logs_time_in" ON "public"."personnel_time_logs" USING "btree" ("time_in" DESC);



CREATE INDEX "idx_personnel_time_logs_truck" ON "public"."personnel_time_logs" USING "btree" ("truck_id");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_truck_maintenance_dates" ON "public"."truck_maintenance_blocks" USING "btree" ("truck_id", "start_date", "end_date");



CREATE INDEX "idx_trucks_team" ON "public"."trucks" USING "btree" ("team_id");



CREATE INDEX "idx_user_roles_team" ON "public"."user_roles" USING "btree" ("team_id");



CREATE OR REPLACE TRIGGER "set_drivers_team_id" BEFORE INSERT ON "public"."drivers" FOR EACH ROW EXECUTE FUNCTION "public"."set_team_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_helper_id_number" BEFORE INSERT OR UPDATE ON "public"."helpers" FOR EACH ROW EXECUTE FUNCTION "public"."set_personnel_id_number"();



CREATE OR REPLACE TRIGGER "set_helpers_team_id" BEFORE INSERT ON "public"."helpers" FOR EACH ROW EXECUTE FUNCTION "public"."set_team_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_management_id_number" BEFORE INSERT OR UPDATE ON "public"."management" FOR EACH ROW EXECUTE FUNCTION "public"."set_personnel_id_number"();



CREATE OR REPLACE TRIGGER "set_mechanic_id_number" BEFORE INSERT OR UPDATE ON "public"."mechanics" FOR EACH ROW EXECUTE FUNCTION "public"."set_personnel_id_number"();



CREATE OR REPLACE TRIGGER "set_personnel_time_logs_team_id" BEFORE INSERT ON "public"."personnel_time_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_team_id_from_auth"();



CREATE OR REPLACE TRIGGER "set_recycler_id_number" BEFORE INSERT OR UPDATE ON "public"."recyclers" FOR EACH ROW EXECUTE FUNCTION "public"."set_personnel_id_number"();



CREATE OR REPLACE TRIGGER "set_trucks_team_id" BEFORE INSERT ON "public"."trucks" FOR EACH ROW EXECUTE FUNCTION "public"."set_team_id_from_auth"();



ALTER TABLE ONLY "public"."collection_receipts"
    ADD CONSTRAINT "collection_receipts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."collection_receipts"
    ADD CONSTRAINT "collection_receipts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."collection_receipts"
    ADD CONSTRAINT "collection_receipts_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."equipment_checkouts"
    ADD CONSTRAINT "equipment_checkouts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_checkouts"
    ADD CONSTRAINT "equipment_checkouts_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment_inventory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_checkouts"
    ADD CONSTRAINT "equipment_checkouts_helper_id_fkey" FOREIGN KEY ("helper_id") REFERENCES "public"."helpers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_checkouts"
    ADD CONSTRAINT "equipment_checkouts_management_id_fkey" FOREIGN KEY ("management_id") REFERENCES "public"."management"("id");



ALTER TABLE ONLY "public"."equipment_checkouts"
    ADD CONSTRAINT "equipment_checkouts_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id");



ALTER TABLE ONLY "public"."equipment_checkouts"
    ADD CONSTRAINT "equipment_checkouts_recycler_id_fkey" FOREIGN KEY ("recycler_id") REFERENCES "public"."recyclers"("id");



ALTER TABLE ONLY "public"."job_orders"
    ADD CONSTRAINT "job_orders_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leaves"
    ADD CONSTRAINT "leaves_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."mechanic_consumable_checkouts"
    ADD CONSTRAINT "mechanic_consumable_checkouts_consumable_id_fkey" FOREIGN KEY ("consumable_id") REFERENCES "public"."mechanic_consumables"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mechanic_consumable_checkouts"
    ADD CONSTRAINT "mechanic_consumable_checkouts_job_order_id_fkey" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mechanic_consumable_checkouts"
    ADD CONSTRAINT "mechanic_consumable_checkouts_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mechanic_consumable_checkouts"
    ADD CONSTRAINT "mechanic_consumable_checkouts_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mechanic_time_logs"
    ADD CONSTRAINT "mechanic_time_logs_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mechanical_reports"
    ADD CONSTRAINT "mechanical_reports_job_order_id_fkey" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id");



ALTER TABLE ONLY "public"."mechanical_reports"
    ADD CONSTRAINT "mechanical_reports_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personnel_time_logs"
    ADD CONSTRAINT "personnel_time_logs_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_checkouts"
    ADD CONSTRAINT "tool_checkouts_job_order_id_fkey" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_checkouts"
    ADD CONSTRAINT "tool_checkouts_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_checkouts"
    ADD CONSTRAINT "tool_checkouts_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."truck_maintenance_blocks"
    ADD CONSTRAINT "truck_maintenance_blocks_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "All authenticated users can delete checkouts" ON "public"."tool_checkouts" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete clients" ON "public"."clients" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can delete consumable checkouts" ON "public"."mechanic_consumable_checkouts" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete consumables" ON "public"."mechanic_consumables" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete equipment" ON "public"."equipment_inventory" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete equipment checkouts" ON "public"."equipment_checkouts" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete incident reports" ON "public"."incident_reports" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete job orders" ON "public"."job_orders" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete leaves" ON "public"."leaves" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can delete maintenance blocks" ON "public"."truck_maintenance_blocks" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete management" ON "public"."management" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can delete mechanical reports" ON "public"."mechanical_reports" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete mechanics" ON "public"."mechanics" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete receipts" ON "public"."collection_receipts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can delete recyclers" ON "public"."recyclers" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can delete scheduling parameters" ON "public"."scheduling_parameters" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete services" ON "public"."job_order_services" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can delete time logs" ON "public"."mechanic_time_logs" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can delete tools" ON "public"."tools" FOR DELETE USING (true);



CREATE POLICY "All authenticated users can insert checkouts" ON "public"."tool_checkouts" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert clients" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "All authenticated users can insert consumable checkouts" ON "public"."mechanic_consumable_checkouts" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert consumables" ON "public"."mechanic_consumables" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert equipment" ON "public"."equipment_inventory" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert equipment checkouts" ON "public"."equipment_checkouts" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert incident reports" ON "public"."incident_reports" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert job orders" ON "public"."job_orders" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert leaves" ON "public"."leaves" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "All authenticated users can insert maintenance blocks" ON "public"."truck_maintenance_blocks" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert management" ON "public"."management" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "All authenticated users can insert mechanical reports" ON "public"."mechanical_reports" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert mechanics" ON "public"."mechanics" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "All authenticated users can insert receipts" ON "public"."collection_receipts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "All authenticated users can insert recyclers" ON "public"."recyclers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "All authenticated users can insert scheduling parameters" ON "public"."scheduling_parameters" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert services" ON "public"."job_order_services" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "All authenticated users can insert time logs" ON "public"."mechanic_time_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert tools" ON "public"."tools" FOR INSERT WITH CHECK (true);



CREATE POLICY "All authenticated users can insert user_roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "All authenticated users can manage schedules" ON "public"."schedules" USING (true) WITH CHECK (true);



CREATE POLICY "All authenticated users can update checkouts" ON "public"."tool_checkouts" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update clients" ON "public"."clients" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can update consumable checkouts" ON "public"."mechanic_consumable_checkouts" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update consumables" ON "public"."mechanic_consumables" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update equipment" ON "public"."equipment_inventory" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update equipment checkouts" ON "public"."equipment_checkouts" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update incident reports" ON "public"."incident_reports" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update job orders" ON "public"."job_orders" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update leaves" ON "public"."leaves" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can update maintenance blocks" ON "public"."truck_maintenance_blocks" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update management" ON "public"."management" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can update mechanical reports" ON "public"."mechanical_reports" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update mechanics" ON "public"."mechanics" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can update receipts" ON "public"."collection_receipts" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can update recyclers" ON "public"."recyclers" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can update scheduling parameters" ON "public"."scheduling_parameters" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update services" ON "public"."job_order_services" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can update time logs" ON "public"."mechanic_time_logs" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update tools" ON "public"."tools" FOR UPDATE USING (true);



CREATE POLICY "All authenticated users can update user_roles" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view checkouts" ON "public"."tool_checkouts" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view clients" ON "public"."clients" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view consumable checkouts" ON "public"."mechanic_consumable_checkouts" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view consumables" ON "public"."mechanic_consumables" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view equipment" ON "public"."equipment_inventory" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view equipment checkouts" ON "public"."equipment_checkouts" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view incident reports" ON "public"."incident_reports" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view job orders" ON "public"."job_orders" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view leaves" ON "public"."leaves" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view maintenance blocks" ON "public"."truck_maintenance_blocks" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view management" ON "public"."management" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view mechanical reports" ON "public"."mechanical_reports" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view mechanics" ON "public"."mechanics" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view receipts" ON "public"."collection_receipts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view recyclers" ON "public"."recyclers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view scheduling parameters" ON "public"."scheduling_parameters" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view services" ON "public"."job_order_services" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view time logs" ON "public"."mechanic_time_logs" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view tools" ON "public"."tools" FOR SELECT USING (true);



CREATE POLICY "All authenticated users can view user_roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can delete drivers in their team" ON "public"."drivers" FOR DELETE TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can delete helpers in their team" ON "public"."helpers" FOR DELETE TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can delete time logs in their team" ON "public"."personnel_time_logs" FOR DELETE TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can delete trucks in their team" ON "public"."trucks" FOR DELETE TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can insert drivers in their team" ON "public"."drivers" FOR INSERT TO "authenticated" WITH CHECK (("team_id" = "public"."get_user_team_id"("auth"."uid"())));



CREATE POLICY "Users can insert helpers in their team" ON "public"."helpers" FOR INSERT TO "authenticated" WITH CHECK (("team_id" = "public"."get_user_team_id"("auth"."uid"())));



CREATE POLICY "Users can insert time logs in their team" ON "public"."personnel_time_logs" FOR INSERT TO "authenticated" WITH CHECK (("team_id" = "public"."get_user_team_id"("auth"."uid"())));



CREATE POLICY "Users can insert trucks in their team" ON "public"."trucks" FOR INSERT TO "authenticated" WITH CHECK (("team_id" = "public"."get_user_team_id"("auth"."uid"())));



CREATE POLICY "Users can update drivers in their team" ON "public"."drivers" FOR UPDATE TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can update helpers in their team" ON "public"."helpers" FOR UPDATE TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can update time logs in their team" ON "public"."personnel_time_logs" FOR UPDATE TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can update trucks in their team" ON "public"."trucks" FOR UPDATE TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can view drivers in their team" ON "public"."drivers" FOR SELECT TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can view helpers in their team" ON "public"."helpers" FOR SELECT TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can view time logs in their team" ON "public"."personnel_time_logs" FOR SELECT TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



CREATE POLICY "Users can view trucks in their team" ON "public"."trucks" FOR SELECT TO "authenticated" USING ((("team_id" IS NULL) OR ("team_id" = "public"."get_user_team_id"("auth"."uid"()))));



ALTER TABLE "public"."equipment_checkouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment_inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incident_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_order_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leaves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."management" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mechanic_consumable_checkouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mechanic_consumables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mechanic_time_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mechanical_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mechanics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personnel_time_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recyclers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduling_parameters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_checkouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."truck_maintenance_blocks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_expiring_licenses"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_expiring_licenses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expiring_licenses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_team_id"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_team_id"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_team_id"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_personnel_id_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_personnel_id_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_personnel_id_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_team_id_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_team_id_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_team_id_from_auth"() TO "service_role";


















GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."collection_receipts" TO "anon";
GRANT ALL ON TABLE "public"."collection_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."drivers" TO "anon";
GRANT ALL ON TABLE "public"."drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."drivers" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_checkouts" TO "anon";
GRANT ALL ON TABLE "public"."equipment_checkouts" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_checkouts" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_inventory" TO "anon";
GRANT ALL ON TABLE "public"."equipment_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."helpers" TO "anon";
GRANT ALL ON TABLE "public"."helpers" TO "authenticated";
GRANT ALL ON TABLE "public"."helpers" TO "service_role";



GRANT ALL ON TABLE "public"."incident_reports" TO "anon";
GRANT ALL ON TABLE "public"."incident_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."incident_reports" TO "service_role";



GRANT ALL ON TABLE "public"."job_order_services" TO "anon";
GRANT ALL ON TABLE "public"."job_order_services" TO "authenticated";
GRANT ALL ON TABLE "public"."job_order_services" TO "service_role";



GRANT ALL ON TABLE "public"."job_orders" TO "anon";
GRANT ALL ON TABLE "public"."job_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."job_orders" TO "service_role";



GRANT ALL ON TABLE "public"."leaves" TO "anon";
GRANT ALL ON TABLE "public"."leaves" TO "authenticated";
GRANT ALL ON TABLE "public"."leaves" TO "service_role";



GRANT ALL ON TABLE "public"."management" TO "anon";
GRANT ALL ON TABLE "public"."management" TO "authenticated";
GRANT ALL ON TABLE "public"."management" TO "service_role";



GRANT ALL ON TABLE "public"."mechanic_consumable_checkouts" TO "anon";
GRANT ALL ON TABLE "public"."mechanic_consumable_checkouts" TO "authenticated";
GRANT ALL ON TABLE "public"."mechanic_consumable_checkouts" TO "service_role";



GRANT ALL ON TABLE "public"."mechanic_consumables" TO "anon";
GRANT ALL ON TABLE "public"."mechanic_consumables" TO "authenticated";
GRANT ALL ON TABLE "public"."mechanic_consumables" TO "service_role";



GRANT ALL ON TABLE "public"."mechanic_time_logs" TO "anon";
GRANT ALL ON TABLE "public"."mechanic_time_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."mechanic_time_logs" TO "service_role";



GRANT ALL ON TABLE "public"."mechanical_reports" TO "anon";
GRANT ALL ON TABLE "public"."mechanical_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."mechanical_reports" TO "service_role";



GRANT ALL ON TABLE "public"."mechanics" TO "anon";
GRANT ALL ON TABLE "public"."mechanics" TO "authenticated";
GRANT ALL ON TABLE "public"."mechanics" TO "service_role";



GRANT ALL ON TABLE "public"."personnel_time_logs" TO "anon";
GRANT ALL ON TABLE "public"."personnel_time_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."personnel_time_logs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recyclers" TO "anon";
GRANT ALL ON TABLE "public"."recyclers" TO "authenticated";
GRANT ALL ON TABLE "public"."recyclers" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";



GRANT ALL ON TABLE "public"."scheduling_parameters" TO "anon";
GRANT ALL ON TABLE "public"."scheduling_parameters" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduling_parameters" TO "service_role";



GRANT ALL ON TABLE "public"."tool_checkouts" TO "anon";
GRANT ALL ON TABLE "public"."tool_checkouts" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_checkouts" TO "service_role";



GRANT ALL ON TABLE "public"."tools" TO "anon";
GRANT ALL ON TABLE "public"."tools" TO "authenticated";
GRANT ALL ON TABLE "public"."tools" TO "service_role";



GRANT ALL ON TABLE "public"."truck_maintenance_blocks" TO "anon";
GRANT ALL ON TABLE "public"."truck_maintenance_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."truck_maintenance_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."trucks" TO "anon";
GRANT ALL ON TABLE "public"."trucks" TO "authenticated";
GRANT ALL ON TABLE "public"."trucks" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































