/**
 * Central DB configuration for the PeoplePay360 database module.
 *
 * The database is a local SQLite file, accessed through Node's built-in
 * `node:sqlite` module (no native/compiled dependency, no network, no
 * cloud service required). This keeps the feature/database branch fully
 * offline/local to develop or demo the app, while still giving Avanti
 * (feature/backend) a real, dynamic, queryable, relational data source
 * instead of static JSON fixtures.
 *
 * Override the file location with the PEOPLEPAY_DB_PATH env var if needed
 * (e.g. to point a test run at a throwaway database file).
 */
const path = require("path");

const DB_DIR = path.join(__dirname, "data");
const DB_PATH = process.env.PEOPLEPAY_DB_PATH || path.join(DB_DIR, "peoplepay360.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

module.exports = { DB_DIR, DB_PATH, SCHEMA_PATH };
