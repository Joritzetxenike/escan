require('dotenv').config();

module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/web-admin/'],
};
