# TODO: Admin Portal Implementation

## Database Setup
- [x] 1. Analyze current authentication system
- [x] 2. Add role column to users table in database (added in server.js ensureSchema)
- [x] 3. Admin user can be created via database or by existing admin

## Backend Updates (server.js)
- [x] 4. Update JWT to include role in token payload
- [x] 5. Add admin middleware function
- [x] 6. Add admin API endpoints:
  - [x] GET /api/admin/users - List all users
  - [x] PUT /api/admin/users/:id/role - Change user role
  - [x] DELETE /api/admin/users/:id - Delete user
  - [x] GET /api/admin/devices - List all devices
  - [x] DELETE /api/admin/devices/:id - Delete any device
  - [x] GET /api/admin/alerts - Get all alerts
  - [x] GET /api/admin/stats - Get dashboard stats

## Frontend Updates
- [x] 7. Create AdminPanel.jsx component
- [x] 8. Update App.jsx to:
  - [x] Store user role from JWT
  - [x] Add admin navigation button
  - [x] Show admin panel when clicked
- [x] 9. Add CSS styling for admin panel

## Testing
- [ ] 10. Test admin login
- [ ] 11. Test admin features
- [ ] 12. Run add_admin_role.sql or restart server to add role column

