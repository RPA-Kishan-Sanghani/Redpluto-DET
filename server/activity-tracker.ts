import { storage } from "./storage";
import type { Request } from "express";
import type { AuthRequest } from "./auth";

// Activity categories for better organization
export enum ActivityCategory {
  AUTH = 'auth',
  NAVIGATION = 'navigation',
  DATA = 'data',
  CONFIG = 'config',
  FILTER = 'filter',
}

// Activity types for comprehensive tracking
export enum ActivityType {
  // Authentication
  SIGN_IN = 'sign_in',
  SIGN_OUT = 'sign_out',
  
  // Navigation
  PAGE_VIEW = 'page_view',
  DASHBOARD_VIEWED = 'dashboard_viewed',
  CONNECTION_VIEWED = 'connection_viewed',
  PIPELINE_VIEWED = 'pipeline_viewed',
  DATA_QUALITY_VIEWED = 'data_quality_viewed',
  DATA_DICTIONARY_VIEWED = 'data_dictionary_viewed',
  RECONCILIATION_VIEWED = 'reconciliation_viewed',
  SETTINGS_VIEWED = 'settings_viewed',
  
  // Data operations
  CONNECTION_CREATED = 'connection_created',
  CONNECTION_UPDATED = 'connection_updated',
  CONNECTION_DELETED = 'connection_deleted',
  CONNECTION_TESTED = 'connection_tested',
  
  // Pipeline operations
  PIPELINE_CREATED = 'pipeline_created',
  PIPELINE_UPDATED = 'pipeline_updated',
  PIPELINE_DELETED = 'pipeline_deleted',
  
  // Data Dictionary operations
  DATA_DICTIONARY_CREATED = 'data_dictionary_created',
  DATA_DICTIONARY_UPDATED = 'data_dictionary_updated',
  DATA_DICTIONARY_DELETED = 'data_dictionary_deleted',
  
  // Data Quality operations
  DATA_QUALITY_CREATED = 'data_quality_created',
  DATA_QUALITY_UPDATED = 'data_quality_updated',
  DATA_QUALITY_DELETED = 'data_quality_deleted',
  
  // Reconciliation operations
  RECONCILIATION_CREATED = 'reconciliation_created',
  RECONCILIATION_UPDATED = 'reconciliation_updated',
  RECONCILIATION_DELETED = 'reconciliation_deleted',
  
  // Config operations
  CONFIG_UPDATED = 'config_updated',
  SETTINGS_UPDATED = 'settings_updated',
  DB_SETTINGS_UPDATED = 'db_settings_updated',
  DB_SETTINGS_TESTED = 'db_settings_tested',
  
  // Filter operations
  FILTER_APPLIED = 'filter_applied',
  FILTER_CLEARED = 'filter_cleared',
  SEARCH_PERFORMED = 'search_performed',
  SORT_APPLIED = 'sort_applied',
}

interface ActivityDetails {
  activityType: ActivityType;
  activityCategory: ActivityCategory;
  resourceType?: string;
  resourceId?: string;
  actionDetails?: Record<string, any>;
  pagePath?: string;
}

/**
 * Track user activity
 */
export async function trackActivity(
  req: AuthRequest,
  details: ActivityDetails
): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      // Skip tracking if no user is authenticated
      return;
    }

    await storage.logUserActivity({
      userId,
      activityType: details.activityType,
      activityCategory: details.activityCategory,
      resourceType: details.resourceType || null,
      resourceId: details.resourceId || null,
      actionDetails: details.actionDetails ? JSON.stringify(details.actionDetails) : null,
      pagePath: details.pagePath || req.originalUrl || null,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to track activity:', error);
  }
}

/**
 * Track page navigation/view
 */
export async function trackPageView(
  req: AuthRequest,
  pageName: string,
  pageCategory?: string
): Promise<void> {
  await trackActivity(req, {
    activityType: ActivityType.PAGE_VIEW,
    activityCategory: ActivityCategory.NAVIGATION,
    resourceType: 'page',
    resourceId: pageName,
    pagePath: req.originalUrl,
    actionDetails: { pageName, pageCategory },
  });
}

/**
 * Track filter application
 */
export async function trackFilterActivity(
  req: AuthRequest,
  filters: Record<string, any>
): Promise<void> {
  await trackActivity(req, {
    activityType: ActivityType.FILTER_APPLIED,
    activityCategory: ActivityCategory.FILTER,
    resourceType: 'filter',
    actionDetails: { filters },
  });
}

/**
 * Track resource creation/update/deletion
 */
export async function trackResourceActivity(
  req: AuthRequest,
  action: 'created' | 'updated' | 'deleted' | 'tested',
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<void> {
  const activityTypeMap = {
    connection: {
      created: ActivityType.CONNECTION_CREATED,
      updated: ActivityType.CONNECTION_UPDATED,
      deleted: ActivityType.CONNECTION_DELETED,
      tested: ActivityType.CONNECTION_TESTED,
    },
    pipeline: {
      created: ActivityType.PIPELINE_CREATED,
      updated: ActivityType.PIPELINE_UPDATED,
      deleted: ActivityType.PIPELINE_DELETED,
      tested: ActivityType.CONFIG_UPDATED,
    },
    'data-dictionary': {
      created: ActivityType.DATA_DICTIONARY_CREATED,
      updated: ActivityType.DATA_DICTIONARY_UPDATED,
      deleted: ActivityType.DATA_DICTIONARY_DELETED,
      tested: ActivityType.CONFIG_UPDATED,
    },
    'data-quality': {
      created: ActivityType.DATA_QUALITY_CREATED,
      updated: ActivityType.DATA_QUALITY_UPDATED,
      deleted: ActivityType.DATA_QUALITY_DELETED,
      tested: ActivityType.CONFIG_UPDATED,
    },
    reconciliation: {
      created: ActivityType.RECONCILIATION_CREATED,
      updated: ActivityType.RECONCILIATION_UPDATED,
      deleted: ActivityType.RECONCILIATION_DELETED,
      tested: ActivityType.CONFIG_UPDATED,
    },
    config: {
      created: ActivityType.CONFIG_UPDATED,
      updated: ActivityType.CONFIG_UPDATED,
      deleted: ActivityType.CONFIG_UPDATED,
      tested: ActivityType.CONFIG_UPDATED,
    },
    settings: {
      created: ActivityType.SETTINGS_UPDATED,
      updated: ActivityType.SETTINGS_UPDATED,
      deleted: ActivityType.SETTINGS_UPDATED,
      tested: ActivityType.DB_SETTINGS_TESTED,
    },
  };

  const activityType = activityTypeMap[resourceType as keyof typeof activityTypeMap]?.[action] || ActivityType.CONFIG_UPDATED;

  // Determine correct category based on resource type
  let category = ActivityCategory.CONFIG;
  if (['connection', 'pipeline', 'data-dictionary', 'data-quality', 'reconciliation'].includes(resourceType)) {
    category = ActivityCategory.DATA;
  }

  await trackActivity(req, {
    activityType,
    activityCategory: category,
    resourceType,
    resourceId,
    actionDetails: { action, ...details },
  });
}
