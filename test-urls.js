// Quick test to verify URL configuration
process.env.NODE_ENV = 'development';

const constants = require('./dist/constants/constants.js');

console.log('=== URL Configuration Test ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('IS_PRODUCTION:', constants.IS_PRODUCTION);
console.log('WEB_APP_URL:', constants.WEB_APP_URL);
console.log('API_BASE_URL:', constants.API_BASE_URL);
console.log('=== End Test ===');
