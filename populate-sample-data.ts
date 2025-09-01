
import { db } from './server/db';
import { auditTable, errorTable } from './shared/schema';

async function populateSampleData() {
  try {
    console.log('Populating sample audit data...');
    
    // Insert sample audit data
    await db.insert(auditTable).values([
      {
        pipelineId: 1001,
        codeName: 'customer_bronze_load',
        runId: 'run_20240115_001',
        sourceSystem: 'Salesforce',
        executionLayer: 'bronze',
        targetTable: 'customer_bronze',
        startTime: new Date('2024-01-15T08:00:00'),
        endTime: new Date('2024-01-15T08:15:00'),
        insertedRows: 15420,
        updatedRows: 2340,
        deletedRows: 150,
        processedRows: 17910,
        status: 'Success'
      },
      {
        pipelineId: 1002,
        codeName: 'order_bronze_load',
        runId: 'run_20240115_002',
        sourceSystem: 'MySQL',
        executionLayer: 'bronze',
        targetTable: 'order_bronze',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T09:12:00'),
        insertedRows: 8750,
        updatedRows: 1200,
        deletedRows: 45,
        processedRows: 9995,
        status: 'Success'
      },
      {
        pipelineId: 2001,
        codeName: 'customer_silver_transform',
        runId: 'run_20240115_003',
        sourceSystem: 'Bronze Layer',
        executionLayer: 'silver',
        targetTable: 'customer_silver',
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T10:08:00'),
        insertedRows: 14250,
        updatedRows: 1890,
        deletedRows: 120,
        processedRows: 16260,
        status: 'Success'
      },
      {
        pipelineId: 3001,
        codeName: 'customer_gold_aggregate',
        runId: 'run_20240115_004',
        sourceSystem: 'Silver Layer',
        executionLayer: 'gold',
        targetTable: 'customer_gold',
        startTime: new Date('2024-01-15T11:00:00'),
        endTime: new Date('2024-01-15T11:05:00'),
        insertedRows: 8950,
        updatedRows: 750,
        deletedRows: 25,
        processedRows: 9725,
        status: 'Success'
      },
      {
        pipelineId: 1003,
        codeName: 'product_bronze_load',
        runId: 'run_20240115_005',
        sourceSystem: 'PostgreSQL',
        executionLayer: 'bronze',
        targetTable: 'product_bronze',
        startTime: new Date('2024-01-15T12:00:00'),
        endTime: null,
        insertedRows: 0,
        updatedRows: 0,
        deletedRows: 0,
        processedRows: 0,
        status: 'Failed'
      },
      {
        pipelineId: 4001,
        codeName: 'quality_customer_validation',
        runId: 'run_20240115_006',
        sourceSystem: 'Salesforce',
        executionLayer: 'quality',
        targetTable: 'customer_quality_check',
        startTime: new Date('2024-01-15T13:00:00'),
        endTime: new Date('2024-01-15T13:05:00'),
        insertedRows: 0,
        updatedRows: 0,
        deletedRows: 0,
        processedRows: 63140,
        status: 'Success'
      },
      {
        pipelineId: 5001,
        codeName: 'reconciliation_daily_summary',
        runId: 'run_20240115_007',
        sourceSystem: 'Multiple',
        executionLayer: 'reconciliation',
        targetTable: 'daily_reconciliation',
        startTime: new Date('2024-01-15T14:00:00'),
        endTime: new Date('2024-01-15T14:12:00'),
        insertedRows: 45,
        updatedRows: 15,
        deletedRows: 2,
        processedRows: 128,
        status: 'Success'
      }
    ]);

    // Insert sample error data
    await db.insert(errorTable).values([
      {
        errorId: 1,
        pipelineId: 1003,
        runId: 'run_20240115_005',
        errorMessage: 'Connection timeout to PostgreSQL database',
        errorCode: 'DB_TIMEOUT',
        severity: 'High',
        errorTimestamp: new Date('2024-01-15T12:05:00')
      }
    ]);

    console.log('Sample data populated successfully!');
  } catch (error) {
    console.error('Error populating sample data:', error);
  }
}

populateSampleData();
