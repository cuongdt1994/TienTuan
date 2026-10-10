import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

type Row = Record<string, any>;
type Query = { sql: string; values: any[] };

const modelFields: Record<string, string[]> = {
  User: ["id", "email", "passwordHash", "role", "authVersion", "createdAt", "updatedAt"],
  Category: ["id", "name", "slug", "sortOrder", "showOnHome", "createdAt"],
  Project: ["id", "title", "slug", "description", "status", "sortOrder", "previewToken", "coverImageId", "coverPositionX", "coverPositionY", "categoryId", "createdAt", "updatedAt", "publishedAt"],
  Image: ["id", "projectId", "originalUrl", "largeUrl", "mediumUrl", "thumbnailUrl", "width", "height", "alt", "sortOrder", "deletedAt", "createdAt"],
  AuditLog: ["id", "userId", "action", "entityType", "entityId", "metadata", "createdAt"],
  SiteSettings: ["id", "photographerName", "phone", "zalo", "email", "instagram", "facebook", "introEnabled", "introAvatarUrl", "websiteTitle", "websiteDescription", "updatedAt"],
};

function columnList(model: keyof typeof modelFields, alias?: string) {
  return modelFields[model].map((field) => alias ? `${alias}."${field}" AS "${field}"` : `"${field}"`).join(", ");
}

function database(): D1Database {
  try {
    const binding = getCloudflareContext().env.ATELIER_PORTFOLIO_DB as D1Database | undefined;
    if (binding) return binding;
  } catch {
    // The database is only available inside a Cloudflare request context.
  }
  throw new Error("Cloudflare D1 binding ATELIER_PORTFOLIO_DB is unavailable");
}

async function queryAll<T extends Row = Row>(query: Query): Promise<T[]> {
  const result = await database().prepare(query.sql).bind(...query.values).all<T>();
  return result.results ?? [];
}

async function queryFirst<T extends Row = Row>(query: Query): Promise<T | null> {
  return (await database().prepare(query.sql).bind(...query.values).first<T>()) ?? null;
}

async function execute(query: Query) {
  return database().prepare(query.sql).bind(...query.values).run();
}

function value(input: unknown) {
  if (input instanceof Date) return input.toISOString();
  if (input && typeof input === "object") return JSON.stringify(input);
  return input ?? null;
}

function date(valueToConvert: unknown) {
  return valueToConvert == null ? null : new Date(String(valueToConvert));
}

function normalize(model: string, row: Row | null): Row | null {
  if (!row) return null;
  const copy = { ...row };
  for (const key of ["createdAt", "updatedAt", "publishedAt", "deletedAt"]) {
    if (key in copy) copy[key] = date(copy[key]);
  }
  if (model === "Category" && "showOnHome" in copy) copy.showOnHome = Boolean(Number(copy.showOnHome));
  if (model === "SiteSettings" && "introEnabled" in copy) copy.introEnabled = Boolean(Number(copy.introEnabled));
  if (model === "AuditLog" && typeof copy.metadata === "string") {
    try { copy.metadata = JSON.parse(copy.metadata); } catch { /* keep malformed legacy metadata as-is */ }
  }
  return copy;
}

function selectFields(row: Row | null, select?: Row) {
  if (!row || !select) return row;
  return Object.fromEntries(Object.keys(select).filter((key) => select[key]).map((key) => [key, row[key]]));
}

function whereSql(where: Row | undefined, allowed: string[]) {
  const clauses: string[] = [];
  const values: any[] = [];
  for (const key of allowed) {
    if (!(where && key in where)) continue;
    const condition = where[key];
    if (condition && typeof condition === "object" && "not" in condition) {
      clauses.push(`"${key}" ${condition.not === null ? "IS NOT NULL" : "<> ?"}`);
      if (condition.not !== null) values.push(value(condition.not));
    } else if (condition === null) {
      clauses.push(`"${key}" IS NULL`);
    } else {
      clauses.push(`"${key}" = ?`);
      values.push(value(condition));
    }
  }
  return { text: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", values };
}

function orderSql(orderBy: Row | undefined) {
  const [key, direction] = orderBy ? Object.entries(orderBy)[0] ?? [] : [];
  if (!key || !["asc", "desc"].includes(String(direction).toLowerCase())) return "";
  return ` ORDER BY "${key}" ${String(direction).toUpperCase()}`;
}

async function categoryRows(args: Row = {}) {
  const where = args.where ?? {};
  const publishedOnly = where.projects?.some?.status === "PUBLISHED";
  const clauses = publishedOnly ? ` WHERE EXISTS (SELECT 1 FROM "Project" p WHERE p."categoryId" = c."id" AND p."status" = ?)` : "";
  const values = publishedOnly ? ["PUBLISHED"] : [];
  const basic = whereSql(where, ["id", "slug"]);
  const rows = await queryAll({ sql: `SELECT ${columnList("Category", "c")} FROM "Category" c${clauses}${basic.text.replaceAll('"', 'c."')}${orderSql(args.orderBy)}${args.take ? " LIMIT ?" : ""}`, values: [...values, ...basic.values, ...(args.take ? [args.take] : [])] });
  return Promise.all(rows.map(async (row) => {
    const normalized = normalize("Category", row)!;
    if (args.include?._count?.select?.projects) {
      const count = await queryFirst({ sql: `SELECT COUNT(*) AS count FROM "Project" WHERE "categoryId" = ?`, values: [row.id] });
      normalized._count = { projects: Number(count?.count ?? 0) };
    }
    return selectFields(normalized, args.select);
  }));
}

async function projectRelations(row: Row, include: Row | undefined) {
  const project = normalize("Project", row)!;
  if (include?.category) project.category = normalize("Category", await queryFirst({ sql: `SELECT ${columnList("Category")} FROM "Category" WHERE "id" = ?`, values: [row.categoryId] }));
  if (include?.coverImage) project.coverImage = normalize("Image", await queryFirst({ sql: `SELECT ${columnList("Image")} FROM "Image" WHERE "id" = ?`, values: [row.coverImageId] }));
  if (include?.images) {
    const imageWhere = include.images.where ?? {};
    const filters = whereSql({ projectId: row.id, ...imageWhere }, ["projectId", "deletedAt"]);
    const images = await queryAll({ sql: `SELECT ${columnList("Image")} FROM "Image"${filters.text}${orderSql(include.images.orderBy)}${include.images.take ? " LIMIT ?" : ""}`, values: [...filters.values, ...(include.images.take ? [include.images.take] : [])] });
    project.images = images.map((image) => normalize("Image", image));
  }
  if (include?._count?.select?.images) {
    const filter = include._count.select.images.where ?? {};
    const filters = whereSql({ projectId: row.id, ...filter }, ["projectId", "deletedAt"]);
    const count = await queryFirst({ sql: `SELECT COUNT(*) AS count FROM "Image"${filters.text}`, values: filters.values });
    project._count = { images: Number(count?.count ?? 0) };
  }
  return project;
}

async function projectRows(args: Row = {}) {
  const where = args.where ?? {};
  const clauses: string[] = [];
  const values: any[] = [];
  for (const key of ["id", "slug", "status", "previewToken", "categoryId"]) {
    if (key in where) { clauses.push(`p."${key}" = ?`); values.push(value(where[key])); }
  }
  if (where.category?.slug) { clauses.push(`EXISTS (SELECT 1 FROM "Category" c2 WHERE c2."id" = p."categoryId" AND c2."slug" = ?)`); values.push(where.category.slug); }
  const rows = await queryAll({ sql: `SELECT ${columnList("Project", "p")} FROM "Project" p${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}${orderSql(args.orderBy)}${args.take ? " LIMIT ?" : ""}`, values: [...values, ...(args.take ? [args.take] : [])] });
  return Promise.all(rows.map((row) => projectRelations(row, args.include)));
}

function writeData(data: Row, fields: string[]) {
  const entries = fields.filter((field) => field in data).map((field) => [field, data[field]] as const);
  return { columns: entries.map(([key]) => `"${key}"`).join(", "), placeholders: entries.map(() => "?").join(", "), values: entries.map(([, item]) => value(item)) };
}

function modelApi(model: keyof typeof modelFields) {
  const table = `"${model}"`;
  const fields = modelFields[model];
  const findOne = async (args: Row = {}, first = false) => {
    if (model === "Category" && args.where?.slug) return (await categoryRows(args))[0] ?? null;
    if (model === "Project") return (await projectRows({ ...args, take: first ? 1 : args.take }))[0] ?? null;
    const filters = whereSql(args.where, model === "User" ? ["id", "email"] : model === "Image" ? ["id", "projectId", "deletedAt"] : ["id"]);
    const row = await queryFirst({ sql: `SELECT ${columnList(model)} FROM ${table}${filters.text}${first ? " LIMIT 1" : ""}`, values: filters.values });
    return selectFields(normalize(model, row), args.select);
  };
  return {
    findUnique: (args: Row = {}) => findOne(args),
    findFirst: (args: Row = {}) => findOne(args, true),
    findMany: async (args: Row = {}) => {
      if (model === "Category") return categoryRows(args);
      if (model === "Project") return projectRows(args);
      const filters = whereSql(args.where, model === "AuditLog" ? [] : model === "Image" ? ["projectId", "deletedAt"] : ["id"]);
      const rows = await queryAll({ sql: `SELECT ${columnList(model)} FROM ${table}${filters.text}${orderSql(args.orderBy)}${args.take ? " LIMIT ?" : ""}`, values: [...filters.values, ...(args.take ? [args.take] : [])] });
      return rows.map((row) => selectFields(normalize(model, row), args.select));
    },
    count: async (args: Row = {}) => {
      const filters = whereSql(args.where, model === "Project" ? ["status", "categoryId"] : model === "Image" ? ["projectId", "deletedAt"] : []);
      const row = await queryFirst({ sql: `SELECT COUNT(*) AS count FROM ${table}${filters.text}`, values: filters.values });
      return Number(row?.count ?? 0);
    },
    aggregate: async () => {
      const row = await queryFirst({ sql: `SELECT MAX("sortOrder") AS "sortOrder" FROM ${table}`, values: [] });
      return { _max: { sortOrder: row?.sortOrder == null ? null : Number(row.sortOrder) } };
    },
    create: async (args: Row) => {
      const data = { ...args.data };
      const now = new Date();
      if (!data.id) data.id = crypto.randomUUID();
      if (fields.includes("createdAt") && !data.createdAt) data.createdAt = now;
      if (fields.includes("updatedAt") && !data.updatedAt) data.updatedAt = now;
      const insert = writeData(data, fields);
      await execute({ sql: `INSERT INTO ${table} (${insert.columns}) VALUES (${insert.placeholders})`, values: insert.values });
      return (await findOne({ where: { id: data.id }, include: args.include })) as Row;
    },
    update: async (args: Row) => {
      const data = { ...args.data };
      const assignments: string[] = [];
      const values: any[] = [];
      for (const [key, item] of Object.entries(data)) {
        if (item && typeof item === "object" && "increment" in item) { assignments.push(`"${key}" = "${key}" + ?`); values.push(item.increment); }
        else { assignments.push(`"${key}" = ?`); values.push(value(item)); }
      }
      if (fields.includes("updatedAt") && !data.updatedAt && model !== "AuditLog") { assignments.push('"updatedAt" = ?'); values.push(new Date().toISOString()); }
      if (assignments.length) await execute({ sql: `UPDATE ${table} SET ${assignments.join(", ")} WHERE "id" = ?`, values: [...values, args.where.id] });
      return (await findOne({ where: args.where, include: args.include })) as Row;
    },
    updateMany: async (args: Row) => {
      const data = { ...args.data };
      const filters = whereSql(args.where, fields);
      const assignments: string[] = [];
      const values: any[] = [];
      for (const [key, item] of Object.entries(data)) {
        if (item && typeof item === "object" && "increment" in item) { assignments.push(`"${key}" = "${key}" + ?`); values.push(item.increment); }
        else { assignments.push(`"${key}" = ?`); values.push(value(item)); }
      }
      if (assignments.length) await execute({ sql: `UPDATE ${table} SET ${assignments.join(", ")}${model !== "AuditLog" && fields.includes("updatedAt") ? `, "updatedAt" = ?` : ""}${filters.text}`, values: [...values, ...(model !== "AuditLog" && fields.includes("updatedAt") ? [new Date().toISOString()] : []), ...filters.values] });
      return { count: 0 };
    },
    upsert: async (args: Row) => {
      const existing = await findOne({ where: args.where });
      if (existing) return modelApi(model).update({ where: args.where, data: args.update });
      return modelApi(model).create({ data: args.create });
    },
    delete: async (args: Row) => {
      const existing = await findOne({ where: args.where, include: args.include });
      await execute({ sql: `DELETE FROM ${table} WHERE "id" = ?`, values: [args.where.id] });
      return existing;
    },
  };
}

const api: any = {
  user: modelApi("User"),
  category: modelApi("Category"),
  project: modelApi("Project"),
  image: modelApi("Image"),
  auditLog: modelApi("AuditLog"),
  siteSettings: modelApi("SiteSettings"),
  $transaction: async (input: unknown[] | ((transaction: any) => Promise<unknown>)) => typeof input === "function" ? input(api) : Promise.all(input),
};

export async function getDb() {
  database();
  return api;
}

export const db: any = api;
