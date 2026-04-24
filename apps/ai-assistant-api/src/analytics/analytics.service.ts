import { Injectable } from "@nestjs/common";
import Database from "better-sqlite3";
import { join } from "node:path";
import type { AssistantMetrics } from "@yoryi/ai-core";

export type AssistantActionClickEvent = {
  id?: number;
  eventName: string;
  actionKey: string;
  actionLabel: string;
  tenantId: string;
  currentRoute: string;
  currentModule?: string;
  targetPath?: string | null;
  isMapped: boolean;
  sessionId: string;
  messageId: string;
  actionIndex: number;
  totalActions: number;
  timestamp: string;
  createdAt?: string;
};

export type AssistantDebtMetrics = {
  debtQueries: number;
  exactAnswers: number;
  exactAnswerRate: number;
  fallbackDebtAnswers: number;
  fallbackRate: number;
  avgGatewayLatencyMs: number | null;
  answerSourceBreakdown: {
    live_data: number;
    knowledge: number;
    fallback: number;
  };
};

@Injectable()
export class AnalyticsService {
  private db: Database.Database;

  constructor() {
    const dbPath = join(process.cwd(), "data", "analytics.db");
    
    const fs = require("node:fs");
    const path = require("node:path");
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assistant_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventName TEXT NOT NULL,
        actionKey TEXT NOT NULL,
        actionLabel TEXT NOT NULL,
        tenantId TEXT NOT NULL,
        currentRoute TEXT NOT NULL,
        currentModule TEXT,
        targetPath TEXT,
        isMapped INTEGER NOT NULL,
        sessionId TEXT NOT NULL,
        messageId TEXT NOT NULL,
        actionIndex INTEGER NOT NULL,
        totalActions INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assistant_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messageId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        tenantId TEXT NOT NULL,
        role TEXT,
        route TEXT,
        currentModule TEXT,
        rating TEXT NOT NULL,
        comment TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assistant_chat_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        question TEXT NOT NULL,
        appId TEXT NOT NULL,
        tenantId TEXT,
        module TEXT,
        role TEXT,
        actionCount INTEGER NOT NULL,
        hasActions INTEGER NOT NULL,
        llmUsed INTEGER NOT NULL,
        knowledgeFound INTEGER NOT NULL,
        fallback INTEGER NOT NULL,
        answerSource TEXT,
        debtQueryDetected INTEGER,
        debtAnswerExact INTEGER,
        financialGatewayLatencyMs INTEGER,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assistant_query_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auditId TEXT NOT NULL UNIQUE,
        timestamp INTEGER NOT NULL,
        question TEXT NOT NULL,
        appId TEXT NOT NULL,
        tenantId TEXT,
        userId TEXT,
        role TEXT,
        route TEXT,
        module TEXT,
        answerSource TEXT NOT NULL,
        responseType TEXT,
        dataScope TEXT,
        llmUsed INTEGER NOT NULL,
        knowledgeFound INTEGER NOT NULL,
        debtQueryDetected INTEGER,
        debtAnswerExact INTEGER,
        financialGatewayLatencyMs INTEGER,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_tenantId ON assistant_events(tenantId);
      CREATE INDEX IF NOT EXISTS idx_sessionId ON assistant_events(sessionId);
      CREATE INDEX IF NOT EXISTS idx_createdAt ON assistant_events(createdAt);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_events_idempotency
        ON assistant_events(tenantId, sessionId, messageId, actionKey, actionIndex);
      CREATE INDEX IF NOT EXISTS idx_chat_metrics_createdAt ON assistant_chat_metrics(createdAt);
      CREATE INDEX IF NOT EXISTS idx_chat_metrics_tenant ON assistant_chat_metrics(tenantId);
      CREATE INDEX IF NOT EXISTS idx_chat_metrics_debt_query ON assistant_chat_metrics(debtQueryDetected);
      CREATE INDEX IF NOT EXISTS idx_query_audit_createdAt ON assistant_query_audit(createdAt);
      CREATE INDEX IF NOT EXISTS idx_query_audit_tenant ON assistant_query_audit(tenantId);
      CREATE INDEX IF NOT EXISTS idx_query_audit_appId ON assistant_query_audit(appId);
    `);
  }

  trackAssistantActionClick(event: AssistantActionClickEvent): number {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO assistant_events (
        eventName, actionKey, actionLabel, tenantId, currentRoute,
        currentModule, targetPath, isMapped, sessionId, messageId,
        actionIndex, totalActions, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      event.eventName,
      event.actionKey,
      event.actionLabel,
      event.tenantId,
      event.currentRoute,
      event.currentModule ?? null,
      event.targetPath ?? null,
      event.isMapped ? 1 : 0,
      event.sessionId,
      event.messageId,
      event.actionIndex,
      event.totalActions,
      event.timestamp
    );

    if (result.changes > 0) {
      return result.lastInsertRowid as number;
    }

    const existing = this.db
      .prepare(
        `
      SELECT id FROM assistant_events
      WHERE tenantId = ?
        AND sessionId = ?
        AND messageId = ?
        AND actionKey = ?
        AND actionIndex = ?
      LIMIT 1
    `
      )
      .get(
        event.tenantId,
        event.sessionId,
        event.messageId,
        event.actionKey,
        event.actionIndex
      ) as { id?: number } | undefined;

    return existing?.id ?? 0;
  }

  trackAssistantChatMetric(metric: AssistantMetrics): number {
    const stmt = this.db.prepare(`
      INSERT INTO assistant_chat_metrics (
        timestamp,
        question,
        appId,
        tenantId,
        module,
        role,
        actionCount,
        hasActions,
        llmUsed,
        knowledgeFound,
        fallback,
        answerSource,
        debtQueryDetected,
        debtAnswerExact,
        financialGatewayLatencyMs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      metric.timestamp,
      metric.question,
      metric.appId,
      metric.tenantId ?? null,
      metric.module ?? null,
      metric.role ?? null,
      metric.actionCount,
      metric.hasActions ? 1 : 0,
      metric.llmUsed ? 1 : 0,
      metric.knowledgeFound ? 1 : 0,
      metric.fallback ? 1 : 0,
      metric.answerSource ?? null,
      metric.debtQueryDetected === undefined
        ? null
        : metric.debtQueryDetected
          ? 1
          : 0,
      metric.debtAnswerExact === undefined ? null : metric.debtAnswerExact ? 1 : 0,
      metric.financialGatewayLatencyMs ?? null
    );

    this.trackAssistantQueryAudit(metric);

    return result.lastInsertRowid as number;
  }

  private trackAssistantQueryAudit(metric: AssistantMetrics): void {
    const auditId =
      metric.auditId ??
      `audit-${metric.timestamp}-${Math.random().toString(36).slice(2, 10)}`;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO assistant_query_audit (
        auditId,
        timestamp,
        question,
        appId,
        tenantId,
        userId,
        role,
        route,
        module,
        answerSource,
        responseType,
        dataScope,
        llmUsed,
        knowledgeFound,
        debtQueryDetected,
        debtAnswerExact,
        financialGatewayLatencyMs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      auditId,
      metric.timestamp,
      metric.question,
      metric.appId,
      metric.tenantId ?? null,
      metric.userId ?? null,
      metric.role ?? null,
      metric.route ?? null,
      metric.module ?? null,
      metric.answerSource ?? "fallback",
      metric.responseType ?? null,
      metric.dataScope ?? null,
      metric.llmUsed ? 1 : 0,
      metric.knowledgeFound ? 1 : 0,
      metric.debtQueryDetected === undefined
        ? null
        : metric.debtQueryDetected
          ? 1
          : 0,
      metric.debtAnswerExact === undefined ? null : metric.debtAnswerExact ? 1 : 0,
      metric.financialGatewayLatencyMs ?? null
    );
  }

  getDebtMetrics(
    tenantId?: string,
    fromDate?: string,
    toDate?: string
  ): AssistantDebtMetrics {
    let whereClause = `WHERE debtQueryDetected = 1`;
    const params: unknown[] = [];

    if (tenantId) {
      whereClause += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      whereClause += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      whereClause += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }

    const totalsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as debtQueries,
        SUM(CASE WHEN debtAnswerExact = 1 THEN 1 ELSE 0 END) as exactAnswers,
        SUM(CASE WHEN answerSource = 'fallback' THEN 1 ELSE 0 END) as fallbackDebtAnswers,
        AVG(financialGatewayLatencyMs) as avgGatewayLatencyMs,
        SUM(CASE WHEN answerSource = 'live_data' THEN 1 ELSE 0 END) as liveDataCount,
        SUM(CASE WHEN answerSource = 'knowledge' THEN 1 ELSE 0 END) as knowledgeCount,
        SUM(CASE WHEN answerSource = 'fallback' THEN 1 ELSE 0 END) as fallbackCount
      FROM assistant_chat_metrics
      ${whereClause}
    `);

    const row = totalsStmt.get(...params) as
      | {
          debtQueries?: number | null;
          exactAnswers?: number | null;
          fallbackDebtAnswers?: number | null;
          avgGatewayLatencyMs?: number | null;
          liveDataCount?: number | null;
          knowledgeCount?: number | null;
          fallbackCount?: number | null;
        }
      | undefined;

    const debtQueries = row?.debtQueries ?? 0;
    const exactAnswers = row?.exactAnswers ?? 0;
    const fallbackDebtAnswers = row?.fallbackDebtAnswers ?? 0;
    const exactAnswerRate =
      debtQueries > 0 ? Math.round((exactAnswers / debtQueries) * 10000) / 100 : 0;
    const fallbackRate =
      debtQueries > 0
        ? Math.round((fallbackDebtAnswers / debtQueries) * 10000) / 100
        : 0;

    return {
      debtQueries,
      exactAnswers,
      exactAnswerRate,
      fallbackDebtAnswers,
      fallbackRate,
      avgGatewayLatencyMs:
        row?.avgGatewayLatencyMs === null || row?.avgGatewayLatencyMs === undefined
          ? null
          : Math.round(row.avgGatewayLatencyMs * 100) / 100,
      answerSourceBreakdown: {
        live_data: row?.liveDataCount ?? 0,
        knowledge: row?.knowledgeCount ?? 0,
        fallback: row?.fallbackCount ?? 0,
      },
    };
  }

  getEvents(limit = 100): AssistantActionClickEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM assistant_events 
      ORDER BY createdAt DESC 
      LIMIT ?
    `);
    return this.mapRows(stmt.all(limit) as any[]);
  }

  getEventsByTenant(tenantId: string, limit = 100): AssistantActionClickEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM assistant_events 
      WHERE tenantId = ?
      ORDER BY createdAt DESC 
      LIMIT ?
    `);
    return this.mapRows(stmt.all(tenantId, limit) as any[]);
  }

  getEventsBySession(sessionId: string, limit = 100): AssistantActionClickEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM assistant_events 
      WHERE sessionId = ?
      ORDER BY createdAt DESC 
      LIMIT ?
    `);
    return this.mapRows(stmt.all(sessionId, limit) as any[]);
  }

  private mapRows(rows: any[]): AssistantActionClickEvent[] {
    return rows.map((row) => ({
      id: row.id,
      eventName: row.eventName,
      actionKey: row.actionKey,
      actionLabel: row.actionLabel,
      tenantId: row.tenantId,
      currentRoute: row.currentRoute,
      currentModule: row.currentModule,
      targetPath: row.targetPath,
      isMapped: row.isMapped === 1,
      sessionId: row.sessionId,
      messageId: row.messageId,
      actionIndex: row.actionIndex,
      totalActions: row.totalActions,
      timestamp: row.timestamp,
      createdAt: row.createdAt,
    }));
  }

  onModuleDestroy(): void {
    this.db.close();
  }

  getActionMetrics(tenantId?: string, fromDate?: string, toDate?: string, currentModule?: string): { actionKey: string; actionLabel: string; clicks: number }[] {
    let query = `
      SELECT actionKey, actionLabel, COUNT(*) as clicks
      FROM assistant_events
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tenantId) {
      query += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      query += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      query += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }

    query += ` GROUP BY actionKey, actionLabel ORDER BY clicks DESC`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as any[];
  }

  getActionIndexMetrics(tenantId?: string, fromDate?: string, toDate?: string): { position: number; clicks: number; totalActions: number }[] {
    let query = `
      SELECT actionIndex as position, COUNT(*) as clicks, SUM(totalActions) as totalActions
      FROM assistant_events
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tenantId) {
      query += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      query += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      query += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }

    query += ` GROUP BY actionIndex ORDER BY position`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as any[];
  }

  getTenantMetrics(tenantId?: string, fromDate?: string, toDate?: string): { tenantId: string; eventCount: number }[] {
    let query = `
      SELECT tenantId, COUNT(*) as eventCount
      FROM assistant_events
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tenantId) {
      query += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      query += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      query += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }

    query += ` GROUP BY tenantId ORDER BY eventCount DESC`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as any[];
  }

  getDailyMetrics(tenantId?: string, fromDate?: string, toDate?: string): { date: string; eventCount: number }[] {
    let query = `
      SELECT date(createdAt) as date, COUNT(*) as eventCount
      FROM assistant_events
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tenantId) {
      query += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      query += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      query += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }

    query += ` GROUP BY date(createdAt) ORDER BY date DESC LIMIT 30`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as any[];
  }

  getOverallMetrics(tenantId?: string, fromDate?: string, toDate?: string, currentModule?: string): { 
    totalEvents: number;
    uniqueTenants: number;
    uniqueSessions: number;
    avgActionsPerMessage: number;
    mappedClicks: number;
    unmappedClicks: number;
  } {
    let whereClause = `WHERE 1=1`;
    const params: any[] = [];

    if (tenantId) {
      whereClause += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      whereClause += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      whereClause += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }
    if (currentModule) {
      whereClause += ` AND currentModule = ?`;
      params.push(currentModule);
    }

    const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM assistant_events ${whereClause}`);
    const total = (totalStmt.get(...params) as any).count;

    const tenantsStmt = this.db.prepare(`SELECT COUNT(DISTINCT tenantId) as count FROM assistant_events ${whereClause}`);
    const tenants = (tenantsStmt.get(...params) as any).count;

    const sessionsStmt = this.db.prepare(`SELECT COUNT(DISTINCT sessionId) as count FROM assistant_events ${whereClause}`);
    const sessions = (sessionsStmt.get(...params) as any).count;

    const avgStmt = this.db.prepare(`SELECT AVG(totalActions) as avg FROM assistant_events ${whereClause}`);
    const avg = (avgStmt.get(...params) as any).avg || 0;

    const mappedStmt = this.db.prepare(`SELECT COUNT(*) as count FROM assistant_events ${whereClause} AND isMapped = 1`);
    const mapped = (mappedStmt.get(...params) as any).count;

    const unmappedStmt = this.db.prepare(`SELECT COUNT(*) as count FROM assistant_events ${whereClause} AND isMapped = 0`);
    const unmapped = (unmappedStmt.get(...params) as any).count;

    return {
      totalEvents: total,
      uniqueTenants: tenants,
      uniqueSessions: sessions,
      avgActionsPerMessage: Math.round(avg * 100) / 100,
      mappedClicks: mapped,
      unmappedClicks: unmapped,
    };
  }

  getTenantsList(): { tenantId: string; eventCount: number }[] {
    return this.getTenantMetrics();
  }

  exportToCsv(tenantId?: string, fromDate?: string, toDate?: string): string {
    let whereClause = `WHERE 1=1`;
    const params: any[] = [];

    if (tenantId) {
      whereClause += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      whereClause += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      whereClause += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }

    const events = this.db.prepare(`SELECT * FROM assistant_events ${whereClause} ORDER BY createdAt DESC`).all(...params) as AssistantActionClickEvent[];

    const headers = [
      'id',
      'eventName',
      'actionKey',
      'actionLabel',
      'tenantId',
      'currentRoute',
      'currentModule',
      'targetPath',
      'isMapped',
      'sessionId',
      'messageId',
      'actionIndex',
      'totalActions',
      'timestamp',
      'createdAt',
    ];

    const headerRow = headers.join(',');

    const rows = events.map(event => {
      return headers.map(h => {
        const value = (event as any)[h];
        if (value == null) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });

    return [headerRow, ...rows].join('\n');
  }

  exportSummaryToCsv(tenantId?: string, fromDate?: string, toDate?: string): string {
    const rows: string[] = [];

    rows.push('# Overview Metrics');
    rows.push('metric,value');
    const overview = this.getOverallMetrics(tenantId, fromDate, toDate);
    rows.push(`totalEvents,${overview.totalEvents}`);
    rows.push(`uniqueTenants,${overview.uniqueTenants}`);
    rows.push(`uniqueSessions,${overview.uniqueSessions}`);
    rows.push(`avgActionsPerMessage,${overview.avgActionsPerMessage}`);
    rows.push(`mappedClicks,${overview.mappedClicks}`);
    rows.push(`unmappedClicks,${overview.unmappedClicks}`);
    rows.push('');

    rows.push('# Actions by Clicks');
    rows.push('actionKey,actionLabel,clicks');
    const actions = this.getActionMetrics(tenantId, fromDate, toDate);
    actions.forEach(a => rows.push(`${a.actionKey},${a.actionLabel},${a.clicks}`));
    rows.push('');

    rows.push('# Clicks by Position');
    rows.push('position,clicks,totalActions');
    const positions = this.getActionIndexMetrics(tenantId, fromDate, toDate);
    positions.forEach(p => rows.push(`${p.position},${p.clicks},${p.totalActions}`));
    rows.push('');

    rows.push('# Events by Tenant');
    rows.push('tenantId,eventCount');
    const tenants = this.getTenantMetrics(tenantId, fromDate, toDate);
    tenants.forEach(t => rows.push(`${t.tenantId},${t.eventCount}`));
    rows.push('');

    rows.push('# Daily Events');
    rows.push('date,eventCount');
    const daily = this.getDailyMetrics(tenantId, fromDate, toDate);
    daily.forEach(d => rows.push(`${d.date},${d.eventCount}`));

    return rows.join('\n');
  }

  saveFeedback(feedback: {
    messageId: string;
    sessionId: string;
    tenantId: string;
    role?: string | null;
    route?: string | null;
    currentModule?: string | null;
    rating: 'useful' | 'not_useful';
    comment?: string | null;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO assistant_feedback (messageId, sessionId, tenantId, role, route, currentModule, rating, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      feedback.messageId,
      feedback.sessionId,
      feedback.tenantId,
      feedback.role || null,
      feedback.route || null,
      feedback.currentModule || null,
      feedback.rating,
      feedback.comment || null
    );
  }

  getFeedbackMetrics(tenantId?: string, fromDate?: string, toDate?: string, currentModule?: string): {
    totalFeedbacks: number;
    usefulCount: number;
    notUsefulCount: number;
    usefulRate: number;
  } {
    let whereClause = `WHERE 1=1`;
    const params: any[] = [];

    if (tenantId) {
      whereClause += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      whereClause += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      whereClause += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }
    if (currentModule) {
      whereClause += ` AND currentModule = ?`;
      params.push(currentModule);
    }

    const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM assistant_feedback ${whereClause}`);
    const total = (totalStmt.get(...params) as any).count || 0;

    const usefulStmt = this.db.prepare(`SELECT COUNT(*) as count FROM assistant_feedback ${whereClause} AND rating = 'useful'`);
    const useful = (usefulStmt.get(...params) as any).count || 0;

    const notUsefulStmt = this.db.prepare(`SELECT COUNT(*) as count FROM assistant_feedback ${whereClause} AND rating = 'not_useful'`);
    const notUseful = (notUsefulStmt.get(...params) as any).count || 0;

    return {
      totalFeedbacks: total,
      usefulCount: useful,
      notUsefulCount: notUseful,
      usefulRate: total > 0 ? Math.round((useful / total) * 100 * 100) / 100 : 0,
    };
  }

  getRecentComments(tenantId?: string, limit = 10, currentModule?: string): {
    comment: string;
    rating: string;
    tenantId: string;
    currentModule: string | null;
    createdAt: string;
  }[] {
    let whereClause = `WHERE comment IS NOT NULL AND comment != ''`;
    const params: any[] = [];

    if (tenantId) {
      whereClause += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (currentModule) {
      whereClause += ` AND currentModule = ?`;
      params.push(currentModule);
    }

    const stmt = this.db.prepare(`
      SELECT comment, rating, tenantId, currentModule, createdAt
      FROM assistant_feedback ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ?
    `);
    return stmt.all(...params, limit) as any;
  }

  getFeedbackDaily(tenantId?: string, fromDate?: string, toDate?: string, currentModule?: string): {
    date: string;
    usefulCount: number;
    notUsefulCount: number;
  }[] {
    let whereClause = `WHERE 1=1`;
    const params: any[] = [];

    if (tenantId) {
      whereClause += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      whereClause += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      whereClause += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }
    if (currentModule) {
      whereClause += ` AND currentModule = ?`;
      params.push(currentModule);
    }

    const stmt = this.db.prepare(`
      SELECT date(createdAt) as date,
        SUM(CASE WHEN rating = 'useful' THEN 1 ELSE 0 END) as usefulCount,
        SUM(CASE WHEN rating = 'not_useful' THEN 1 ELSE 0 END) as notUsefulCount
      FROM assistant_feedback ${whereClause}
      GROUP BY date(createdAt)
      ORDER BY date ASC
    `);
    return stmt.all(...params) as any;
  }

  getModuleMetrics(tenantId?: string, fromDate?: string, toDate?: string): {
    currentModule: string;
    totalEvents: number;
    usefulCount: number;
    notUsefulCount: number;
    usefulRate: number;
  }[] {
    let whereClause = `WHERE 1=1`;
    const params: any[] = [];

    if (tenantId) {
      whereClause += ` AND tenantId = ?`;
      params.push(tenantId);
    }
    if (fromDate) {
      whereClause += ` AND date(createdAt) >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      whereClause += ` AND date(createdAt) <= ?`;
      params.push(toDate);
    }

    const stmt = this.db.prepare(`
      SELECT 
        COALESCE(currentModule, 'unknown') as currentModule,
        COUNT(*) as totalEvents,
        SUM(CASE WHEN rating = 'useful' THEN 1 ELSE 0 END) as usefulCount,
        SUM(CASE WHEN rating = 'not_useful' THEN 1 ELSE 0 END) as notUsefulCount,
        ROUND(SUM(CASE WHEN rating = 'useful' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as usefulRate
      FROM assistant_feedback ${whereClause}
      GROUP BY currentModule
      ORDER BY totalEvents DESC
    `);
    return stmt.all(...params) as any;
  }
}
