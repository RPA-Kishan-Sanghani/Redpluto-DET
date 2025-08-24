
-- Clear existing data (optional)
-- DELETE FROM error_table;
-- DELETE FROM audit_table;
-- DELETE FROM source_connection_table;

-- Insert source connections
INSERT INTO source_connection_table (connection_name, connection_type, host, port, username, password, database_name, file_path, api_key, cloud_provider, last_sync, status, created_at, updated_at) VALUES
('Salesforce Production', 'API', 'api.salesforce.com', 443, 'admin@company.com', 'encrypted_password_1', NULL, NULL, 'sf_api_key_12345', NULL, '2024-01-15 10:30:00', 'Active', '2024-01-10 09:00:00', '2024-01-15 10:30:00'),
('MySQL Customer DB', 'Database', 'mysql.company.com', 3306, 'db_user', 'encrypted_password_2', 'customers_db', NULL, NULL, NULL, '2024-01-15 08:45:00', 'Active', '2024-01-05 14:20:00', '2024-01-15 08:45:00'),
('PostgreSQL Analytics', 'Database', 'postgres.company.com', 5432, 'analytics_user', 'encrypted_password_3', 'analytics_db', NULL, NULL, NULL, '2024-01-15 12:15:00', 'Active', '2024-01-08 11:30:00', '2024-01-15 12:15:00'),
('S3 Data Lake', 'Cloud', 's3.amazonaws.com', 443, NULL, NULL, NULL, 's3://company-data-lake/', 'aws_access_key_12345', 'AWS', '2024-01-15 14:20:00', 'Active', '2024-01-12 16:45:00', '2024-01-15 14:20:00'),
('FTP File Server', 'File', 'ftp.company.com', 21, 'ftp_user', 'encrypted_password_4', NULL, '/data/incoming/', NULL, NULL, '2024-01-15 07:30:00', 'Active', '2024-01-03 13:15:00', '2024-01-15 07:30:00'),
('Azure Blob Storage', 'Cloud', 'blob.core.windows.net', 443, NULL, NULL, NULL, 'azure://company-storage/', 'azure_key_67890', 'Azure', '2024-01-15 16:10:00', 'Active', '2024-01-07 10:20:00', '2024-01-15 16:10:00'),
('Oracle Finance DB', 'Database', 'oracle.company.com', 1521, 'finance_user', 'encrypted_password_5', 'finance_db', NULL, NULL, NULL, '2024-01-14 18:45:00', 'Pending', '2024-01-14 17:30:00', '2024-01-14 18:45:00'),
('REST API Gateway', 'API', 'api-gateway.company.com', 443, 'api_user', 'encrypted_password_6', NULL, NULL, 'gateway_key_abc123', NULL, '2024-01-15 11:30:00', 'Active', '2024-01-09 12:45:00', '2024-01-15 11:30:00'),
('MongoDB Logs', 'Database', 'mongo.company.com', 27017, 'mongo_user', 'encrypted_password_7', 'logs_db', NULL, NULL, NULL, '2024-01-15 13:20:00', 'Active', '2024-01-11 15:10:00', '2024-01-15 13:20:00'),
('GCP Cloud Storage', 'Cloud', 'storage.googleapis.com', 443, NULL, NULL, NULL, 'gs://company-bucket/', 'gcp_key_xyz789', 'GCP', '2024-01-15 09:15:00', 'Failed', '2024-01-13 14:25:00', '2024-01-15 09:15:00');

-- Insert audit table records with varying dates over the last 30 days
INSERT INTO audit_table (config_key, code_name, run_id, source_system, schema_name, target_table_name, source_file_name, start_time, end_time, inserted_row_count, updated_row_count, deleted_row_count, no_change_row_count, status, last_pulled_time) VALUES
-- Bronze layer pipelines
(1001, 'bronze_customer_ingestion', 'run_20240115_001', 'Salesforce', 'bronze', 'customers', 'customers_20240115.json', '2024-01-15 08:00:00', '2024-01-15 08:15:00', 15420, 2340, 150, 45230, 'Success', '2024-01-15 08:15:00'),
(1002, 'bronze_order_ingestion', 'run_20240115_002', 'MySQL', 'bronze', 'orders', 'orders_20240115.csv', '2024-01-15 09:00:00', '2024-01-15 09:12:00', 8750, 1200, 50, 23400, 'Success', '2024-01-15 09:12:00'),
(1003, 'bronze_product_ingestion', 'run_20240115_003', 'PostgreSQL', 'bronze', 'products', 'products_20240115.json', '2024-01-15 10:00:00', '2024-01-15 10:08:00', 3200, 450, 25, 12800, 'Success', '2024-01-15 10:08:00'),
(1004, 'bronze_transaction_ingestion', 'run_20240115_004', 'S3', 'bronze', 'transactions', 'transactions_20240115.parquet', '2024-01-15 11:00:00', '2024-01-15 11:25:00', 45600, 5600, 200, 89400, 'Success', '2024-01-15 11:25:00'),
(1005, 'bronze_inventory_ingestion', 'run_20240115_005', 'FTP', 'bronze', 'inventory', 'inventory_20240115.xlsx', '2024-01-15 12:00:00', NULL, 0, 0, 0, 0, 'Running', '2024-01-15 12:00:00'),

-- Silver layer pipelines
(2001, 'silver_customer_transformation', 'run_20240115_006', 'Salesforce', 'silver', 'customer_dim', NULL, '2024-01-15 08:30:00', '2024-01-15 08:42:00', 12800, 3200, 100, 41600, 'Success', '2024-01-15 08:42:00'),
(2002, 'silver_order_transformation', 'run_20240115_007', 'MySQL', 'silver', 'order_fact', NULL, '2024-01-15 09:30:00', '2024-01-15 09:48:00', 7500, 1800, 75, 20100, 'Success', '2024-01-15 09:48:00'),
(2003, 'silver_product_transformation', 'run_20240115_008', 'PostgreSQL', 'silver', 'product_dim', NULL, '2024-01-15 10:30:00', '2024-01-15 10:35:00', 2900, 600, 50, 11450, 'Success', '2024-01-15 10:35:00'),
(2004, 'silver_transaction_aggregation', 'run_20240115_009', 'S3', 'silver', 'transaction_summary', NULL, '2024-01-15 11:45:00', '2024-01-15 12:15:00', 15200, 2400, 150, 68250, 'Success', '2024-01-15 12:15:00'),
(2005, 'silver_inventory_transformation', 'run_20240115_010', 'FTP', 'silver', 'inventory_current', NULL, '2024-01-15 13:00:00', NULL, 0, 0, 0, 0, 'Scheduled', ''),

-- Gold layer pipelines
(3001, 'gold_revenue_analytics', 'run_20240115_011', 'Multiple', 'gold', 'revenue_dashboard', NULL, '2024-01-15 14:00:00', '2024-01-15 14:20:00', 850, 120, 5, 2340, 'Success', '2024-01-15 14:20:00'),
(3002, 'gold_customer_360', 'run_20240115_012', 'Multiple', 'gold', 'customer_360_view', NULL, '2024-01-15 14:30:00', '2024-01-15 14:55:00', 12500, 1800, 50, 35600, 'Success', '2024-01-15 14:55:00'),
(3003, 'gold_inventory_optimization', 'run_20240115_013', 'Multiple', 'gold', 'inventory_analytics', NULL, '2024-01-15 15:00:00', '2024-01-15 15:18:00', 5600, 800, 30, 16200, 'Success', '2024-01-15 15:18:00'),
(3004, 'gold_sales_forecasting', 'run_20240115_014', 'Multiple', 'gold', 'sales_forecast', NULL, '2024-01-15 15:30:00', NULL, 0, 0, 0, 0, 'Failed', ''),

-- Data Quality pipelines
(4001, 'quality_customer_validation', 'run_20240115_015', 'Salesforce', 'quality', 'customer_quality_check', NULL, '2024-01-15 08:20:00', '2024-01-15 08:25:00', 0, 0, 0, 63140, 'Success', '2024-01-15 08:25:00'),
(4002, 'quality_order_validation', 'run_20240115_016', 'MySQL', 'quality', 'order_quality_check', NULL, '2024-01-15 09:20:00', '2024-01-15 09:27:00', 0, 0, 0, 33400, 'Success', '2024-01-15 09:27:00'),
(4003, 'quality_product_validation', 'run_20240115_017', 'PostgreSQL', 'quality', 'product_quality_check', NULL, '2024-01-15 10:20:00', '2024-01-15 10:22:00', 0, 0, 0, 16475, 'Success', '2024-01-15 10:22:00'),
(4004, 'quality_transaction_validation', 'run_20240115_018', 'S3', 'quality', 'transaction_quality_check', NULL, '2024-01-15 11:35:00', NULL, 0, 0, 0, 0, 'Failed', ''),

-- Reconciliation pipelines
(5001, 'reconciliation_daily_summary', 'run_20240115_019', 'Multiple', 'reconciliation', 'daily_reconciliation', NULL, '2024-01-15 16:00:00', '2024-01-15 16:12:00', 45, 15, 2, 128, 'Success', '2024-01-15 16:12:00'),
(5002, 'reconciliation_financial_totals', 'run_20240115_020', 'Multiple', 'reconciliation', 'financial_reconciliation', NULL, '2024-01-15 16:30:00', '2024-01-15 16:38:00', 24, 8, 1, 67, 'Success', '2024-01-15 16:38:00'),

-- Historical data (last 30 days)
(1001, 'bronze_customer_ingestion', 'run_20240114_001', 'Salesforce', 'bronze', 'customers', 'customers_20240114.json', '2024-01-14 08:00:00', '2024-01-14 08:18:00', 14200, 2800, 120, 43200, 'Success', '2024-01-14 08:18:00'),
(1002, 'bronze_order_ingestion', 'run_20240114_002', 'MySQL', 'bronze', 'orders', 'orders_20240114.csv', '2024-01-14 09:00:00', '2024-01-14 09:15:00', 9200, 1100, 45, 22800, 'Success', '2024-01-14 09:15:00'),
(1003, 'bronze_product_ingestion', 'run_20240114_003', 'PostgreSQL', 'bronze', 'products', 'products_20240114.json', '2024-01-14 10:00:00', NULL, 0, 0, 0, 0, 'Failed', ''),
(2001, 'silver_customer_transformation', 'run_20240114_004', 'Salesforce', 'silver', 'customer_dim', NULL, '2024-01-14 08:30:00', '2024-01-14 08:45:00', 11800, 3400, 95, 40500, 'Success', '2024-01-14 08:45:00'),
(3001, 'gold_revenue_analytics', 'run_20240114_005', 'Multiple', 'gold', 'revenue_dashboard', NULL, '2024-01-14 14:00:00', '2024-01-14 14:25:00', 780, 140, 8, 2180, 'Success', '2024-01-14 14:25:00'),

-- More historical data for variety
(1001, 'bronze_customer_ingestion', 'run_20240113_001', 'Salesforce', 'bronze', 'customers', 'customers_20240113.json', '2024-01-13 08:00:00', '2024-01-13 08:12:00', 13800, 2200, 180, 42400, 'Success', '2024-01-13 08:12:00'),
(1002, 'bronze_order_ingestion', 'run_20240113_002', 'MySQL', 'bronze', 'orders', 'orders_20240113.csv', '2024-01-13 09:00:00', '2024-01-13 09:08:00', 8900, 1350, 60, 24200, 'Success', '2024-01-13 09:08:00'),
(4001, 'quality_customer_validation', 'run_20240113_003', 'Salesforce', 'quality', 'customer_quality_check', NULL, '2024-01-13 08:20:00', NULL, 0, 0, 0, 0, 'Failed', ''),
(5001, 'reconciliation_daily_summary', 'run_20240113_004', 'Multiple', 'reconciliation', 'daily_reconciliation', NULL, '2024-01-13 16:00:00', '2024-01-13 16:15:00', 42, 18, 3, 135, 'Success', '2024-01-13 16:15:00'),

-- Weekend data
(1001, 'bronze_customer_ingestion', 'run_20240112_001', 'Salesforce', 'bronze', 'customers', 'customers_20240112.json', '2024-01-12 08:00:00', '2024-01-12 08:20:00', 16200, 1800, 90, 46800, 'Success', '2024-01-12 08:20:00'),
(2001, 'silver_customer_transformation', 'run_20240112_002', 'Salesforce', 'silver', 'customer_dim', NULL, '2024-01-12 08:30:00', '2024-01-12 08:50:00', 14800, 2200, 70, 43200, 'Success', '2024-01-12 08:50:00'),
(3002, 'gold_customer_360', 'run_20240112_003', 'Multiple', 'gold', 'customer_360_view', NULL, '2024-01-12 14:30:00', '2024-01-12 15:10:00', 13200, 1600, 45, 37800, 'Success', '2024-01-12 15:10:00');

-- Insert error records for failed pipelines
INSERT INTO error_table (config_key, audit_key, code_name, run_id, source_system, schema_name, target_table_name, source_file_name, execution_time, error_details) VALUES
(1003, (SELECT audit_key FROM audit_table WHERE run_id = 'run_20240114_003' AND code_name = 'bronze_product_ingestion'), 'bronze_product_ingestion', 'run_20240114_003', 'PostgreSQL', 'bronze', 'products', 'products_20240114.json', '2024-01-14 10:05:00', 'Connection timeout: Unable to connect to PostgreSQL server at postgres.company.com:5432. Server may be unavailable or network issue detected.'),
(3004, (SELECT audit_key FROM audit_table WHERE run_id = 'run_20240115_014' AND code_name = 'gold_sales_forecasting'), 'gold_sales_forecasting', 'run_20240115_014', 'Multiple', 'gold', 'sales_forecast', NULL, '2024-01-15 15:35:00', 'Data validation failed: Missing required columns [forecast_period, confidence_score] in source dataset. Pipeline terminated to prevent data corruption.'),
(4004, (SELECT audit_key FROM audit_table WHERE run_id = 'run_20240115_018' AND code_name = 'quality_transaction_validation'), 'quality_transaction_validation', 'run_20240115_018', 'S3', 'quality', 'transaction_quality_check', NULL, '2024-01-15 11:40:00', 'S3 access denied: Insufficient permissions to read from s3://company-data-lake/transactions/. Check IAM role permissions for data pipeline service.'),
(4001, (SELECT audit_key FROM audit_table WHERE run_id = 'run_20240113_003' AND code_name = 'quality_customer_validation'), 'quality_customer_validation', 'run_20240113_003', 'Salesforce', 'quality', 'customer_quality_check', NULL, '2024-01-13 08:25:00', 'API rate limit exceeded: Salesforce API returned 429 status code. Daily API call limit reached. Consider upgrading API package or implementing retry logic with exponential backoff.');
