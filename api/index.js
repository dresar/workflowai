var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/src/config/env.config.ts
import * as dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
var envSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  API_PREFIX: z.string().default("/api/v1"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  AI_TIMEOUT: z.string().default("60000").transform(Number),
  AI_MAX_RETRIES: z.string().default("3").transform(Number),
  AI_COOLDOWN_MINUTES: z.string().default("5").transform(Number),
  AI_ROTATION: z.enum(["round_robin", "priority", "random", "fallback"]).default("round_robin"),
  GEMINI_API_KEYS: z.string().default(""),
  GROQ_API_KEYS: z.string().default(""),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  UPLOAD_PATH: z.string().default("./uploads"),
  MAX_UPLOAD_SIZE: z.string().default("10485760").transform(Number)
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}
var env = parsed.data;
var geminiApiKeys = env.GEMINI_API_KEYS ? env.GEMINI_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean) : [];
var groqApiKeys = env.GROQ_API_KEYS ? env.GROQ_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean) : [];
var corsOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);

// server/src/app.ts
import express from "express";
import cors from "cors";

// server/src/middleware/request-id.middleware.ts
import { v4 as uuidv4 } from "uuid";
function requestIdMiddleware(req, res, next) {
  const requestId = uuidv4();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

// server/src/logger/logger.ts
import winston from "winston";
var { combine, timestamp, json, colorize, printf, errors } = winston.format;
var isDevelopment = process.env.NODE_ENV !== "production";
var devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${ts} [${level}]${metaStr}: ${message}`;
  })
);
var prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);
var logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: isDevelopment ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
  exitOnError: false
});
var logRequest = (meta, message) => logger.info(message, { ...meta, category: "request" });
var logAI = (meta, message) => logger.info(message, { ...meta, category: "ai" });
var logRotation = (meta, message) => logger.info(message, { ...meta, category: "rotation" });
var logError = (meta, message, error) => logger.error(message, {
  ...meta,
  error: error instanceof Error ? { message: error.message, stack: error.stack } : error
});

// server/src/middleware/request-logger.middleware.ts
function requestLoggerMiddleware(req, res, next) {
  const start = Date.now();
  const requestId = req.requestId ?? "";
  logRequest({ requestId }, `\u2192 ${req.method} ${req.path}`);
  res.on("finish", () => {
    const duration = Date.now() - start;
    logRequest(
      { requestId, statusCode: res.statusCode, duration },
      `\u2190 ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  next();
}

// server/src/errors/global-error-handler.ts
import { ZodError } from "zod";

// server/src/errors/app-error.ts
var AppError = class extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details, isOperational = true) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
};

// server/src/errors/global-error-handler.ts
function globalErrorHandler(err, req, res, _next) {
  const requestId = req.requestId ?? "";
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({ field: e.path.join("."), message: e.message }));
    res.status(422).json({
      success: false,
      message: "Validation failed",
      data: null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      requestId,
      error: { code: "VALIDATION_ERROR", details }
    });
    return;
  }
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logError({ requestId }, "Non-operational error", err);
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      requestId,
      error: { code: err.code, details: err.details }
    });
    return;
  }
  logError({ requestId }, "Unhandled error", err);
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
    data: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    requestId,
    error: { code: "INTERNAL_ERROR" }
  });
}
function notFoundHandler(req, res) {
  const requestId = req.requestId ?? "";
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    data: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    requestId,
    error: { code: "ROUTE_NOT_FOUND" }
  });
}

// server/src/routes/index.ts
import { Router as Router5 } from "express";

// server/src/database/connection.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// server/src/database/schema/index.ts
var schema_exports = {};
__export(schema_exports, {
  activityLogs: () => activityLogs,
  aiProviders: () => aiProviders,
  apiKeys: () => apiKeys,
  appSettings: () => appSettings,
  canvasStructures: () => canvasStructures,
  documentTypeEnum: () => documentTypeEnum,
  generateTypeEnum: () => generateTypeEnum,
  generatedDocuments: () => generatedDocuments,
  interviewAnswers: () => interviewAnswers,
  interviewQuestions: () => interviewQuestions,
  logCategoryEnum: () => logCategoryEnum,
  logLevelEnum: () => logLevelEnum,
  projectLanguageEnum: () => projectLanguageEnum,
  projectStatusEnum: () => projectStatusEnum,
  projectTechnologies: () => projectTechnologies,
  projectTemplates: () => projectTemplates,
  projects: () => projects,
  promptTemplates: () => promptTemplates,
  questionTypeEnum: () => questionTypeEnum,
  requestLogs: () => requestLogs,
  rotationConfig: () => rotationConfig,
  rotationStrategyEnum: () => rotationStrategyEnum,
  settingTypeEnum: () => settingTypeEnum,
  techSelectionModeEnum: () => techSelectionModeEnum,
  technologies: () => technologies,
  userRoleEnum: () => userRoleEnum,
  users: () => users
});

// server/src/database/schema/users.schema.ts
import { pgTable, uuid, varchar, boolean, timestamp as timestamp2 } from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", ["user", "admin"]);
var users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: userRoleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp2("last_login_at", { withTimezone: true }),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp2("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/technologies.schema.ts
import { pgTable as pgTable2, uuid as uuid2, varchar as varchar2, text, boolean as boolean2, timestamp as timestamp3, integer } from "drizzle-orm/pg-core";
var technologies = pgTable2("technologies", {
  id: uuid2("id").primaryKey().defaultRandom(),
  name: varchar2("name", { length: 255 }).notNull().unique(),
  category: varchar2("category", { length: 100 }).notNull(),
  version: varchar2("version", { length: 50 }),
  description: text("description"),
  isActive: boolean2("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp3("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp3("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/interview-questions.schema.ts
import { pgTable as pgTable3, uuid as uuid3, text as text2, varchar as varchar3, boolean as boolean3, integer as integer2, timestamp as timestamp4 } from "drizzle-orm/pg-core";
import { pgEnum as pgEnum2 } from "drizzle-orm/pg-core";
import { jsonb } from "drizzle-orm/pg-core";
var questionTypeEnum = pgEnum2("question_type", [
  "textarea",
  "chips",
  "radio",
  "checkbox",
  "select",
  "switch"
]);
var interviewQuestions = pgTable3("interview_questions", {
  id: uuid3("id").primaryKey().defaultRandom(),
  question: text2("question").notNull(),
  type: questionTypeEnum("type").notNull(),
  options: jsonb("options").$type(),
  isRequired: boolean3("is_required").notNull().default(false),
  sortOrder: integer2("sort_order").notNull().default(0),
  isActive: boolean3("is_active").notNull().default(true),
  category: varchar3("category", { length: 100 }),
  createdAt: timestamp4("created_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/projects.schema.ts
import { pgTable as pgTable4, uuid as uuid4, varchar as varchar4, text as text3, timestamp as timestamp5 } from "drizzle-orm/pg-core";
import { pgEnum as pgEnum3 } from "drizzle-orm/pg-core";
var projectStatusEnum = pgEnum3("project_status", [
  "draft",
  "interview",
  "canvas",
  "prd",
  "architecture",
  "database",
  "api",
  "tasks",
  "prompt",
  "complete"
]);
var techSelectionModeEnum = pgEnum3("tech_selection_mode", ["auto", "manual"]);
var projectLanguageEnum = pgEnum3("project_language", ["id", "en"]);
var projects = pgTable4("projects", {
  id: uuid4("id").primaryKey().defaultRandom(),
  userId: uuid4("user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar4("name", { length: 255 }).notNull(),
  idea: text3("idea").notNull(),
  description: text3("description"),
  language: projectLanguageEnum("language").notNull().default("id"),
  preferredAiTarget: varchar4("preferred_ai_target", { length: 100 }).default("Cursor"),
  techSelectionMode: techSelectionModeEnum("tech_selection_mode").notNull().default("manual"),
  status: projectStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp5("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp5("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/project-technologies.schema.ts
import { pgTable as pgTable5, uuid as uuid5, varchar as varchar5, boolean as boolean4, timestamp as timestamp6 } from "drizzle-orm/pg-core";
var projectTechnologies = pgTable5("project_technologies", {
  id: uuid5("id").primaryKey().defaultRandom(),
  projectId: uuid5("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  category: varchar5("category", { length: 100 }).notNull(),
  technologyId: uuid5("technology_id").references(() => technologies.id, { onDelete: "set null" }),
  technologyName: varchar5("technology_name", { length: 255 }).notNull(),
  isAiSelected: boolean4("is_ai_selected").notNull().default(false),
  createdAt: timestamp6("created_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/interview-answers.schema.ts
import { pgTable as pgTable6, uuid as uuid6, jsonb as jsonb2, timestamp as timestamp7 } from "drizzle-orm/pg-core";
var interviewAnswers = pgTable6("interview_answers", {
  id: uuid6("id").primaryKey().defaultRandom(),
  projectId: uuid6("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  questionId: uuid6("question_id").notNull().references(() => interviewQuestions.id, { onDelete: "cascade" }),
  answer: jsonb2("answer").notNull(),
  createdAt: timestamp7("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp7("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/canvas-structures.schema.ts
import { pgTable as pgTable7, uuid as uuid7, jsonb as jsonb3, boolean as boolean5, timestamp as timestamp8 } from "drizzle-orm/pg-core";
var canvasStructures = pgTable7("canvas_structures", {
  id: uuid7("id").primaryKey().defaultRandom(),
  projectId: uuid7("project_id").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  features: jsonb3("features").notNull().default([]),
  isAiGenerated: boolean5("is_ai_generated").notNull().default(false),
  createdAt: timestamp8("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp8("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/generated-documents.schema.ts
import { pgTable as pgTable8, uuid as uuid8, text as text4, varchar as varchar6, boolean as boolean6, integer as integer3, timestamp as timestamp9 } from "drizzle-orm/pg-core";
import { pgEnum as pgEnum4 } from "drizzle-orm/pg-core";
var documentTypeEnum = pgEnum4("document_type", [
  "prd",
  "architecture",
  "database",
  "api",
  "tasks",
  "prompt",
  "canvas"
]);
var generatedDocuments = pgTable8("generated_documents", {
  id: uuid8("id").primaryKey().defaultRandom(),
  projectId: uuid8("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: documentTypeEnum("type").notNull(),
  content: text4("content").notNull(),
  version: integer3("version").notNull().default(1),
  providerUsed: varchar6("provider_used", { length: 100 }),
  modelUsed: varchar6("model_used", { length: 255 }),
  tokensUsed: integer3("tokens_used"),
  generationTimeMs: integer3("generation_time_ms"),
  isCurrent: boolean6("is_current").notNull().default(true),
  createdAt: timestamp9("created_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/ai-providers.schema.ts
import { pgTable as pgTable9, uuid as uuid9, varchar as varchar7, text as text5, boolean as boolean7, integer as integer4, timestamp as timestamp10 } from "drizzle-orm/pg-core";
var aiProviders = pgTable9("ai_providers", {
  id: uuid9("id").primaryKey().defaultRandom(),
  name: varchar7("name", { length: 100 }).notNull().unique(),
  displayName: varchar7("display_name", { length: 255 }).notNull(),
  baseUrl: text5("base_url"),
  defaultModel: varchar7("default_model", { length: 255 }).notNull(),
  isActive: boolean7("is_active").notNull().default(true),
  priority: integer4("priority").notNull().default(99),
  timeoutMs: integer4("timeout_ms").notNull().default(6e4),
  maxRetries: integer4("max_retries").notNull().default(3),
  createdAt: timestamp10("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp10("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/api-keys.schema.ts
import { pgTable as pgTable10, uuid as uuid10, varchar as varchar8, text as text6, boolean as boolean8, integer as integer5, timestamp as timestamp11 } from "drizzle-orm/pg-core";
var apiKeys = pgTable10("api_keys", {
  id: uuid10("id").primaryKey().defaultRandom(),
  providerId: uuid10("provider_id").notNull().references(() => aiProviders.id, { onDelete: "cascade" }),
  label: varchar8("label", { length: 255 }).notNull(),
  keyEncrypted: text6("key_encrypted").notNull(),
  keyPreview: varchar8("key_preview", { length: 20 }).notNull(),
  isActive: boolean8("is_active").notNull().default(true),
  priority: integer5("priority").notNull().default(99),
  totalRequests: integer5("total_requests").notNull().default(0),
  failedRequests: integer5("failed_requests").notNull().default(0),
  quotaLimit: integer5("quota_limit"),
  quotaUsed: integer5("quota_used").notNull().default(0),
  cooldownUntil: timestamp11("cooldown_until", { withTimezone: true }),
  lastUsedAt: timestamp11("last_used_at", { withTimezone: true }),
  createdAt: timestamp11("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp11("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/rotation-config.schema.ts
import { pgTable as pgTable11, uuid as uuid11, boolean as boolean9, integer as integer6, timestamp as timestamp12 } from "drizzle-orm/pg-core";
import { pgEnum as pgEnum5 } from "drizzle-orm/pg-core";
import { jsonb as jsonb4 } from "drizzle-orm/pg-core";
var rotationStrategyEnum = pgEnum5("rotation_strategy", [
  "round_robin",
  "priority",
  "random",
  "fallback"
]);
var rotationConfig = pgTable11("rotation_config", {
  id: uuid11("id").primaryKey().defaultRandom(),
  strategy: rotationStrategyEnum("strategy").notNull().default("round_robin"),
  autoRotation: boolean9("auto_rotation").notNull().default(true),
  autoRetry: boolean9("auto_retry").notNull().default(true),
  maxRetries: integer6("max_retries").notNull().default(3),
  timeoutSeconds: integer6("timeout_seconds").notNull().default(60),
  cooldownMinutes: integer6("cooldown_minutes").notNull().default(5),
  providerOrder: jsonb4("provider_order").$type().notNull().default([]),
  updatedAt: timestamp12("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/prompt-templates.schema.ts
import { pgTable as pgTable12, uuid as uuid12, varchar as varchar9, text as text7, boolean as boolean10, integer as integer7, decimal, timestamp as timestamp13 } from "drizzle-orm/pg-core";
import { pgEnum as pgEnum6 } from "drizzle-orm/pg-core";
var generateTypeEnum = pgEnum6("generate_type", [
  "prd",
  "architecture",
  "database",
  "api",
  "tasks",
  "prompt",
  "canvas",
  "workflow"
]);
var promptTemplates = pgTable12("prompt_templates", {
  id: uuid12("id").primaryKey().defaultRandom(),
  generateType: generateTypeEnum("generate_type").notNull(),
  name: varchar9("name", { length: 255 }).notNull(),
  systemPrompt: text7("system_prompt").notNull(),
  developerPrompt: text7("developer_prompt"),
  userPrompt: text7("user_prompt").notNull(),
  model: varchar9("model", { length: 255 }),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  maxTokens: integer7("max_tokens").default(8192),
  topP: decimal("top_p", { precision: 3, scale: 2 }).default("0.9"),
  isActive: boolean10("is_active").notNull().default(true),
  isDefault: boolean10("is_default").notNull().default(false),
  version: integer7("version").notNull().default(1),
  createdAt: timestamp13("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp13("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/project-templates.schema.ts
import { pgTable as pgTable13, uuid as uuid13, varchar as varchar10, text as text8, boolean as boolean11, integer as integer8, timestamp as timestamp14 } from "drizzle-orm/pg-core";
import { jsonb as jsonb5 } from "drizzle-orm/pg-core";
var projectTemplates = pgTable13("project_templates", {
  id: uuid13("id").primaryKey().defaultRandom(),
  name: varchar10("name", { length: 255 }).notNull(),
  category: varchar10("category", { length: 100 }).notNull(),
  description: text8("description"),
  ideaTemplate: text8("idea_template").notNull(),
  defaultTechnologies: jsonb5("default_technologies").$type().default({}),
  isActive: boolean11("is_active").notNull().default(true),
  sortOrder: integer8("sort_order").notNull().default(0),
  createdAt: timestamp14("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp14("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/request-logs.schema.ts
import { pgTable as pgTable14, uuid as uuid14, varchar as varchar11, text as text9, boolean as boolean12, integer as integer9, timestamp as timestamp15 } from "drizzle-orm/pg-core";
import { jsonb as jsonb6 } from "drizzle-orm/pg-core";
var requestLogs = pgTable14("request_logs", {
  id: uuid14("id").primaryKey().defaultRandom(),
  requestId: varchar11("request_id", { length: 36 }).notNull(),
  projectId: uuid14("project_id"),
  generateType: varchar11("generate_type", { length: 100 }),
  providerName: varchar11("provider_name", { length: 100 }),
  model: varchar11("model", { length: 255 }),
  apiKeyId: uuid14("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  promptTokens: integer9("prompt_tokens"),
  completionTokens: integer9("completion_tokens"),
  totalTokens: integer9("total_tokens"),
  latencyMs: integer9("latency_ms"),
  success: boolean12("success").notNull().default(false),
  errorMessage: text9("error_message"),
  rotationEvents: jsonb6("rotation_events").$type().default([]),
  createdAt: timestamp15("created_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/activity-logs.schema.ts
import { pgTable as pgTable15, uuid as uuid15, varchar as varchar12, text as text10, timestamp as timestamp16 } from "drizzle-orm/pg-core";
import { pgEnum as pgEnum7 } from "drizzle-orm/pg-core";
import { jsonb as jsonb7 } from "drizzle-orm/pg-core";
var logLevelEnum = pgEnum7("log_level", ["debug", "info", "warn", "error"]);
var logCategoryEnum = pgEnum7("log_category", [
  "request",
  "ai",
  "rotation",
  "database",
  "auth",
  "system"
]);
var activityLogs = pgTable15("activity_logs", {
  id: uuid15("id").primaryKey().defaultRandom(),
  requestId: varchar12("request_id", { length: 36 }),
  level: logLevelEnum("level").notNull().default("info"),
  category: logCategoryEnum("category").notNull().default("system"),
  message: text10("message").notNull(),
  metadata: jsonb7("metadata").$type().default({}),
  createdAt: timestamp16("created_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/schema/app-settings.schema.ts
import { pgTable as pgTable16, varchar as varchar13, text as text11, timestamp as timestamp17 } from "drizzle-orm/pg-core";
import { pgEnum as pgEnum8 } from "drizzle-orm/pg-core";
var settingTypeEnum = pgEnum8("setting_type", ["string", "number", "boolean", "json"]);
var appSettings = pgTable16("app_settings", {
  key: varchar13("key", { length: 255 }).primaryKey(),
  value: text11("value").notNull(),
  type: settingTypeEnum("type").notNull().default("string"),
  description: text11("description"),
  updatedAt: timestamp17("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// server/src/database/connection.ts
var sql = neon(env.DATABASE_URL);
var db = drizzle(sql, { schema: schema_exports });

// server/src/routes/app.routes.ts
import { Router } from "express";

// server/src/middleware/validate.middleware.ts
import { ZodError as ZodError2 } from "zod";
function validate(schema, target = "body") {
  return async (req, _res, next) => {
    try {
      const parsed2 = await schema.parseAsync(req[target]);
      req[target] = parsed2;
      next();
    } catch (error) {
      if (error instanceof ZodError2) {
        next(error);
      } else {
        next(error);
      }
    }
  };
}

// server/src/modules/project/project.validation.ts
import { z as z2 } from "zod";
var createProjectSchema = z2.object({
  name: z2.string().min(1).max(255),
  idea: z2.string().min(10, "Idea must be at least 10 characters"),
  language: z2.enum(["id", "en"]).default("id"),
  preferredAiTarget: z2.string().max(100).optional(),
  techSelectionMode: z2.enum(["auto", "manual"]).default("manual")
});
var updateProjectSchema = z2.object({
  name: z2.string().min(1).max(255).optional(),
  description: z2.string().optional(),
  status: z2.enum(["draft", "interview", "canvas", "prd", "architecture", "database", "api", "tasks", "prompt", "complete"]).optional(),
  preferredAiTarget: z2.string().max(100).optional()
});
var saveTechnologiesSchema = z2.object({
  technologies: z2.array(z2.object({
    category: z2.string().min(1).max(100),
    technologyId: z2.string().uuid().optional(),
    technologyName: z2.string().min(1).max(255),
    isAiSelected: z2.boolean().default(false)
  })).min(1)
});
var saveAnswersSchema = z2.object({
  answers: z2.array(z2.object({
    questionId: z2.string(),
    question: z2.string().optional(),
    answer: z2.union([z2.string(), z2.array(z2.string()), z2.boolean()])
  })).min(1)
});
var saveCanvasSchema = z2.object({
  features: z2.union([z2.array(z2.any()), z2.record(z2.any())]),
  isAiGenerated: z2.boolean().default(false)
});
var projectIdParamSchema = z2.object({
  id: z2.string().uuid("Invalid project ID")
});
var documentTypeParamSchema = z2.object({
  id: z2.string().uuid(),
  type: z2.enum(["prd", "architecture", "database", "api", "tasks", "prompt", "canvas"])
});
var saveDocumentSchema = z2.object({
  content: z2.string().min(1, "Content cannot be empty")
});

// server/src/modules/project/project.repository.ts
import { eq, and, desc } from "drizzle-orm";

// server/src/shared/utils/pagination.util.ts
function parsePagination(query) {
  const page = Math.max(1, parseInt(String(query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? "20"), 10) || 20));
  return { page, limit };
}
function calcOffset(page, limit) {
  return (page - 1) * limit;
}
function calcTotalPages(total, limit) {
  return Math.ceil(total / limit);
}

// server/src/modules/project/project.repository.ts
import { sql as sql2 } from "drizzle-orm";
var ProjectRepository = class {
  async findById(id) {
    const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return row;
  }
  async findAll(params) {
    const offset = calcOffset(params.page, params.limit);
    const [items, [{ count }]] = await Promise.all([
      db.select().from(projects).orderBy(desc(projects.createdAt)).limit(params.limit).offset(offset),
      db.select({ count: sql2`count(*)` }).from(projects)
    ]);
    return { items, total: Number(count) };
  }
  async create(data) {
    const [row] = await db.insert(projects).values(data).returning();
    return row;
  }
  async update(id, data) {
    const [row] = await db.update(projects).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(projects.id, id)).returning();
    return row;
  }
  async delete(id) {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async saveTechnologies(projectId, techs) {
    await db.delete(projectTechnologies).where(eq(projectTechnologies.projectId, projectId));
    if (techs.length === 0) return [];
    return db.insert(projectTechnologies).values(techs).returning();
  }
  async findTechnologies(projectId) {
    return db.select().from(projectTechnologies).where(eq(projectTechnologies.projectId, projectId));
  }
  async upsertAnswer(data) {
    const existing = await db.select().from(interviewAnswers).where(and(eq(interviewAnswers.projectId, data.projectId), eq(interviewAnswers.questionId, data.questionId))).limit(1);
    if (existing.length > 0) {
      const [row2] = await db.update(interviewAnswers).set({ answer: data.answer, updatedAt: /* @__PURE__ */ new Date() }).where(eq(interviewAnswers.id, existing[0].id)).returning();
      return row2;
    }
    const [row] = await db.insert(interviewAnswers).values(data).returning();
    return row;
  }
  async findAnswers(projectId) {
    return db.select().from(interviewAnswers).where(eq(interviewAnswers.projectId, projectId));
  }
  async saveCanvas(data) {
    const existing = await db.select().from(canvasStructures).where(eq(canvasStructures.projectId, data.projectId)).limit(1);
    if (existing.length > 0) {
      const [row2] = await db.update(canvasStructures).set({ features: data.features, isAiGenerated: data.isAiGenerated, updatedAt: /* @__PURE__ */ new Date() }).where(eq(canvasStructures.projectId, data.projectId)).returning();
      return row2;
    }
    const [row] = await db.insert(canvasStructures).values(data).returning();
    return row;
  }
  async findCanvas(projectId) {
    const [row] = await db.select().from(canvasStructures).where(eq(canvasStructures.projectId, projectId)).limit(1);
    return row;
  }
  async findDocuments(projectId) {
    return db.select().from(generatedDocuments).where(eq(generatedDocuments.projectId, projectId)).orderBy(desc(generatedDocuments.createdAt));
  }
  async findCurrentDocument(projectId, type) {
    const [row] = await db.select().from(generatedDocuments).where(and(
      eq(generatedDocuments.projectId, projectId),
      eq(generatedDocuments.type, type),
      eq(generatedDocuments.isCurrent, true)
    )).limit(1);
    return row;
  }
  async findDocumentHistory(projectId, type) {
    return db.select().from(generatedDocuments).where(and(
      eq(generatedDocuments.projectId, projectId),
      eq(generatedDocuments.type, type)
    )).orderBy(desc(generatedDocuments.version));
  }
  async saveDocument(data) {
    await db.update(generatedDocuments).set({ isCurrent: false }).where(and(
      eq(generatedDocuments.projectId, data.projectId),
      eq(generatedDocuments.type, data.type)
    ));
    const [lastVersion] = await db.select({ version: generatedDocuments.version }).from(generatedDocuments).where(and(
      eq(generatedDocuments.projectId, data.projectId),
      eq(generatedDocuments.type, data.type)
    )).orderBy(desc(generatedDocuments.version)).limit(1);
    const version = (lastVersion?.version ?? 0) + 1;
    const [row] = await db.insert(generatedDocuments).values({ ...data, version, isCurrent: true }).returning();
    return row;
  }
  async deleteDocuments(projectId) {
    await db.delete(generatedDocuments).where(eq(generatedDocuments.projectId, projectId));
  }
};

// server/src/errors/domain-errors.ts
var NotFoundError = class extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
};
var UnauthorizedError = class extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
};
var AIError = class extends AppError {
  constructor(message, details) {
    super(message, 503, "AI_ERROR", details);
    this.name = "AIError";
  }
};
var AITimeoutError = class extends AppError {
  constructor(provider, timeoutMs) {
    super(`AI provider ${provider} timed out after ${timeoutMs}ms`, 504, "AI_TIMEOUT");
    this.name = "AITimeoutError";
  }
};
var AllProvidersExhaustedError = class extends AppError {
  constructor() {
    super("All AI providers are currently unavailable", 503, "ALL_PROVIDERS_EXHAUSTED");
    this.name = "AllProvidersExhaustedError";
  }
};

// server/src/ai/rotation/rotation-engine.ts
import { eq as eq2, and as and2, isNull, or, lte, asc } from "drizzle-orm";

// server/src/shared/utils/crypto.util.ts
import crypto2 from "crypto";
var ALGORITHM = "aes-256-cbc";
var KEY_LENGTH = 32;
function getKey() {
  const raw = env.ENCRYPTION_KEY;
  return Buffer.from(raw.padEnd(KEY_LENGTH, "0").slice(0, KEY_LENGTH), "utf8");
}
function encrypt(plaintext) {
  const iv = crypto2.randomBytes(16);
  const cipher = crypto2.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}
function decrypt(ciphertext) {
  const [ivHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !encryptedHex) throw new Error("Invalid encrypted value format");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto2.createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
function maskKey(key) {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// server/src/ai/rotation/rotation-engine.ts
var RotationEngine = class {
  constructor() {
    this.events = [];
    this.triedKeyIds = /* @__PURE__ */ new Set();
    this.triedProviderIds = /* @__PURE__ */ new Set();
  }
  getEvents() {
    return this.events;
  }
  markProviderFailed(providerId) {
    this.triedProviderIds.add(providerId);
  }
  addEvent(event) {
    this.events.push({ ...event, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
  async selectKey(preferredProviderName) {
    const config2 = await this.getConfig();
    const strategy = config2?.strategy ?? "round_robin";
    const now = /* @__PURE__ */ new Date();
    const allActiveProviders = await db.select().from(aiProviders).where(eq2(aiProviders.isActive, true)).orderBy(asc(aiProviders.priority));
    let orderedProviders = allActiveProviders;
    if (preferredProviderName) {
      const preferred = orderedProviders.find((p) => p.name === preferredProviderName);
      const rest = orderedProviders.filter((p) => p.name !== preferredProviderName);
      if (preferred) orderedProviders = [preferred, ...rest];
    }
    for (const provider of orderedProviders) {
      if (this.triedProviderIds.has(provider.id)) continue;
      const keys = await db.select().from(apiKeys).where(
        and2(
          eq2(apiKeys.providerId, provider.id),
          eq2(apiKeys.isActive, true),
          or(isNull(apiKeys.cooldownUntil), lte(apiKeys.cooldownUntil, now))
        )
      ).orderBy(asc(apiKeys.priority));
      const availableKeys = keys.filter((k) => !this.triedKeyIds.has(k.id));
      if (availableKeys.length === 0) {
        logRotation({ providerId: provider.id }, `No available keys for provider ${provider.name}`);
        this.triedProviderIds.add(provider.id);
        continue;
      }
      const selectedKey = this.pickKey(availableKeys, strategy);
      this.triedKeyIds.add(selectedKey.id);
      let decryptedKey;
      try {
        decryptedKey = decrypt(selectedKey.keyEncrypted);
      } catch {
        logError({}, `Failed to decrypt key ${selectedKey.id}`);
        continue;
      }
      this.addEvent({
        type: "selected",
        providerId: provider.id,
        providerName: provider.name,
        apiKeyId: selectedKey.id
      });
      logRotation(
        { provider: provider.name, keyId: selectedKey.id },
        `Selected API key for ${provider.name}`
      );
      return {
        id: selectedKey.id,
        apiKey: decryptedKey,
        providerId: provider.id,
        providerName: provider.name,
        model: provider.defaultModel,
        timeoutMs: provider.timeoutMs,
        maxRetries: provider.maxRetries
      };
    }
    throw new AllProvidersExhaustedError();
  }
  async markKeyFailed(keyId, cooldownMinutes) {
    const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60 * 1e3);
    await db.update(apiKeys).set({
      failedRequests: db.$count(apiKeys, eq2(apiKeys.id, keyId)),
      cooldownUntil,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(apiKeys.id, keyId));
    this.addEvent({ type: "cooldown", apiKeyId: keyId, reason: `Cooldown until ${cooldownUntil.toISOString()}` });
    logRotation({ keyId, cooldownUntil }, "Key marked as cooling down");
  }
  async markKeySuccess(keyId) {
    await db.update(apiKeys).set({
      totalRequests: db.$count(apiKeys, eq2(apiKeys.id, keyId)),
      lastUsedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(apiKeys.id, keyId));
  }
  pickKey(keys, strategy) {
    switch (strategy) {
      case "random":
        return keys[Math.floor(Math.random() * keys.length)];
      case "priority":
        return keys[0];
      case "round_robin":
        return keys[0];
      case "fallback":
        return keys[0];
      default:
        return keys[0];
    }
  }
  async getConfig() {
    const [config2] = await db.select().from(rotationConfig).limit(1);
    return config2;
  }
};

// server/src/ai/providers/gemini.provider.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
var GeminiProvider = class {
  constructor() {
    this.name = "gemini";
  }
  async generate(prompt, config2) {
    const start = Date.now();
    const client = new GoogleGenerativeAI(config2.apiKey);
    const model = client.getGenerativeModel({
      model: config2.model,
      systemInstruction: [prompt.systemPrompt, prompt.developerPrompt].filter(Boolean).join("\n\n"),
      generationConfig: {
        temperature: config2.temperature ?? prompt.config.temperature,
        maxOutputTokens: config2.maxTokens ?? prompt.config.maxTokens,
        topP: config2.topP ?? prompt.config.topP
      }
    });
    logAI({ provider: this.name, model: config2.model }, "Gemini generate started");
    try {
      const timeoutMs = config2.timeoutMs ?? 12e4;
      let fullContent = "";
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let isDone = false;
      let currentPrompt = prompt.userPrompt;
      let maxContinuations = 3;
      while (!isDone && maxContinuations > 0) {
        const generatePromise = model.generateContent(currentPrompt);
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new AITimeoutError(this.name, timeoutMs)), timeoutMs)
        );
        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = result.response;
        const text12 = response.text();
        fullContent += text12;
        const usage = response.usageMetadata;
        if (usage) {
          totalPromptTokens += usage.promptTokenCount ?? 0;
          totalCompletionTokens += usage.candidatesTokenCount ?? 0;
        }
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === "MAX_TOKENS") {
          currentPrompt = `This is what you generated so far:

${fullContent}

Your output was cut off because you reached the maximum token limit. PLEASE CONTINUE EXACTLY FROM WHERE YOU LEFT OFF. Do not repeat the previous text. Do not add introductory text. Just output the direct continuation of the last sentence/word.`;
          maxContinuations--;
          logAI({ provider: this.name }, `Hit MAX_TOKENS, continuing... (${maxContinuations} left)`);
        } else {
          isDone = true;
        }
      }
      const latencyMs = Date.now() - start;
      logAI({ provider: this.name, latencyMs, tokens: totalPromptTokens + totalCompletionTokens }, "Gemini generate completed");
      return {
        content: fullContent,
        provider: this.name,
        model: config2.model,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens,
        latencyMs
      };
    } catch (err) {
      if (err instanceof AITimeoutError) throw err;
      throw new AIError(`Gemini error: ${err instanceof Error ? err.message : "Unknown"}`, err);
    }
  }
  async validateKey(apiKey) {
    try {
      const client = new GoogleGenerativeAI(apiKey);
      const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
      await model.generateContent("test");
      return true;
    } catch {
      return false;
    }
  }
};

// server/src/ai/providers/groq.provider.ts
import Groq from "groq-sdk";
var GroqProvider = class {
  constructor() {
    this.name = "groq";
  }
  async generate(prompt, config2) {
    const start = Date.now();
    const client = new Groq({ apiKey: config2.apiKey });
    const messages = [];
    const systemContent = [prompt.systemPrompt, prompt.developerPrompt].filter(Boolean).join("\n\n");
    if (systemContent) messages.push({ role: "system", content: systemContent });
    messages.push({ role: "user", content: prompt.userPrompt });
    logAI({ provider: this.name, model: config2.model }, "Groq generate started");
    try {
      const timeoutMs = config2.timeoutMs ?? 12e4;
      let fullContent = "";
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let isDone = false;
      let currentMessages = [...messages];
      let maxContinuations = 4;
      const requestedTokens = config2.maxTokens ?? prompt.config.maxTokens ?? 6e3;
      const safeMaxTokens = Math.min(requestedTokens, 6e3);
      while (!isDone && maxContinuations > 0) {
        const generatePromise = client.chat.completions.create({
          model: config2.model,
          messages: currentMessages,
          temperature: config2.temperature ?? prompt.config.temperature,
          max_tokens: safeMaxTokens,
          top_p: config2.topP ?? prompt.config.topP
        });
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new AITimeoutError(this.name, timeoutMs)), timeoutMs)
        );
        const result = await Promise.race([generatePromise, timeoutPromise]);
        const text12 = result.choices[0]?.message?.content ?? "";
        fullContent += text12;
        const usage = result.usage;
        if (usage) {
          totalPromptTokens += usage.prompt_tokens ?? 0;
          totalCompletionTokens += usage.completion_tokens ?? 0;
        }
        const finishReason = result.choices[0]?.finish_reason;
        if (finishReason === "length") {
          currentMessages = [
            { role: "user", content: `This is what you generated so far:

${fullContent}

Your output was cut off because you reached the maximum token limit. PLEASE CONTINUE EXACTLY FROM WHERE YOU LEFT OFF. Do not repeat the previous text. Do not add introductory text. Just output the direct continuation of the last sentence/word.` }
          ];
          maxContinuations--;
          logAI({ provider: this.name }, `Hit length limit, continuing... (${maxContinuations} left)`);
        } else {
          isDone = true;
        }
      }
      const latencyMs = Date.now() - start;
      logAI({ provider: this.name, latencyMs, tokens: totalPromptTokens + totalCompletionTokens }, "Groq generate completed");
      return {
        content: fullContent,
        provider: this.name,
        model: config2.model,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens,
        latencyMs
      };
    } catch (err) {
      if (err instanceof AITimeoutError) throw err;
      throw new AIError(`Groq error: ${err instanceof Error ? err.message : "Unknown"}`, err);
    }
  }
  async validateKey(apiKey) {
    try {
      const client = new Groq({ apiKey });
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
};

// server/src/ai/providers/provider.registry.ts
var registry = /* @__PURE__ */ new Map();
registry.set("gemini", new GeminiProvider());
registry.set("groq", new GroqProvider());
function getProvider(name) {
  return registry.get(name);
}

// server/src/modules/project/project.service.ts
var repo = new ProjectRepository();
var ProjectService = class {
  async create(dto) {
    return repo.create({
      name: dto.name,
      idea: dto.idea,
      language: dto.language,
      preferredAiTarget: dto.preferredAiTarget,
      techSelectionMode: dto.techSelectionMode,
      status: "draft"
    });
  }
  async list(params) {
    return repo.findAll(params);
  }
  async getById(id) {
    const project = await repo.findById(id);
    if (!project) throw new NotFoundError("Project");
    return project;
  }
  async getFullProject(id) {
    const project = await repo.findById(id);
    if (!project) throw new NotFoundError("Project");
    const [technologies2, answers, canvas, documents] = await Promise.all([
      repo.findTechnologies(id),
      repo.findAnswers(id),
      repo.findCanvas(id),
      repo.findDocuments(id)
    ]);
    return { ...project, technologies: technologies2, answers, canvas, documents };
  }
  async update(id, dto) {
    const project = await repo.update(id, dto);
    if (!project) throw new NotFoundError("Project");
    return project;
  }
  async remove(id) {
    const deleted = await repo.delete(id);
    if (!deleted) throw new NotFoundError("Project");
  }
  async saveTechnologies(projectId, dto) {
    await this.getById(projectId);
    const techs = dto.technologies.map((t) => ({ ...t, projectId }));
    return repo.saveTechnologies(projectId, techs);
  }
  async getTechnologies(projectId) {
    await this.getById(projectId);
    return repo.findTechnologies(projectId);
  }
  async saveAnswers(projectId, dto) {
    const project = await this.getById(projectId);
    const serialized = JSON.stringify(dto.answers);
    let autoName = project.name;
    try {
      const rotationEngine = new RotationEngine();
      const selectedKey = await rotationEngine.selectKey();
      const provider = getProvider(selectedKey.providerName);
      if (provider) {
        const languageLabel = project.language === "id" ? "Indonesian" : "English";
        const systemPrompt = `You are a creative Product Manager. Generate a very brief, professional, catchy, and descriptive software project title (maximum 3-4 words) in ${languageLabel} based on the user's software idea and their answers.
Return ONLY the raw title without any extra text, quotes, or markdown code block.`;
        const userPrompt = `Project Idea: ${project.idea}
Detailed Answers: ${serialized}`;
        const result = await provider.generate({
          systemPrompt,
          userPrompt,
          config: {
            model: selectedKey.model,
            temperature: 0.7,
            maxTokens: 50,
            topP: 0.9
          }
        }, {
          apiKey: selectedKey.apiKey,
          model: selectedKey.model,
          timeoutMs: 1e4
        });
        const generatedTitle = result.content.replace(/["']/g, "").trim();
        if (generatedTitle && generatedTitle.length > 2 && generatedTitle.length < 50) {
          autoName = generatedTitle;
          await rotationEngine.markKeySuccess(selectedKey.id);
        }
      }
    } catch (err) {
      console.error("Failed to auto-generate project title:", err);
    }
    await repo.update(projectId, {
      name: autoName,
      description: serialized,
      status: "interview"
    });
    return dto.answers;
  }
  async getAnswers(projectId) {
    const project = await this.getById(projectId);
    if (project.description) {
      try {
        const parsed2 = JSON.parse(project.description);
        if (Array.isArray(parsed2)) {
          return parsed2;
        }
      } catch {
      }
    }
    return [];
  }
  async saveCanvas(projectId, dto) {
    await this.getById(projectId);
    const canvas = await repo.saveCanvas({ projectId, ...dto });
    await repo.update(projectId, { status: "canvas" });
    return canvas;
  }
  async getCanvas(projectId) {
    await this.getById(projectId);
    return repo.findCanvas(projectId);
  }
  async getDocuments(projectId) {
    await this.getById(projectId);
    return repo.findDocuments(projectId);
  }
  async getDocumentByType(projectId, type) {
    await this.getById(projectId);
    const doc = await repo.findCurrentDocument(projectId, type);
    if (!doc) throw new NotFoundError(`${type} document`);
    return doc;
  }
  async getDocumentHistory(projectId, type) {
    await this.getById(projectId);
    return repo.findDocumentHistory(projectId, type);
  }
  async saveDocumentManual(projectId, type, dto) {
    await this.getById(projectId);
    const doc = await repo.saveDocument({
      projectId,
      type,
      content: dto.content,
      providerUsed: "manual",
      modelUsed: "manual",
      tokensUsed: 0,
      generationTimeMs: 0
    });
    const statusMap = {
      prd: "prd",
      architecture: "architecture",
      database: "database",
      api: "api",
      tasks: "tasks",
      prompt: "prompt"
    };
    const newStatus = statusMap[type];
    if (newStatus) {
      await repo.update(projectId, { status: newStatus });
    }
    return doc;
  }
};

// server/src/shared/utils/response.util.ts
function sendSuccess(res, data, message = "Success", statusCode = 200, metadata) {
  const requestId = res.req.requestId ?? "";
  const response = {
    success: true,
    message,
    data,
    metadata,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    requestId
  };
  res.status(statusCode).json(response);
}
function sendCreated(res, data, message = "Created successfully") {
  sendSuccess(res, data, message, 201);
}
function sendNoContent(res) {
  res.status(204).send();
}

// server/src/modules/project/project.controller.ts
var service = new ProjectService();
async function listProjects(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || "50", 10);
    const page = parseInt(req.query.page || "1", 10);
    const result = await service.list({ page, limit });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
async function createProject(req, res, next) {
  try {
    const project = await service.create(req.body);
    sendCreated(res, project, "Project created successfully");
  } catch (err) {
    next(err);
  }
}
async function getProject(req, res, next) {
  try {
    const project = await service.getFullProject(req.params.id);
    sendSuccess(res, project);
  } catch (err) {
    next(err);
  }
}
async function updateProject(req, res, next) {
  try {
    const project = await service.update(req.params.id, req.body);
    sendSuccess(res, project, "Project updated");
  } catch (err) {
    next(err);
  }
}
async function deleteProject(req, res, next) {
  try {
    await service.remove(req.params.id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
async function saveTechnologies(req, res, next) {
  try {
    const result = await service.saveTechnologies(req.params.id, req.body);
    sendSuccess(res, result, "Technologies saved");
  } catch (err) {
    next(err);
  }
}
async function getTechnologies(req, res, next) {
  try {
    const result = await service.getTechnologies(req.params.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
async function saveAnswers(req, res, next) {
  try {
    const result = await service.saveAnswers(req.params.id, req.body);
    sendSuccess(res, result, "Answers saved");
  } catch (err) {
    next(err);
  }
}
async function getAnswers(req, res, next) {
  try {
    const result = await service.getAnswers(req.params.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
async function saveCanvas(req, res, next) {
  try {
    const result = await service.saveCanvas(req.params.id, req.body);
    sendSuccess(res, result, "Canvas saved");
  } catch (err) {
    next(err);
  }
}
async function getCanvas(req, res, next) {
  try {
    const result = await service.getCanvas(req.params.id);
    sendSuccess(res, result ?? null);
  } catch (err) {
    next(err);
  }
}
async function getDocuments(req, res, next) {
  try {
    const result = await service.getDocuments(req.params.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
async function getDocumentByType(req, res, next) {
  try {
    const result = await service.getDocumentByType(req.params.id, req.params.type);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
async function getDocumentHistory(req, res, next) {
  try {
    const result = await service.getDocumentHistory(req.params.id, req.params.type);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
async function saveDocumentManual(req, res, next) {
  try {
    const result = await service.saveDocumentManual(req.params.id, req.params.type, req.body);
    sendSuccess(res, result, "Document saved manually");
  } catch (err) {
    next(err);
  }
}

// server/src/modules/technology/technology.repository.ts
import { eq as eq3, asc as asc2, sql as sql3 } from "drizzle-orm";
var TechnologyRepository = class {
  async findAll(params) {
    const { page, limit, category, search, activeOnly } = params;
    const offset = calcOffset(page, limit);
    const where = sql3`TRUE`;
    const conditions = [];
    if (activeOnly) conditions.push(eq3(technologies.isActive, true));
    if (category && category !== "all") conditions.push(eq3(technologies.category, category));
    const query = db.select().from(technologies).where(
      conditions.length > 0 ? sql3`${conditions.reduce((acc, c) => sql3`${acc} AND ${c}`, sql3`TRUE`)}` : void 0
    ).orderBy(asc2(technologies.sortOrder), asc2(technologies.name)).limit(limit).offset(offset);
    const countQuery = db.select({ count: sql3`count(*)` }).from(technologies);
    const [items, [{ count }]] = await Promise.all([query, countQuery]);
    return { items, total: Number(count) };
  }
  async findById(id) {
    const [row] = await db.select().from(technologies).where(eq3(technologies.id, id)).limit(1);
    return row;
  }
  async findActive() {
    return db.select().from(technologies).where(eq3(technologies.isActive, true)).orderBy(asc2(technologies.sortOrder));
  }
  async findCategories() {
    const rows = await db.selectDistinct({ category: technologies.category }).from(technologies).orderBy(asc2(technologies.category));
    return rows.map((r) => r.category);
  }
  async create(data) {
    const [row] = await db.insert(technologies).values(data).returning();
    return row;
  }
  async update(id, data) {
    const [row] = await db.update(technologies).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(technologies.id, id)).returning();
    return row;
  }
  async delete(id) {
    const result = await db.delete(technologies).where(eq3(technologies.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async toggleActive(id, isActive) {
    return this.update(id, { isActive });
  }
};

// server/src/modules/technology/technology.service.ts
var TechnologyService = class {
  constructor() {
    this.repo = new TechnologyRepository();
  }
  async list(query) {
    const pagination = parsePagination(query);
    const category = typeof query.category === "string" ? query.category : void 0;
    const search = typeof query.search === "string" ? query.search : void 0;
    const activeOnly = query.active === "true";
    const { items, total } = await this.repo.findAll({ ...pagination, category, search, activeOnly });
    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: calcTotalPages(total, pagination.limit)
    };
  }
  async listActive() {
    return this.repo.findActive();
  }
  async getById(id) {
    const tech = await this.repo.findById(id);
    if (!tech) throw new NotFoundError("Technology");
    return tech;
  }
  async getCategories() {
    return this.repo.findCategories();
  }
  async create(data) {
    return this.repo.create(data);
  }
  async update(id, data) {
    const tech = await this.repo.update(id, data);
    if (!tech) throw new NotFoundError("Technology");
    return tech;
  }
  async remove(id) {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError("Technology");
  }
  async toggleActive(id, isActive) {
    const tech = await this.repo.toggleActive(id, isActive);
    if (!tech) throw new NotFoundError("Technology");
    return tech;
  }
};

// server/src/modules/technology/technology.controller.ts
var service2 = new TechnologyService();
async function listTechnologies(req, res, next) {
  try {
    const result = await service2.list(req.query);
    sendSuccess(res, result.items, "Technologies retrieved", 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages
    });
  } catch (err) {
    next(err);
  }
}
async function listActiveForUser(req, res, next) {
  try {
    const items = await service2.listActive();
    sendSuccess(res, items, "Active technologies retrieved");
  } catch (err) {
    next(err);
  }
}
async function getCategories(req, res, next) {
  try {
    const categories = await service2.getCategories();
    sendSuccess(res, categories, "Categories retrieved");
  } catch (err) {
    next(err);
  }
}
async function getTechnologyById(req, res, next) {
  try {
    const tech = await service2.getById(req.params.id);
    sendSuccess(res, tech);
  } catch (err) {
    next(err);
  }
}
async function createTechnology(req, res, next) {
  try {
    const tech = await service2.create(req.body);
    sendCreated(res, tech);
  } catch (err) {
    next(err);
  }
}
async function updateTechnology(req, res, next) {
  try {
    const tech = await service2.update(req.params.id, req.body);
    sendSuccess(res, tech, "Technology updated");
  } catch (err) {
    next(err);
  }
}
async function deleteTechnology(req, res, next) {
  try {
    await service2.remove(req.params.id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
async function toggleTechnology(req, res, next) {
  try {
    const { isActive } = req.body;
    const tech = await service2.toggleActive(req.params.id, isActive);
    sendSuccess(res, tech, "Technology status updated");
  } catch (err) {
    next(err);
  }
}

// server/src/modules/admin/questions/questions.controller.ts
import { eq as eq4 } from "drizzle-orm";
async function getActiveQuestions(req, res, next) {
  try {
    const projectId = req.query.projectId;
    if (projectId) {
      const [project] = await db.select().from(projects).where(eq4(projects.id, projectId)).limit(1);
      if (project && project.idea) {
        try {
          const rotationEngine = new RotationEngine();
          const selectedKey = await rotationEngine.selectKey();
          const provider = getProvider(selectedKey.providerName);
          if (provider) {
            const languageLabel = project.language === "id" ? "Indonesian" : "English";
            const systemPrompt = `You are an expert Requirements Engineer. Your job is to generate exactly 5 custom, highly relevant, and contextual clarifying questions to deeply understand the requirements and details of the user's software idea.

Return ONLY a raw JSON array matching this typescript signature, without markdown code blocks:
Array<{
  id: string;
  question: string;
  type: 'textarea' | 'chips' | 'radio' | 'checkbox' | 'select' | 'switch';
  options?: string[];
  desc?: string;
}>

Constraints:
1. You MUST generate exactly 5 questions.
2. The language of the questions AND options MUST match the user's preferred language: ${languageLabel}.
3. All questions, options, and descriptions MUST be 100% relevant and specific to the user's project idea. Do NOT use generic or unrelated examples. Tailor every option and question strictly to the project context provided.
4. Use natural, conversational language appropriate to the project domain. Questions should feel like a professional discovery session, not a survey.
5. The 'options' field must contain real, contextual choices that are directly relevant to the specific software idea described. Never include options from a different domain.
6. The 'desc' field must be a short, helpful guide or recommendation on how the user should answer this specific question. Keep it brief and encouraging.
7. Do NOT output markdown ticks or code block wrapper. Output ONLY the raw valid JSON array. No text before or after.
8. Ensure the JSON is complete and valid \u2014 do not truncate or leave any field unfinished.`;
            const userPrompt = `Project Idea: ${project.idea}
Language: ${languageLabel}

Generate 5 highly specific questions tailored exactly to this project idea.`;
            const result = await provider.generate({
              systemPrompt,
              userPrompt,
              config: {
                model: selectedKey.model,
                temperature: 0.6,
                maxTokens: 4e3,
                topP: 0.9
              }
            }, {
              apiKey: selectedKey.apiKey,
              model: selectedKey.model,
              timeoutMs: 3e4
            });
            let content = result.content.trim();
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              content = jsonMatch[1].trim();
            } else {
              const arrayMatch = content.match(/\[[\s\S]*\]/);
              if (arrayMatch) {
                content = arrayMatch[0];
              }
            }
            const generated = JSON.parse(content);
            if (Array.isArray(generated) && generated.length > 0) {
              await rotationEngine.markKeySuccess(selectedKey.id);
              sendSuccess(res, generated);
              return;
            }
          }
        } catch (aiErr) {
          console.error("Dynamic question generation failed, falling back to static questions:", aiErr);
        }
      }
    }
    const fallbackQuestions = [
      {
        id: "fallback-1",
        question: "Ceritakan masalah utama yang ingin diselesaikan aplikasi ini. Siapa yang paling merasakan masalah itu?",
        type: "textarea",
        description: "Menggambarkan user persona dan pain point utama aplikasi"
      },
      {
        id: "fallback-2",
        question: "Apa satu aksi utama yang harus bisa dilakukan pengguna saat pertama kali membuka aplikasi ini?",
        type: "textarea",
        description: "Menentukan core value proposition dan first impression aplikasi"
      },
      {
        id: "fallback-3",
        question: "Fitur-fitur apa yang wajib ada di versi pertama aplikasi ini?",
        type: "checkbox",
        options: ["Autentikasi & manajemen akun", "Dashboard & laporan", "Notifikasi real-time", "Pencarian & filter data", "Integrasi pembayaran", "Export data (PDF/Excel)", "Chat / komunikasi", "API publik / integrasi pihak ketiga"],
        description: "Prioritas fitur untuk MVP (Minimum Viable Product)"
      },
      {
        id: "fallback-4",
        question: "Siapa saja tipe pengguna yang akan mengakses aplikasi ini?",
        type: "chips",
        options: ["End user / pelanggan", "Admin / operator", "Manajer / supervisor", "Tim internal perusahaan", "Mitra / vendor eksternal", "Guest / publik"],
        description: "Menentukan role dan hak akses dalam sistem"
      },
      {
        id: "fallback-5",
        question: "Platform apa yang menjadi target utama aplikasi ini?",
        type: "radio",
        options: ["Web browser (desktop)", "Mobile app (iOS & Android)", "Keduanya (web + mobile)", "Desktop app"],
        description: "Menentukan arsitektur teknis dan prioritas pengembangan"
      }
    ];
    sendSuccess(res, fallbackQuestions);
  } catch (err) {
    next(err);
  }
}

// server/src/routes/app.routes.ts
var router = Router();
router.get("/technologies", listActiveForUser);
router.get("/technologies/categories", getCategories);
router.get("/technologies/:id", getTechnologyById);
router.get("/interview/questions", getActiveQuestions);
router.get("/projects", listProjects);
router.post("/projects", validate(createProjectSchema), createProject);
router.get("/projects/:id", validate(projectIdParamSchema, "params"), getProject);
router.put("/projects/:id", validate(projectIdParamSchema, "params"), validate(updateProjectSchema), updateProject);
router.delete("/projects/:id", validate(projectIdParamSchema, "params"), deleteProject);
router.post("/projects/:id/technologies", validate(projectIdParamSchema, "params"), validate(saveTechnologiesSchema), saveTechnologies);
router.get("/projects/:id/technologies", validate(projectIdParamSchema, "params"), getTechnologies);
router.post("/projects/:id/answers", validate(projectIdParamSchema, "params"), validate(saveAnswersSchema), saveAnswers);
router.get("/projects/:id/answers", validate(projectIdParamSchema, "params"), getAnswers);
router.post("/projects/:id/canvas", validate(projectIdParamSchema, "params"), validate(saveCanvasSchema), saveCanvas);
router.get("/projects/:id/canvas", validate(projectIdParamSchema, "params"), getCanvas);
router.get("/projects/:id/documents", validate(projectIdParamSchema, "params"), getDocuments);
router.get("/projects/:id/documents/:type", getDocumentByType);
router.get("/projects/:id/documents/:type/history", getDocumentHistory);
router.post("/projects/:id/documents/:type", validate(documentTypeParamSchema, "params"), validate(saveDocumentSchema), saveDocumentManual);
var app_routes_default = router;

// server/src/routes/generate.routes.ts
import { Router as Router2 } from "express";

// server/src/ai/context/context-builder.ts
import { eq as eq5, and as and3, desc as desc2 } from "drizzle-orm";
var ContextBuilder = class {
  async build(projectId, generateType) {
    const [project] = await db.select().from(projects).where(eq5(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");
    const [
      techs,
      answers,
      canvas,
      allDocuments
    ] = await Promise.all([
      db.select().from(projectTechnologies).where(eq5(projectTechnologies.projectId, projectId)),
      db.select({
        id: interviewAnswers.id,
        questionId: interviewAnswers.questionId,
        answer: interviewAnswers.answer,
        question: interviewQuestions.question
      }).from(interviewAnswers).leftJoin(interviewQuestions, eq5(interviewAnswers.questionId, interviewQuestions.id)).where(eq5(interviewAnswers.projectId, projectId)),
      db.select().from(canvasStructures).where(eq5(canvasStructures.projectId, projectId)).limit(1),
      db.select().from(generatedDocuments).where(
        and3(eq5(generatedDocuments.projectId, projectId), eq5(generatedDocuments.isCurrent, true))
      )
    ]);
    let parsedAnswers = [];
    if (project.description) {
      try {
        const parsed2 = JSON.parse(project.description);
        if (Array.isArray(parsed2)) {
          parsedAnswers = parsed2.map((a) => ({
            questionId: a.questionId,
            question: a.question || a.questionId,
            answer: a.answer
          }));
        }
      } catch {
      }
    }
    const finalAnswers = parsedAnswers.length > 0 ? parsedAnswers : answers.map((a) => ({
      questionId: a.questionId,
      question: a.question ?? void 0,
      answer: a.answer
    }));
    const existingDocuments = {};
    for (const doc of allDocuments) {
      existingDocuments[doc.type] = doc.content;
    }
    const recentGenerations = await db.select({
      type: generatedDocuments.type,
      version: generatedDocuments.version,
      createdAt: generatedDocuments.createdAt
    }).from(generatedDocuments).where(eq5(generatedDocuments.projectId, projectId)).orderBy(desc2(generatedDocuments.createdAt)).limit(10);
    const featuresRaw = canvas[0]?.features;
    let canvasFeatures = [];
    if (Array.isArray(featuresRaw)) {
      canvasFeatures = featuresRaw;
    } else if (featuresRaw && typeof featuresRaw === "object") {
      const blueprint = featuresRaw;
      if (Array.isArray(blueprint.pages)) {
        canvasFeatures.push({
          name: "Frontend Pages",
          phase: "Frontend Layer",
          subs: blueprint.pages.map((p) => `${p.name} (${p.route}) - ${p.description || ""}`)
        });
      }
      if (Array.isArray(blueprint.apiEndpoints)) {
        canvasFeatures.push({
          name: "Backend API Endpoints",
          phase: "Backend Layer",
          subs: blueprint.apiEndpoints.map((e) => `${e.method} ${e.path} - ${e.description || ""}`)
        });
      }
      if (Array.isArray(blueprint.tables)) {
        canvasFeatures.push({
          name: "Database Tables",
          phase: "Database Layer",
          subs: blueprint.tables.map((t) => `${t.name} (${(t.columns || []).join(", ")}) - ${t.description || ""}`)
        });
      }
    }
    return {
      project: {
        id: project.id,
        name: project.name,
        idea: project.idea,
        description: project.description,
        language: project.language,
        preferredAiTarget: project.preferredAiTarget ?? null,
        techSelectionMode: project.techSelectionMode,
        status: project.status
      },
      technologies: techs.map((t) => ({
        category: t.category,
        technologyName: t.technologyName,
        isAiSelected: t.isAiSelected
      })),
      interviewAnswers: finalAnswers,
      canvasFeatures,
      existingDocuments,
      recentGenerations: recentGenerations.map((r) => ({
        type: r.type,
        version: r.version,
        createdAt: r.createdAt
      }))
    };
  }
  serializeToText(context) {
    const lines = [];
    lines.push(`# Project: ${context.project.name}`);
    lines.push(`Idea: ${context.project.idea}`);
    if (context.project.description) lines.push(`Description: ${context.project.description}`);
    lines.push(`Language: ${context.project.language}`);
    lines.push(`AI Target Tools: ${context.project.preferredAiTarget ?? "Not specified"}`);
    lines.push(`Status: ${context.project.status}`);
    lines.push("");
    if (context.technologies.length > 0) {
      lines.push("## Technology Stack");
      for (const t of context.technologies) {
        lines.push(`- ${t.category}: ${t.technologyName}${t.isAiSelected ? " (AI selected)" : ""}`);
      }
      lines.push("");
    }
    if (context.interviewAnswers.length > 0) {
      lines.push("## Interview Answers");
      for (const a of context.interviewAnswers) {
        lines.push(`Q: ${a.question ?? a.questionId}`);
        lines.push(`A: ${JSON.stringify(a.answer)}`);
      }
      lines.push("");
    }
    if (context.canvasFeatures.length > 0) {
      lines.push("## Feature Canvas");
      for (const f of context.canvasFeatures) {
        lines.push(`- ${f.name} [${f.phase}]: ${f.subs.join(", ")}`);
      }
      lines.push("");
    }
    const docTypes = ["prd", "architecture", "database", "api", "tasks"];
    for (const type of docTypes) {
      if (context.existingDocuments[type]) {
        lines.push(`## Existing ${type.toUpperCase()}`);
        lines.push(context.existingDocuments[type].slice(0, 2e3));
        lines.push("");
      }
    }
    return lines.join("\n");
  }
};

// server/src/ai/prompt/prompt-builder.ts
import { eq as eq6, and as and4 } from "drizzle-orm";
var PromptBuilder = class {
  constructor() {
    this.contextBuilder = new ContextBuilder();
  }
  async build(generateType, context) {
    const [template] = await db.select().from(promptTemplates).where(
      and4(
        eq6(promptTemplates.generateType, generateType),
        eq6(promptTemplates.isActive, true),
        eq6(promptTemplates.isDefault, true)
      )
    ).limit(1);
    const contextText = this.contextBuilder.serializeToText(context);
    if (!template) {
      return this.buildFallbackPrompt(generateType, context, contextText);
    }
    const userPrompt = this.interpolate(template.userPrompt, {
      context: contextText,
      project_name: context.project.name,
      project_idea: context.project.idea,
      language: context.project.language === "id" ? "Indonesian" : "English",
      ai_target: context.project.preferredAiTarget ?? "any AI coding tool",
      tech_stack: context.technologies.map((t) => `${t.category}: ${t.technologyName}`).join(", "),
      existing_prd: context.existingDocuments.prd ?? "Not yet generated",
      existing_architecture: context.existingDocuments.architecture ?? "Not yet generated",
      existing_database: context.existingDocuments.database ?? "Not yet generated"
    });
    return {
      systemPrompt: template.systemPrompt,
      developerPrompt: template.developerPrompt ?? void 0,
      userPrompt,
      config: {
        model: template.model ?? "gemini-2.5-flash",
        temperature: Number(template.temperature ?? 0.7),
        maxTokens: generateType === "canvas" || generateType === "prompt" ? 32768 : generateType === "prd" ? 16384 : template.maxTokens ?? 8192,
        topP: Number(template.topP ?? 0.9)
      }
    };
  }
  interpolate(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }
  buildFallbackPrompt(generateType, context, contextText) {
    const language = context.project.language === "id" ? "Indonesian" : "English";
    const aiTarget = context.project.preferredAiTarget ?? "AI coding tools";
    const systemPrompts = {
      prd: `You are an expert Product Manager. Generate a comprehensive Product Requirement Document (PRD) in ${language}. Output in clean Markdown format. IMPORTANT: Maintain clean Markdown syntax. Do NOT output empty bold asterisks or strange double-bold symbols like '****'. Ensure all bullet points, headings, and bold text are clean and properly spaced.`,
      architecture: `You are a Senior Software Architect. Generate a detailed Software Architecture document in ${language}. Include system components, patterns, and diagrams description in Markdown.`,
      database: `You are a Senior Database Architect. Generate a complete Database Design document in ${language}. Include all tables, columns, relationships, and indexes in Markdown.`,
      api: `You are a Senior Backend Engineer. Generate a comprehensive REST API Design document in ${language}. Include all endpoints, request/response schemas, and authentication in Markdown.`,
      tasks: `You are a Senior AI Developer and Architect. Generate a detailed Task Breakdown in ${language} tailored SPECIFICALLY for AI coding agents (like Cursor, Trae, Windsurf, or Antigravity) to execute via 'vibe coding'. DO NOT include human project management metrics like hour estimations, story points, or timelines. DO provide exact actionable technical steps (e.g., 'Create file X', 'Run command Y', 'Implement function Z') organized by development phases and dependencies in Markdown.`,
      prompt: `Hasilkan struktur file prompt modular untuk menginisialisasi KESELURUHAN AI workspace (untuk semua folder utama) berdasarkan blueprint dan PRD proyek ini.

PENTING:
1. Anda BEBAS menentukan berapa jumlah folder dan file yang dibutuhkan untuk membangun proyek ini (sesuaikan dengan kompleksitas fitur).
2. Setiap folder harus memiliki instruksi spesifik untuk modul tersebut.
3. JANGAN PERNAH membuat file bernama "README.md".
4. Setiap nama folder dan file HARUS diawali dengan angka urutan (contoh: 01_Project_Setup, 02_Database, dll. Dan untuk file: 01_instruksi.md, 02_schema.sql, dll).
5. WAJIB BUAT FILE TERAKHIR PER FOLDER: File paling akhir di setiap folder HARUS bernama "99_ringkasan.md".
6. Output Anda HARUS HANYA berupa JSON object murni tanpa pembungkus blok kode Markdown (\`\`\`json). Key adalah path file lengkap dengan foldernya, dan value adalah isi konten teks/Markdown-nya.

Format JSON yang Diharapkan:
{
  "01_Project_Setup/01_setup_utama.md": "# Project Setup\\n...",
  "01_Project_Setup/99_ringkasan.md": "Ringkasan setup...",
  "02_Database/01_skema.md": "# Database\\n...",
  "02_Database/99_ringkasan.md": "Ringkasan database..."
}`,
      canvas: `You are a Senior Software Architect and Full-Stack System Designer. Generate a COMPREHENSIVE and COMPLEX feature canvas structure for this project. You MUST generate between 12 and 15 feature objects. Each feature MUST have detailed sub-features, complete SQL schemas, and actionable AI agent tasks. Output ONLY a valid JSON array with no explanations and no markdown code blocks. The JSON must be directly parseable by JSON.parse().`,
      workflow: `You are a Senior Software Architect. Generate a complete development workflow overview in ${language}. Markdown format.`
    };
    const userPrompt = generateType === "canvas" ? `Analyze this project idea and generate a COMPREHENSIVE feature canvas in ${language}:

Project Idea: ${context.project.idea}
Tech Stack: ${context.technologies.map((t) => `${t.category}: ${t.technologyName}`).join(", ")}

Generate a JSON array of EXACTLY 12-15 features. The features should cover these domains (adapt to the project): Authentication & Security, Dashboard & Analytics, User Management & Roles, Core Domain Feature 1, Core Domain Feature 2, Core Domain Feature 3, Payment & Billing (if relevant), Notifications & Messaging, Search & Filtering, Reports & Exports, Settings & Configuration, Admin Panel, API Integration Management, Mobile/PWA Support, and Audit Logs & Monitoring.

Each feature object MUST follow this EXACT format:
[
  {
    "name": "Feature Name in ${language}",
    "iconName": "lucide-icon-name",
    "phase": "Fase N: Phase Description in ${language}",
    "subs": [
      "Sub-feature 1 with detail",
      "Sub-feature 2 with detail",
      "Sub-feature 3 with detail",
      "Sub-feature 4 with detail",
      "Sub-feature 5 with detail",
      "Sub-feature 6 with detail"
    ],
    "sqlSchema": [
      "CREATE TABLE table1 (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  user_id UUID REFERENCES users(id) ON DELETE CASCADE,\\n  name VARCHAR(255) NOT NULL,\\n  created_at TIMESTAMPTZ DEFAULT NOW(),\\n  updated_at TIMESTAMPTZ DEFAULT NOW()\\n);\\nCREATE INDEX idx_table1_user_id ON table1(user_id);",
      "CREATE TABLE table2 (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  table1_id UUID REFERENCES table1(id) ON DELETE CASCADE,\\n  status VARCHAR(50) DEFAULT 'active',\\n  metadata JSONB,\\n  created_at TIMESTAMPTZ DEFAULT NOW()\\n);"
    ],
    "tasks": [
      "1. [SETUP] Configure environment variables and run database migrations for this feature",
      "2. [BACKEND] Create Express router, controller, and service files for this feature with full CRUD",
      "3. [AUTH] Implement authorization middleware to protect this feature's endpoints",
      "4. [FRONTEND] Build React components (list view, form modal, detail page) for this feature",
      "5. [TESTING] Write integration tests for this feature's API endpoints"
    ]
  }
]

Organize phases as: Fase 1 (Core Infrastructure: Auth, Dashboard), Fase 2 (Core Features: main business logic), Fase 3 (Advanced Features: integrations, reports), Fase 4 (Polish & Scale: performance, admin, monitoring). Use simple lowercase lucide icon names like: shield, layout-dashboard, users, package, bell, settings, credit-card, bar-chart-2, search, file, mail, lock, zap, cloud, smartphone. Output ONLY the JSON array.` : `Based on the following project context, generate the ${generateType.toUpperCase()} document:

${contextText}`;
    return {
      systemPrompt: systemPrompts[generateType] ?? systemPrompts.prd,
      userPrompt,
      config: {
        model: "gemini-2.5-flash",
        temperature: 0.7,
        maxTokens: generateType === "canvas" || generateType === "prompt" ? 32768 : generateType === "prd" ? 16384 : 8192,
        topP: 0.9
      }
    };
  }
};

// server/src/ai/orchestrator/ai-orchestrator.ts
import { eq as eq7 } from "drizzle-orm";

// server/src/ai/memory/ai-memory.ts
var MEMORY_TTL_MS = 30 * 60 * 1e3;
var MAX_DRAFT_LENGTH = 2e4;
var AIMemoryStore = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
  }
  key(projectId, generateType) {
    return `${projectId}::${generateType}`;
  }
  /**
   * Save a draft from the primary AI into memory so the collaborator can continue from it.
   */
  save(entry) {
    const memKey = this.key(entry.projectId, entry.generateType);
    const truncatedDraft = entry.primaryDraft.length > MAX_DRAFT_LENGTH ? entry.primaryDraft.slice(0, MAX_DRAFT_LENGTH) + "\n\n[DRAFT TRUNCATED - CONTINUE FROM HERE]" : entry.primaryDraft;
    this.store.set(memKey, {
      ...entry,
      primaryDraft: truncatedDraft,
      savedAt: Date.now()
    });
  }
  /**
   * Retrieve memory for a given project + generateType combination.
   * Returns null if no memory found or memory has expired.
   */
  get(projectId, generateType) {
    const memKey = this.key(projectId, generateType);
    const entry = this.store.get(memKey);
    if (!entry) return null;
    if (Date.now() - entry.savedAt > MEMORY_TTL_MS) {
      this.store.delete(memKey);
      return null;
    }
    return entry;
  }
  /**
   * Increment the attempt counter so we know how many times we've tried.
   */
  incrementAttempts(projectId, generateType) {
    const memKey = this.key(projectId, generateType);
    const entry = this.store.get(memKey);
    if (entry) {
      entry.attempts += 1;
      entry.savedAt = Date.now();
    }
  }
  /**
   * Clear memory for a successful completion.
   */
  clear(projectId, generateType) {
    const memKey = this.key(projectId, generateType);
    this.store.delete(memKey);
  }
  /**
   * Build a context injection string that the handoff AI can use to continue.
   */
  buildContextInjection(entry) {
    const lines = [
      "=== AI MEMORY CONTEXT ===",
      `This is attempt #${entry.attempts + 1} for project: ${entry.projectId}`,
      `Primary AI (${entry.primaryProvider}) generated a partial draft before failing.`,
      `You are taking over as the collaborator AI. Continue and complete the work below.`,
      "",
      "--- DRAFT FROM PRIMARY AI (expand and complete this): ---",
      entry.primaryDraft,
      ""
    ];
    if (entry.lastSection) {
      lines.push(`--- LAST COMPLETED SECTION: ${entry.lastSection} ---`);
      lines.push("Continue from the NEXT section after the above.");
      lines.push("");
    }
    lines.push("=== END OF MEMORY CONTEXT ===");
    lines.push("Now complete the full document/response as instructed, building upon the draft above.");
    return lines.join("\n");
  }
  /**
   * Detect if content appears to be incomplete (useful to decide when to save memory)
   */
  isLikelyIncomplete(content, generateType) {
    if (!content || content.length < 100) return true;
    if (generateType === "canvas") {
      try {
        const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
        JSON.parse(cleaned);
        return false;
      } catch {
        return true;
      }
    }
    const trimmed = content.trim();
    const lastChar = trimmed[trimmed.length - 1];
    if ([".", "!", "?", "}", "]", ";"].includes(lastChar)) return false;
    return trimmed.length < 500;
  }
};
var aiMemory = new AIMemoryStore();

// server/src/ai/orchestrator/ai-orchestrator.ts
var AIOrchestrator = class {
  constructor() {
    this.contextBuilder = new ContextBuilder();
    this.promptBuilder = new PromptBuilder();
  }
  async execute(projectId, generateType, preferredProvider, revisionInstructions) {
    const config2 = await this.getRotationConfig();
    const maxRetries = config2?.maxRetries ?? env.AI_MAX_RETRIES;
    const cooldownMinutes = config2?.cooldownMinutes ?? env.AI_COOLDOWN_MINUTES;
    const context = await this.contextBuilder.build(projectId, generateType);
    const prompt = await this.promptBuilder.build(generateType, context);
    if (revisionInstructions) {
      prompt.userPrompt += `

REVISION INSTRUCTIONS / REVISI DARI USER (PENTING! Harap ikuti revisi ini dan sesuaikan hasil sebelumnya):
${revisionInstructions}`;
    }
    logAI({ projectId, generateType }, "AI orchestration started");
    const rotationEngine = new RotationEngine();
    let lastError;
    const existingMemory = aiMemory.get(projectId, generateType);
    if (existingMemory) {
      logAI({ projectId, generateType }, `Resuming from memory (attempt #${existingMemory.attempts + 1}, primary was ${existingMemory.primaryProvider})`);
      const memoryContext = aiMemory.buildContextInjection(existingMemory);
      prompt.userPrompt = `${memoryContext}

---

ORIGINAL REQUEST:
${prompt.userPrompt}`;
      aiMemory.incrementAttempts(projectId, generateType);
    }
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let selectedKey;
      try {
        selectedKey = await rotationEngine.selectKey(preferredProvider);
      } catch (err) {
        if (err instanceof AllProvidersExhaustedError) {
          logError({ projectId, generateType }, "All providers exhausted", err);
          throw err;
        }
        throw err;
      }
      const provider = getProvider(selectedKey.providerName);
      if (!provider) {
        logRotation({ provider: selectedKey.providerName }, "Provider not registered, skipping");
        continue;
      }
      try {
        logAI(
          { projectId, generateType, provider: selectedKey.providerName, attempt },
          "Attempting generation"
        );
        const result = await provider.generate(prompt, {
          apiKey: selectedKey.apiKey,
          model: selectedKey.model,
          timeoutMs: selectedKey.timeoutMs,
          temperature: prompt.config.temperature,
          maxTokens: prompt.config.maxTokens,
          topP: prompt.config.topP
        });
        await rotationEngine.markKeySuccess(selectedKey.id);
        logAI(
          { projectId, generateType, provider: selectedKey.providerName, latencyMs: result.latencyMs },
          "Primary generation completed successfully"
        );
        aiMemory.save({
          projectId,
          generateType,
          primaryProvider: selectedKey.providerName,
          primaryDraft: result.content,
          primaryDraftTokens: result.totalTokens ?? 0,
          attempts: existingMemory?.attempts ?? 0
        });
        const finalResult = await this.collaborateAndRefine(
          projectId,
          generateType,
          result,
          prompt,
          rotationEngine,
          cooldownMinutes
        );
        finalResult.content = this.formatOutputAsJson(generateType, finalResult.content);
        aiMemory.clear(projectId, generateType);
        await this.saveRequestLog(projectId, generateType, selectedKey.id, finalResult, true, rotationEngine.getEvents());
        return { ...finalResult, rotationEvents: rotationEngine.getEvents() };
      } catch (err) {
        lastError = err;
        logError(
          { projectId, generateType, provider: selectedKey.providerName, attempt },
          "Generation attempt failed \u2014 saving to memory for handoff",
          err
        );
        aiMemory.save({
          projectId,
          generateType,
          primaryProvider: selectedKey.providerName,
          primaryDraft: existingMemory?.primaryDraft ?? "",
          primaryDraftTokens: 0,
          attempts: (existingMemory?.attempts ?? 0) + attempt,
          contextSummary: err instanceof Error ? err.message : "Unknown error"
        });
        await rotationEngine.markKeyFailed(selectedKey.id, cooldownMinutes);
        await this.saveRequestLog(projectId, generateType, selectedKey.id, null, false, rotationEngine.getEvents(), err);
      }
    }
    throw lastError ?? new AIError("All generation attempts failed");
  }
  async collaborateAndRefine(projectId, generateType, primaryResult, originalPrompt, rotationEngine, cooldownMinutes) {
    const primaryProvider = primaryResult.provider;
    const collaboratorProviderName = primaryProvider === "gemini" ? "groq" : "gemini";
    logAI({ projectId, generateType, primaryProvider, collaboratorProviderName }, "Attempting collaborative refinement");
    let selectedKey;
    try {
      selectedKey = await rotationEngine.selectKey(collaboratorProviderName);
    } catch (err) {
      logAI({ projectId, generateType }, `No collaborator key found for ${collaboratorProviderName}, returning primary result`);
      return primaryResult;
    }
    const collaboratorProvider = getProvider(selectedKey.providerName);
    if (!collaboratorProvider) {
      logAI({ projectId, generateType }, `Collaborator provider ${selectedKey.providerName} not found, returning primary result`);
      return primaryResult;
    }
    try {
      const languageText = originalPrompt.userPrompt.includes("Indonesian") || originalPrompt.userPrompt.includes("bahasa") ? "Indonesian" : "English";
      let refinementSystemPrompt = "";
      let refinementUserPrompt = "";
      if (generateType === "canvas") {
        refinementSystemPrompt = `You are a Senior Software Architect and AI Systems Designer. Your task is to take the initial feature canvas generated by another AI and make it extremely comprehensive and complete. Output ONLY a valid JSON array of features, with no explanations and no markdown code blocks. The JSON must be parseable by JSON.parse().`;
        refinementUserPrompt = `A primary model (${primaryProvider}) generated this initial feature canvas JSON:

${primaryResult.content}

Your job is to significantly EXPAND and ENRICH this canvas. Requirements:
1. Ensure there are AT LEAST 12-15 feature objects covering: Auth, Dashboard, User Management, Products/Services (if applicable), Payments (if applicable), Notifications, Reports/Analytics, Settings, Admin Panel, API Management, and any domain-specific features.
2. Each feature object MUST have: { "name": "string", "iconName": "lucide-icon-name", "phase": "Fase N: Description", "subs": [...], "sqlSchema": [...], "tasks": [...] }.
3. "subs" must have 5-8 detailed sub-features per feature.
4. "sqlSchema" must have 2-4 complete CREATE TABLE statements with UUID PKs, foreign keys with ON DELETE CASCADE, TIMESTAMPTZ columns, and relevant indexes. Each CREATE TABLE must be a complete, valid SQL statement.
5. "tasks" must have 4-6 detailed, actionable coding tasks for AI agents (Antigravity, Cursor, Trae) starting with environment setup, then database migrations, then backend API, then frontend components.
6. Organize features by phases: Fase 1 (Core Infrastructure), Fase 2 (Core Features), Fase 3 (Advanced Features), Fase 4 (Polish & Scale).
7. Output ONLY the final complete valid JSON array.`;
      } else if (generateType === "prompt") {
        refinementSystemPrompt = `You are a Senior Software Architect and expert AI Prompt Engineer. Your task is to take the initial JSON folder structure draft and ensure it is perfectly formatted as a single JSON object. Output ONLY a valid JSON object with keys: "documentType" (string), "collaborative" (true), "content" (string with the stringified JSON representing the folder and files).`;
        refinementUserPrompt = `The primary model (${primaryProvider}) generated this initial draft:

${primaryResult.content}

Review this draft and output the final valid JSON wrapper object. The "content" field MUST be a valid stringified JSON object where keys are file paths like "01_Project_Setup/01_setup.md" and values are the markdown instructions. Output ONLY the JSON wrapper.`;
      } else if (generateType === "prd") {
        refinementSystemPrompt = `You are a Senior Product Manager and Technical Writer. Your task is to take the initial PRD draft from another AI model and produce a FINAL, COMPLETE, PROFESSIONAL Product Requirement Document.

CRITICAL FORMATTING RULES \u2014 MUST FOLLOW:
1. Use standard Markdown headings (#, ##, ###) \u2014 these will be rendered as beautiful HTML, so USE THEM freely.
2. For bullet points use "- " (dash + space). NEVER use bare asterisks (*) as bullet markers.
3. For bold text use **text** syntax.
4. NEVER output raw "***" or "* " as standalone bullet symbols.
5. Write in ${languageText} language throughout.
6. The document MUST be extremely comprehensive \u2014 minimum 3000 words.`;
        refinementUserPrompt = `The primary model (${primaryProvider}) generated this initial PRD draft:

${primaryResult.content}

Now produce the FINAL complete PRD. Structure it with these exact sections:

# Product Requirement Document (PRD)

## 1. Executive Summary
Brief description of the product, its purpose, and business value.

## 2. Problem Statement
What problem does this solve? Who has this problem?

## 3. Goals & Success Metrics
Business goals and measurable KPIs.

## 4. Target Users & Personas
Detailed user personas with roles and needs.

## 5. Feature Requirements
For EVERY feature from the canvas, include a dedicated subsection:
### 5.1 [Feature Name]
**Description:** What it does.
**User Stories:** As a [role], I want to [action] so that [benefit].
**Acceptance Criteria:** Specific testable requirements.
**Priority:** High / Medium / Low

## 6. Non-Functional Requirements
Performance, security, scalability, accessibility requirements.

## 7. User Journey & Flow
Step-by-step user flows for the core use cases.

## 8. Technical Architecture Overview
Frontend, backend, database, third-party integrations.

## 9. API Overview
Key endpoints grouped by module.

## 10. Data Model Overview
Key entities and their relationships.

## 11. Security Requirements
Auth, authorization, data protection.

## 12. Milestones & Timeline
Phased development plan with rough estimates.

## 13. Risks & Mitigations
Known risks and how to handle them.

## 14. Open Questions
Any decisions still pending.

IMPORTANT: Cover ALL features from the canvas. Output ONLY clean Markdown \u2014 no JSON wrapper needed for PRD.`;
      } else if (generateType === "tasks") {
        refinementSystemPrompt = `You are a Lead AI Developer. Your task is to take the initial Task Breakdown and refine it into an actionable "Vibe Coding" task list for AI agents (like Cursor, Trae, or Antigravity).
        
CRITICAL RULES:
1. NEVER include time estimates, hours, days, or story points. This is for AI agents, not humans.
2. Structure tasks logically: Setup -> Database -> Backend -> Frontend -> Integration.
3. Make tasks highly actionable (e.g., "Write the schema in \`src/db/schema.ts\`", "Create the POST endpoint in \`src/api/routes.ts\`").
4. Write in ${languageText}.`;
        refinementUserPrompt = `The primary model (${primaryProvider}) generated this initial task list:

${primaryResult.content}

Now produce the FINAL Task Breakdown document. Ensure there are absolutely NO time estimates. Focus strictly on technical execution flow for AI coding agents. Output clean Markdown.`;
      } else {
        refinementSystemPrompt = `You are an expert Co-pilot AI. Your task is to collaborate with another AI model to refine, correct, and optimize the generated document for: ${generateType}.
Output in clean Markdown format.`;
        refinementUserPrompt = `The primary model (${primaryProvider}) generated this initial draft for ${generateType}:

${primaryResult.content}

Review this draft, improve it, fill in any missing details (such as database SQL queries or specific AI prompting strategies if relevant), and output the final complete version.`;
      }
      const refinementPrompt = {
        systemPrompt: refinementSystemPrompt,
        userPrompt: refinementUserPrompt,
        config: {
          ...originalPrompt.config,
          model: selectedKey.model
        }
      };
      logAI(
        { projectId, generateType, provider: selectedKey.providerName },
        "Collaborator model refining content"
      );
      const refinedResult = await collaboratorProvider.generate(refinementPrompt, {
        apiKey: selectedKey.apiKey,
        model: selectedKey.model,
        timeoutMs: selectedKey.timeoutMs,
        temperature: originalPrompt.config.temperature,
        maxTokens: originalPrompt.config.maxTokens,
        topP: originalPrompt.config.topP
      });
      await rotationEngine.markKeySuccess(selectedKey.id);
      logAI(
        { projectId, generateType, provider: selectedKey.providerName, latencyMs: refinedResult.latencyMs },
        "Collaborative refinement completed successfully"
      );
      return {
        provider: `${primaryResult.provider} + ${refinedResult.provider}`,
        model: `${primaryResult.model} + ${refinedResult.model}`,
        content: refinedResult.content,
        promptTokens: (primaryResult.promptTokens ?? 0) + (refinedResult.promptTokens ?? 0),
        completionTokens: (primaryResult.completionTokens ?? 0) + (refinedResult.completionTokens ?? 0),
        totalTokens: (primaryResult.totalTokens ?? 0) + (refinedResult.totalTokens ?? 0),
        latencyMs: primaryResult.latencyMs + refinedResult.latencyMs
      };
    } catch (err) {
      logError(
        { projectId, generateType, provider: selectedKey.providerName },
        "Collaborative refinement failed, falling back to primary draft",
        err
      );
      await rotationEngine.markKeyFailed(selectedKey.id, cooldownMinutes);
      return primaryResult;
    }
  }
  async getRotationConfig() {
    const [config2] = await db.select().from(rotationConfig).limit(1);
    return config2;
  }
  async saveRequestLog(projectId, generateType, apiKeyId, result, success, rotationEvents, error) {
    try {
      const [key] = await db.select({ providerId: apiKeys.providerId }).from(apiKeys).where(eq7(apiKeys.id, apiKeyId)).limit(1);
      await db.insert(requestLogs).values({
        requestId: crypto.randomUUID(),
        projectId,
        generateType,
        providerName: result?.provider,
        model: result?.model,
        apiKeyId,
        promptTokens: result?.promptTokens,
        completionTokens: result?.completionTokens,
        totalTokens: result?.totalTokens,
        latencyMs: result?.latencyMs,
        success,
        errorMessage: error instanceof Error ? error.message : void 0,
        rotationEvents
      });
    } catch (logErr) {
      logError({}, "Failed to save request log", logErr);
    }
  }
  formatOutputAsJson(generateType, content) {
    if (generateType === "canvas") {
      try {
        const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
        JSON.parse(cleaned);
        return cleaned;
      } catch {
        return content;
      }
    }
    try {
      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed2 = JSON.parse(cleaned);
      if (parsed2 && typeof parsed2 === "object" && "content" in parsed2) {
        return JSON.stringify(parsed2);
      }
    } catch {
    }
    return JSON.stringify({
      documentType: generateType,
      collaborative: true,
      content
    });
  }
};

// server/src/modules/generate/generate.service.ts
var orchestrator = new AIOrchestrator();
var projectRepo = new ProjectRepository();
var STATUS_MAP = {
  prd: "prd",
  architecture: "architecture",
  database: "database",
  api: "api",
  tasks: "tasks",
  prompt: "prompt"
};
var GenerateService = class {
  async generate(projectId, generateType, preferredProvider, revisionInstructions) {
    const project = await projectRepo.findById(projectId);
    if (!project) throw new NotFoundError("Project");
    const result = await orchestrator.execute(projectId, generateType, preferredProvider, revisionInstructions);
    await projectRepo.saveDocument({
      projectId,
      type: generateType,
      content: result.content,
      providerUsed: result.provider,
      modelUsed: result.model,
      tokensUsed: result.totalTokens,
      generationTimeMs: result.latencyMs
    });
    const newStatus = STATUS_MAP[generateType];
    if (newStatus) {
      await projectRepo.update(projectId, { status: newStatus });
    }
    return {
      content: result.content,
      provider: result.provider,
      model: result.model,
      tokens: result.totalTokens,
      latencyMs: result.latencyMs
    };
  }
  async generatePRD(projectId, preferredProvider) {
    return this.generate(projectId, "prd", preferredProvider);
  }
  async generateArchitecture(projectId, preferredProvider) {
    return this.generate(projectId, "architecture", preferredProvider);
  }
  async generateDatabase(projectId, preferredProvider) {
    return this.generate(projectId, "database", preferredProvider);
  }
  async generateAPI(projectId, preferredProvider) {
    return this.generate(projectId, "api", preferredProvider);
  }
  async generateTasks(projectId, preferredProvider) {
    return this.generate(projectId, "tasks", preferredProvider);
  }
  async generatePrompt(projectId, preferredProvider, revisionInstructions) {
    return this.generate(projectId, "prompt", preferredProvider, revisionInstructions);
  }
  async generateCanvas(projectId, preferredProvider, revisionInstructions) {
    if (revisionInstructions) {
      await projectRepo.deleteDocuments(projectId);
    }
    return this.generate(projectId, "canvas", preferredProvider, revisionInstructions);
  }
};

// server/src/modules/generate/generate.controller.ts
var service3 = new GenerateService();
function getPreferredProvider(req) {
  const body = req.body;
  return body.provider;
}
async function generateCanvas(req, res, next) {
  try {
    const { provider, revision } = req.body;
    const result = await service3.generateCanvas(req.params.projectId, provider, revision);
    sendSuccess(res, result, "Canvas generated successfully");
  } catch (err) {
    next(err);
  }
}
async function generatePRD(req, res, next) {
  try {
    const result = await service3.generatePRD(req.params.projectId, getPreferredProvider(req));
    sendSuccess(res, result, "PRD generated successfully");
  } catch (err) {
    next(err);
  }
}
async function generateArchitecture(req, res, next) {
  try {
    const result = await service3.generateArchitecture(req.params.projectId, getPreferredProvider(req));
    sendSuccess(res, result, "Architecture generated successfully");
  } catch (err) {
    next(err);
  }
}
async function generateDatabase(req, res, next) {
  try {
    const result = await service3.generateDatabase(req.params.projectId, getPreferredProvider(req));
    sendSuccess(res, result, "Database design generated successfully");
  } catch (err) {
    next(err);
  }
}
async function generateAPI(req, res, next) {
  try {
    const result = await service3.generateAPI(req.params.projectId, getPreferredProvider(req));
    sendSuccess(res, result, "API design generated successfully");
  } catch (err) {
    next(err);
  }
}
async function generateTasks(req, res, next) {
  try {
    const result = await service3.generateTasks(req.params.projectId, getPreferredProvider(req));
    sendSuccess(res, result, "Task breakdown generated successfully");
  } catch (err) {
    next(err);
  }
}
async function generatePrompt(req, res, next) {
  try {
    const result = await service3.generatePrompt(req.params.projectId, getPreferredProvider(req), req.body?.revisionInstructions);
    sendSuccess(res, result, "Prompt generated successfully");
  } catch (err) {
    next(err);
  }
}

// server/src/routes/generate.routes.ts
var router2 = Router2();
router2.post("/canvas/:projectId", generateCanvas);
router2.post("/prd/:projectId", generatePRD);
router2.post("/architecture/:projectId", generateArchitecture);
router2.post("/database/:projectId", generateDatabase);
router2.post("/api/:projectId", generateAPI);
router2.post("/tasks/:projectId", generateTasks);
router2.post("/prompt/:projectId", generatePrompt);
var generate_routes_default = router2;

// server/src/routes/admin.routes.ts
import { Router as Router3 } from "express";

// server/src/middleware/admin-auth.middleware.ts
function adminAuthMiddleware(req, _res, next) {
  next();
}

// server/src/modules/admin/dashboard/dashboard.repository.ts
import { eq as eq8, sql as sql4, gte } from "drizzle-orm";
var DashboardRepository = class {
  async getStats() {
    const [
      [totalProjects],
      [totalDocs],
      [totalRequests],
      [activeKeys],
      [activeProviders]
    ] = await Promise.all([
      db.select({ count: sql4`count(*)` }).from(projects),
      db.select({ count: sql4`count(*)` }).from(generatedDocuments),
      db.select({ count: sql4`count(*)` }).from(requestLogs),
      db.select({ count: sql4`count(*)` }).from(apiKeys).where(eq8(apiKeys.isActive, true)),
      db.select({ count: sql4`count(*)` }).from(aiProviders).where(eq8(aiProviders.isActive, true))
    ]);
    const prdCount = await db.select({ count: sql4`count(*)` }).from(generatedDocuments).where(eq8(generatedDocuments.type, "prd"));
    const promptCount = await db.select({ count: sql4`count(*)` }).from(generatedDocuments).where(eq8(generatedDocuments.type, "prompt"));
    return {
      totalProjects: Number(totalProjects.count),
      totalDocuments: Number(totalDocs.count),
      totalPRD: Number(prdCount[0]?.count ?? 0),
      totalPrompts: Number(promptCount[0]?.count ?? 0),
      totalApiRequests: Number(totalRequests.count),
      activeApiKeys: Number(activeKeys.count),
      activeProviders: Number(activeProviders.count)
    };
  }
  async getAIUsageChart(days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const rows = await db.select({
      date: sql4`DATE(${requestLogs.createdAt})`,
      provider: requestLogs.providerName,
      count: sql4`count(*)`
    }).from(requestLogs).where(gte(requestLogs.createdAt, since)).groupBy(sql4`DATE(${requestLogs.createdAt})`, requestLogs.providerName).orderBy(sql4`DATE(${requestLogs.createdAt})`);
    return rows;
  }
  async getProviderDistribution() {
    const rows = await db.select({
      provider: requestLogs.providerName,
      count: sql4`count(*)`
    }).from(requestLogs).where(eq8(requestLogs.success, true)).groupBy(requestLogs.providerName).orderBy(sql4`count(*) DESC`);
    return rows;
  }
};

// server/src/modules/admin/dashboard/dashboard.controller.ts
var repo2 = new DashboardRepository();
async function getStats(req, res, next) {
  try {
    const stats = await repo2.getStats();
    sendSuccess(res, stats, "Dashboard stats retrieved");
  } catch (err) {
    next(err);
  }
}
async function getAIUsageChart(req, res, next) {
  try {
    const days = parseInt(String(req.query.days ?? "14"), 10);
    const data = await repo2.getAIUsageChart(days);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
async function getProviderDistribution(req, res, next) {
  try {
    const data = await repo2.getProviderDistribution();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

// server/src/modules/admin/provider/provider.repository.ts
import { eq as eq9, asc as asc4, sql as sql5 } from "drizzle-orm";
var ProviderRepository = class {
  async findAll() {
    return db.select().from(aiProviders).orderBy(asc4(aiProviders.priority));
  }
  async findById(id) {
    const [row] = await db.select().from(aiProviders).where(eq9(aiProviders.id, id)).limit(1);
    return row;
  }
  async create(data) {
    const [row] = await db.insert(aiProviders).values(data).returning();
    return row;
  }
  async update(id, data) {
    const [row] = await db.update(aiProviders).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(aiProviders.id, id)).returning();
    return row;
  }
  async delete(id) {
    const result = await db.delete(aiProviders).where(eq9(aiProviders.id, id));
    return (result.rowCount ?? 0) > 0;
  }
};
var ApiKeyRepository = class {
  async findAll(params) {
    const { page, limit, providerId } = params;
    const offset = calcOffset(page, limit);
    const condition = providerId ? eq9(apiKeys.providerId, providerId) : void 0;
    const [items, [{ count }]] = await Promise.all([
      db.select().from(apiKeys).where(condition).orderBy(asc4(apiKeys.priority)).limit(limit).offset(offset),
      db.select({ count: sql5`count(*)` }).from(apiKeys).where(condition)
    ]);
    return {
      items: items.map((k) => ({ ...k, keyEncrypted: void 0, keyPreview: k.keyPreview })),
      total: Number(count)
    };
  }
  async findById(id) {
    const [row] = await db.select().from(apiKeys).where(eq9(apiKeys.id, id)).limit(1);
    return row;
  }
  async create(data) {
    const keyEncrypted = encrypt(data.apiKey);
    const keyPreview = maskKey(data.apiKey);
    const [row] = await db.insert(apiKeys).values({
      providerId: data.providerId,
      label: data.label,
      keyEncrypted,
      keyPreview,
      priority: data.priority ?? 99
    }).returning();
    return { ...row, keyEncrypted: void 0 };
  }
  async update(id, data) {
    const [row] = await db.update(apiKeys).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(apiKeys.id, id)).returning();
    return row;
  }
  async delete(id) {
    const result = await db.delete(apiKeys).where(eq9(apiKeys.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async resetQuota(id) {
    const [row] = await db.update(apiKeys).set({ quotaUsed: 0, cooldownUntil: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(apiKeys.id, id)).returning();
    return row;
  }
  async getDecryptedKey(id) {
    const key = await this.findById(id);
    if (!key) return null;
    try {
      return decrypt(key.keyEncrypted);
    } catch {
      return null;
    }
  }
};

// server/src/modules/admin/provider/provider.controller.ts
var providerRepo = new ProviderRepository();
var apiKeyRepo = new ApiKeyRepository();
async function listProviders(req, res, next) {
  try {
    const items = await providerRepo.findAll();
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}
async function createProvider(req, res, next) {
  try {
    const item = await providerRepo.create(req.body);
    sendCreated(res, item);
  } catch (err) {
    next(err);
  }
}
async function updateProvider(req, res, next) {
  try {
    const item = await providerRepo.update(req.params.id, req.body);
    if (!item) throw new NotFoundError("Provider");
    sendSuccess(res, item, "Provider updated");
  } catch (err) {
    next(err);
  }
}
async function deleteProvider(req, res, next) {
  try {
    const deleted = await providerRepo.delete(req.params.id);
    if (!deleted) throw new NotFoundError("Provider");
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
async function listApiKeys(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const providerId = typeof req.query.providerId === "string" ? req.query.providerId : void 0;
    const { items, total } = await apiKeyRepo.findAll({ ...pagination, providerId });
    sendSuccess(res, items, "API keys retrieved", 200, {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: calcTotalPages(total, pagination.limit)
    });
  } catch (err) {
    next(err);
  }
}
async function createApiKey(req, res, next) {
  try {
    const item = await apiKeyRepo.create(req.body);
    sendCreated(res, item);
  } catch (err) {
    next(err);
  }
}
async function updateApiKey(req, res, next) {
  try {
    const item = await apiKeyRepo.update(req.params.id, req.body);
    if (!item) throw new NotFoundError("API Key");
    sendSuccess(res, item, "API key updated");
  } catch (err) {
    next(err);
  }
}
async function deleteApiKey(req, res, next) {
  try {
    const deleted = await apiKeyRepo.delete(req.params.id);
    if (!deleted) throw new NotFoundError("API Key");
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
async function resetApiKeyQuota(req, res, next) {
  try {
    const item = await apiKeyRepo.resetQuota(req.params.id);
    if (!item) throw new NotFoundError("API Key");
    sendSuccess(res, item, "Quota reset");
  } catch (err) {
    next(err);
  }
}

// server/src/modules/admin/rotation/rotation.controller.ts
async function getRotationConfig(req, res, next) {
  try {
    const [config2] = await db.select().from(rotationConfig).limit(1);
    sendSuccess(res, config2 ?? null);
  } catch (err) {
    next(err);
  }
}
async function updateRotationConfig(req, res, next) {
  try {
    const [existing] = await db.select().from(rotationConfig).limit(1);
    let result;
    if (existing) {
      [result] = await db.update(rotationConfig).set({ ...req.body, updatedAt: /* @__PURE__ */ new Date() }).where(db.select().from(rotationConfig).limit(1)).returning();
      [result] = await db.update(rotationConfig).set({ ...req.body, updatedAt: /* @__PURE__ */ new Date() }).returning();
    } else {
      [result] = await db.insert(rotationConfig).values(req.body).returning();
    }
    sendSuccess(res, result, "Rotation config updated");
  } catch (err) {
    next(err);
  }
}

// server/src/modules/admin/prompt-template/prompt-template.controller.ts
import { eq as eq10 } from "drizzle-orm";
async function listPromptTemplates(req, res, next) {
  try {
    const items = await db.select().from(promptTemplates);
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}
async function getPromptTemplateByType(req, res, next) {
  try {
    const items = await db.select().from(promptTemplates).where(eq10(promptTemplates.generateType, req.params.type));
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}
async function updatePromptTemplate(req, res, next) {
  try {
    const [item] = await db.update(promptTemplates).set({ ...req.body, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(promptTemplates.id, req.params.id)).returning();
    if (!item) throw new NotFoundError("Prompt template");
    sendSuccess(res, item, "Template updated");
  } catch (err) {
    next(err);
  }
}
async function publishPromptTemplate(req, res, next) {
  try {
    const [current] = await db.select().from(promptTemplates).where(eq10(promptTemplates.id, req.params.id)).limit(1);
    if (!current) throw new NotFoundError("Prompt template");
    await db.update(promptTemplates).set({ isDefault: false }).where(eq10(promptTemplates.generateType, current.generateType));
    const [item] = await db.update(promptTemplates).set({ isDefault: true }).where(eq10(promptTemplates.id, req.params.id)).returning();
    sendSuccess(res, item, "Template published as default");
  } catch (err) {
    next(err);
  }
}

// server/src/modules/admin/logs/logs.controller.ts
import { eq as eq11, desc as desc3, gte as gte2, sql as sql6 } from "drizzle-orm";
async function getActivityLogs(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const offset = calcOffset(pagination.page, pagination.limit);
    const level = typeof req.query.level === "string" ? req.query.level : void 0;
    const category = typeof req.query.category === "string" ? req.query.category : void 0;
    const condition = level ? eq11(activityLogs.level, level) : category ? eq11(activityLogs.category, category) : void 0;
    const [items, [{ count }]] = await Promise.all([
      db.select().from(activityLogs).where(condition).orderBy(desc3(activityLogs.createdAt)).limit(pagination.limit).offset(offset),
      db.select({ count: sql6`count(*)` }).from(activityLogs).where(condition)
    ]);
    sendSuccess(res, items, "Activity logs retrieved", 200, {
      page: pagination.page,
      limit: pagination.limit,
      total: Number(count),
      totalPages: calcTotalPages(Number(count), pagination.limit)
    });
  } catch (err) {
    next(err);
  }
}
async function getRequestLogs(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const offset = calcOffset(pagination.page, pagination.limit);
    const [items, [{ count }]] = await Promise.all([
      db.select().from(requestLogs).orderBy(desc3(requestLogs.createdAt)).limit(pagination.limit).offset(offset),
      db.select({ count: sql6`count(*)` }).from(requestLogs)
    ]);
    sendSuccess(res, items, "Request logs retrieved", 200, {
      page: pagination.page,
      limit: pagination.limit,
      total: Number(count),
      totalPages: calcTotalPages(Number(count), pagination.limit)
    });
  } catch (err) {
    next(err);
  }
}
async function getMonitoringRealtime(req, res, next) {
  try {
    const since1m = new Date(Date.now() - 60 * 1e3);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const [requestsPerMin, avgLatency, successRate, allReqs] = await Promise.all([
      db.select({ count: sql6`count(*)` }).from(requestLogs).where(gte2(requestLogs.createdAt, since1m)),
      db.select({ avg: sql6`avg(latency_ms)` }).from(requestLogs).where(gte2(requestLogs.createdAt, since24h)),
      db.select({ total: sql6`count(*)`, success: sql6`sum(case when success then 1 else 0 end)` }).from(requestLogs).where(gte2(requestLogs.createdAt, since24h)),
      db.select({ count: sql6`count(*)` }).from(requestLogs)
    ]);
    const successRateVal = successRate[0].total > 0 ? (successRate[0].success / successRate[0].total * 100).toFixed(1) : "100.0";
    sendSuccess(res, {
      requestsPerMinute: Number(requestsPerMin[0].count),
      avgLatencyMs: Math.round(Number(avgLatency[0].avg ?? 0)),
      successRate: `${successRateVal}%`,
      totalRequests: Number(allReqs[0].count)
    });
  } catch (err) {
    next(err);
  }
}
async function getAreaChart(req, res, next) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const rows = await db.select({
      hour: sql6`TO_CHAR(DATE_TRUNC('hour', ${requestLogs.createdAt}), 'HH24:00')`,
      requests: sql6`count(*)`,
      avgLatency: sql6`avg(latency_ms)`
    }).from(requestLogs).where(gte2(requestLogs.createdAt, since)).groupBy(sql6`DATE_TRUNC('hour', ${requestLogs.createdAt})`).orderBy(sql6`DATE_TRUNC('hour', ${requestLogs.createdAt})`);
    sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
}

// server/src/modules/admin/settings/settings.controller.ts
import { eq as eq12 } from "drizzle-orm";
async function getAllSettings(req, res, next) {
  try {
    const items = await db.select().from(appSettings);
    const settingsMap = items.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    sendSuccess(res, settingsMap);
  } catch (err) {
    next(err);
  }
}
async function updateSettings(req, res, next) {
  try {
    const updates = req.body;
    const promises = Object.entries(updates).map(async ([key, value]) => {
      const existing = await db.select().from(appSettings).where(eq12(appSettings.key, key)).limit(1);
      if (existing.length > 0) {
        return db.update(appSettings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where(eq12(appSettings.key, key));
      }
      return db.insert(appSettings).values({ key, value, type: "string" });
    });
    await Promise.all(promises);
    sendSuccess(res, null, "Settings updated");
  } catch (err) {
    next(err);
  }
}
async function getSetting(req, res, next) {
  try {
    const [setting] = await db.select().from(appSettings).where(eq12(appSettings.key, req.params.key)).limit(1);
    sendSuccess(res, setting ?? null);
  } catch (err) {
    next(err);
  }
}
async function updateSetting(req, res, next) {
  try {
    const { value } = req.body;
    const existing = await db.select().from(appSettings).where(eq12(appSettings.key, req.params.key)).limit(1);
    let result;
    if (existing.length > 0) {
      [result] = await db.update(appSettings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where(eq12(appSettings.key, req.params.key)).returning();
    } else {
      [result] = await db.insert(appSettings).values({ key: req.params.key, value, type: "string" }).returning();
    }
    sendSuccess(res, result, "Setting updated");
  } catch (err) {
    next(err);
  }
}

// server/src/modules/admin/users/users.controller.ts
import { eq as eq13, asc as asc5 } from "drizzle-orm";
import crypto3 from "crypto";
async function listUsers(req, res, next) {
  try {
    const items = await db.select().from(users).orderBy(asc5(users.createdAt));
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}
async function createUser(req, res, next) {
  try {
    const { name, email, role, password, isActive } = req.body;
    const [item] = await db.insert(users).values({
      id: crypto3.randomUUID(),
      name,
      email,
      role: role || "user",
      isActive: isActive !== void 0 ? isActive : true,
      passwordHash: password || "default-password-hash"
    }).returning();
    sendCreated(res, item);
  } catch (err) {
    next(err);
  }
}
async function updateUser(req, res, next) {
  try {
    const { name, email, role, password, isActive } = req.body;
    const updates = {};
    if (name !== void 0) updates.name = name;
    if (email !== void 0) updates.email = email;
    if (role !== void 0) updates.role = role;
    if (password !== void 0 && password.trim() !== "") updates.passwordHash = password;
    if (isActive !== void 0) updates.isActive = isActive;
    updates.updatedAt = /* @__PURE__ */ new Date();
    const [item] = await db.update(users).set(updates).where(eq13(users.id, req.params.id)).returning();
    if (!item) throw new NotFoundError("User");
    sendSuccess(res, item, "User updated");
  } catch (err) {
    next(err);
  }
}
async function deleteUser(req, res, next) {
  try {
    const result = await db.delete(users).where(eq13(users.id, req.params.id));
    if ((result.rowCount ?? 0) === 0) throw new NotFoundError("User");
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

// server/src/routes/admin.routes.ts
var router3 = Router3();
router3.use(adminAuthMiddleware);
router3.get("/dashboard/stats", getStats);
router3.get("/dashboard/ai-usage", getAIUsageChart);
router3.get("/dashboard/provider-distribution", getProviderDistribution);
router3.get("/users", listUsers);
router3.post("/users", createUser);
router3.put("/users/:id", updateUser);
router3.delete("/users/:id", deleteUser);
router3.get("/providers", listProviders);
router3.post("/providers", createProvider);
router3.put("/providers/:id", updateProvider);
router3.delete("/providers/:id", deleteProvider);
router3.get("/api-keys", listApiKeys);
router3.post("/api-keys", createApiKey);
router3.put("/api-keys/:id", updateApiKey);
router3.delete("/api-keys/:id", deleteApiKey);
router3.post("/api-keys/:id/reset-quota", resetApiKeyQuota);
router3.get("/rotation", getRotationConfig);
router3.put("/rotation", updateRotationConfig);
router3.get("/technologies", listTechnologies);
router3.post("/technologies", createTechnology);
router3.put("/technologies/:id", updateTechnology);
router3.delete("/technologies/:id", deleteTechnology);
router3.patch("/technologies/:id/toggle", toggleTechnology);
router3.get("/prompt-templates", listPromptTemplates);
router3.get("/prompt-templates/:type", getPromptTemplateByType);
router3.put("/prompt-templates/:id", updatePromptTemplate);
router3.post("/prompt-templates/:id/publish", publishPromptTemplate);
router3.get("/monitoring/realtime", getMonitoringRealtime);
router3.get("/monitoring/area-chart", getAreaChart);
router3.get("/logs/activity", getActivityLogs);
router3.get("/logs/requests", getRequestLogs);
router3.get("/settings", getAllSettings);
router3.put("/settings", updateSettings);
router3.get("/settings/:key", getSetting);
router3.put("/settings/:key", updateSetting);
var admin_routes_default = router3;

// server/src/routes/auth.routes.ts
import { Router as Router4 } from "express";

// server/src/modules/auth/auth.repository.ts
import { eq as eq14 } from "drizzle-orm";
var AuthRepository = class {
  async findByEmail(email) {
    const [row] = await db.select().from(users).where(eq14(users.email, email)).limit(1);
    return row;
  }
  async findById(id) {
    const [row] = await db.select().from(users).where(eq14(users.id, id)).limit(1);
    return row;
  }
  async updateLastLogin(id) {
    await db.update(users).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq14(users.id, id));
  }
};

// server/src/modules/auth/auth.service.ts
var AuthService = class {
  constructor() {
    this.repo = new AuthRepository();
  }
  async login(dto) {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }
    await this.repo.updateLastLogin(user.id);
    return {
      accessToken: "mock-access-token-placeholder",
      refreshToken: "mock-refresh-token-placeholder"
    };
  }
  async refresh(token) {
    return {
      accessToken: "mock-access-token-placeholder",
      refreshToken: "mock-refresh-token-placeholder"
    };
  }
};

// server/src/modules/auth/auth.controller.ts
var service4 = new AuthService();
async function login(req, res, next) {
  try {
    const tokens = await service4.login(req.body);
    sendSuccess(res, tokens, "Login successful");
  } catch (err) {
    next(err);
  }
}
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const tokens = await service4.refresh(refreshToken);
    sendSuccess(res, tokens, "Token refreshed");
  } catch (err) {
    next(err);
  }
}

// server/src/routes/auth.routes.ts
var router4 = Router4();
router4.post("/login", login);
router4.post("/refresh", refresh);
var auth_routes_default = router4;

// server/src/routes/index.ts
var router5 = Router5();
router5.get("/health", (req, res) => {
  res.json({ success: true, message: "AI Software Architect API is running", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
router5.get("/health-dashboard", async (req, res) => {
  let dbStatus = "Disconnected";
  let dbLatency = 0;
  let providers = [];
  const startDb = Date.now();
  try {
    await db.select({ id: aiProviders.id }).from(aiProviders).limit(1);
    dbStatus = "Connected";
    dbLatency = Date.now() - startDb;
  } catch (err) {
    dbStatus = "Error";
  }
  try {
    providers = await db.select().from(aiProviders);
  } catch (err) {
    providers = [];
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Software Architect \u2022 Server Monitor</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Outfit', 'sans-serif'] }
        }
      }
    }
  </script>
  <style>
    @keyframes pulse-green {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: .6; }
    }
    .pulse-dot { animation: pulse-green 2s infinite ease-in-out; }
  </style>
</head>
<body class="bg-[#09090b] text-[#fafafa] font-sans antialiased min-h-screen flex items-center justify-center p-4 sm:p-6">
  <div class="w-full max-w-4xl bg-[#121214] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
    <div class="border-b border-[#27272a] px-6 py-5 flex items-center justify-between bg-[#18181b]/50">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-500 font-bold text-lg">AS</div>
        <div>
          <h1 class="text-lg font-semibold tracking-tight">AI Software Architect</h1>
          <p class="text-xs text-zinc-400">Server Health & API Monitoring</p>
        </div>
      </div>
      <div class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
        <span class="h-2 w-2 bg-emerald-500 rounded-full pulse-dot"></span>
        <span class="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Online</span>
      </div>
    </div>

    <div class="p-6 sm:p-8 space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="bg-[#18181b] border border-[#27272a] p-5 rounded-xl">
          <div class="text-xs text-zinc-400 font-medium uppercase tracking-wider">Database Status</div>
          <div class="mt-2 text-2xl font-bold tracking-tight text-white">${dbStatus}</div>
          <div class="mt-1 text-xs text-zinc-500">Neon Serverless \u2022 ${dbLatency}ms latency</div>
        </div>

        <div class="bg-[#18181b] border border-[#27272a] p-5 rounded-xl">
          <div class="text-xs text-zinc-400 font-medium uppercase tracking-wider">Environment</div>
          <div class="mt-2 text-2xl font-bold tracking-tight text-white">${process.env.NODE_ENV || "production"}</div>
          <div class="mt-1 text-xs text-zinc-500">Node.js ${process.version} \u2022 Port ${process.env.PORT || 3e3}</div>
        </div>

        <div class="bg-[#18181b] border border-[#27272a] p-5 rounded-xl sm:col-span-2 lg:col-span-1">
          <div class="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total AI Providers</div>
          <div class="mt-2 text-2xl font-bold tracking-tight text-white">${providers.length} Registered</div>
          <div class="mt-1 text-xs text-zinc-500">Rotation & Fallback ready</div>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold tracking-tight text-white mb-3">Active AI Providers</h3>
        <div class="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden divide-y divide-[#27272a]">
          ${providers.map((p) => `
            <div class="px-5 py-4 flex items-center justify-between">
              <div>
                <span class="font-medium text-white">${p.displayName}</span>
                <span class="ml-2 text-xs bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-400 font-mono">${p.defaultModel}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-xs text-zinc-400">Order: #${p.priority}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.isActive ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border border-zinc-700"}">
                  ${p.isActive ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold tracking-tight text-white mb-3">API Routing Modules Status</h3>
        <div class="grid gap-2 sm:grid-cols-2">
          ${[
    { name: "Core Project Engine", path: "/projects" },
    { name: "AI Workflow Generator", path: "/generate/prd/:projectId" },
    { name: "Interactive Questions", path: "/interview/questions" },
    { name: "Configuration Settings", path: "/admin/settings" },
    { name: "Provider Key Rotation", path: "/admin/rotation" },
    { name: "Credential Authorization", path: "/auth/login" }
  ].map((m) => `
            <div class="flex items-center gap-3 bg-[#18181b] border border-[#27272a]/60 px-4 py-3 rounded-lg">
              <svg class="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div class="text-sm font-medium text-white">${m.name}</div>
                <div class="text-xs text-zinc-500 font-mono">${m.path}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <div class="bg-[#18181b]/30 border-t border-[#27272a] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
      <div>API Prefix: <code class="bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded text-zinc-300 font-mono">/api/v1</code></div>
      <div>\xA9 2026 AI Software Architect \u2022 Systems Operations</div>
    </div>
  </div>
</body>
</html>`;
  res.send(html);
});
router5.use("/", app_routes_default);
router5.use("/generate", generate_routes_default);
router5.use("/admin", admin_routes_default);
router5.use("/auth", auth_routes_default);
var routes_default = router5;

// server/src/app.ts
var app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === "development") return callback(null, true);
    if (corsOrigins.indexOf(origin) !== -1) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"]
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(env.API_PREFIX, routes_default);
app.use(notFoundHandler);
app.use(globalErrorHandler);
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    logger.info(`AI Software Architect API started on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`API available at: ${env.APP_URL}${env.API_PREFIX}`);
  });
}
var app_default = app;
export {
  app_default as default
};
