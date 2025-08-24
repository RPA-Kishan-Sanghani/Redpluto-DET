# Overview

This is a full-stack data operations dashboard application built for monitoring and managing data pipelines. The application provides a comprehensive view of pipeline metrics, DAG (Directed Acyclic Graph) status, and error tracking across different data layers (Bronze, Silver, Gold). It's designed to give data engineers and operations teams real-time visibility into their data pipeline health and performance.

The dashboard features metric cards showing pipeline run statistics, categorized DAG summaries by data layer, and a detailed table view with filtering and sorting capabilities for pipeline management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for the user interface
- **Tailwind CSS** for styling with a custom design system using CSS variables
- **shadcn/ui** component library built on Radix UI primitives for consistent, accessible components
- **TanStack Query** for server state management, caching, and data fetching
- **Wouter** for lightweight client-side routing
- **Vite** as the build tool and development server with hot module replacement

## Backend Architecture
- **Node.js** with **Express.js** providing a RESTful API
- **TypeScript** throughout the entire stack for type safety
- Custom middleware for request logging and error handling
- Modular route structure with separation of concerns between routes and storage layers

## Data Storage Solutions
- **PostgreSQL** as the primary database
- **Drizzle ORM** for type-safe database operations and schema management
- **Neon Database** serverless PostgreSQL for cloud deployment
- Three main tables:
  - `users` - User authentication and management
  - `audit_table` - Pipeline execution tracking and metrics
  - `error_table` - Error logging and failure analysis

## Database Schema Design
The audit table tracks comprehensive pipeline execution data including:
- Pipeline identification (code name, run ID, source system)
- Execution timing (start/end times)
- Data processing metrics (inserted, updated, deleted row counts)
- Status tracking and layer categorization

The error table maintains detailed failure logs linked to audit records for debugging and monitoring.

## API Structure
RESTful endpoints organized around dashboard functionality:
- `/api/dashboard/metrics` - Aggregate pipeline statistics
- `/api/dashboard/dag-summary` - Category-wise pipeline summaries
- `/api/dashboard/dags` - Detailed pipeline listings with filtering, sorting, and pagination

All endpoints support date range filtering and return JSON responses with proper error handling.

## Component Architecture
- Modular component structure with reusable UI components
- Custom hooks for data fetching and state management
- Responsive design with mobile-first approach
- Component composition pattern using Radix UI primitives

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless** - Serverless PostgreSQL database connectivity
- **drizzle-orm** and **drizzle-zod** - Type-safe ORM with schema validation
- **@tanstack/react-query** - Server state management and data fetching
- **wouter** - Lightweight React routing

## UI and Styling Dependencies
- **@radix-ui/** components - Accessible UI primitives (accordion, dialog, dropdown-menu, etc.)
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** and **clsx** - Dynamic className utilities
- **lucide-react** - Icon library

## Development and Build Tools
- **vite** - Build tool and development server
- **typescript** - Type checking and compilation
- **esbuild** - Fast JavaScript bundler for production builds
- **@replit/vite-plugin-runtime-error-modal** - Development error handling

## Database and Session Management
- **connect-pg-simple** - PostgreSQL session store for Express
- **ws** - WebSocket implementation for database connections

## Utility Libraries
- **date-fns** - Date manipulation and formatting
- **nanoid** - Unique ID generation
- **@hookform/resolvers** - Form validation resolvers