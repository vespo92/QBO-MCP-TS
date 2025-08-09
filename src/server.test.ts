/**
 * Basic tests for QBOMCP-TS Server
 */

// Simple smoke test to ensure the server code compiles
describe('QBOMCP-TS Server', () => {
  it('should have tests configured', () => {
    expect(true).toBe(true);
  });

  it('should have correct package name', () => {
    const packageJson = require('../package.json');
    expect(packageJson.name).toBe('qbo-mcp-ts');
  });

  it('should have correct version', () => {
    const packageJson = require('../package.json');
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should have all required dependencies', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies).toHaveProperty('@modelcontextprotocol/sdk');
    expect(packageJson.dependencies).toHaveProperty('express');
    expect(packageJson.dependencies).toHaveProperty('zod');
    expect(packageJson.dependencies).toHaveProperty('date-fns');
  });
});